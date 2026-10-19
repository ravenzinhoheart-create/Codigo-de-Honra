import { listRecords,getRecord,insertRecord,updateRecord,deleteRecord } from './app-records.js';
import { createActivityPost,updateActivityPost,getActivityPostBy } from './posts.js';
import { events as eventBus } from '../core/events.js';
import { sendPushToAudience } from './notifications.js';
const TYPE='events';
function dateOf(e){return new Date(e?.startAt||e?.dateTime||e?.date||0);}

async function syncEventActivityPost(event,user=null){
    if(!event?.id) return null;

    const ownerId=event.creatorId||user?.id||null;
    const activityUser=user||{
        id:ownerId,
        username:event.creatorUsername||'Membro',
        avatar:event.creatorAvatar||null,
        status:'on'
    };

    if(!activityUser?.id) return null;

    const metadata={
        eventId:event.id,
        startAt:event.startAt||event.dateTime||null,
        startedAt:event.startedAt||event.startAt||event.dateTime||null,
        endedAt:event.endedAt||null,
        status:event.status||'planning',
        location:event.location||null,
        locationDetails:event.locationDetails||null,
        confirmedMembers:Array.isArray(event.confirmedMembers)
            ? event.confirmedMembers
            : []
    };

    const existing=await getActivityPostBy('eventId',event.id);

    if(!existing){
        return createActivityPost({
            user:activityUser,
            type:'event',
            title:event.title||'Evento',
            description:event.description||'',
            metadata,
            createdAt:event.startAt||event.dateTime||event.createdAt||null
        });
    }

    return updateActivityPost(
        existing.id,
        metadata,
        {
            caption:String(event.description||event.title||'').trim()
        }
    );
}
async function syncLifecycle(list){const now=Date.now();for(const e of list){const start=dateOf(e).getTime();if(!Number.isFinite(start)||start>now||e.status==='cancelled')continue;if(!['finished','in_progress'].includes(e.status)){const updated=await updateRecord(TYPE,e.id,{status:'in_progress',startedAt:e.startedAt||new Date(start).toISOString()},{ownerId:e.creatorId});Object.assign(e,updated);await syncEventActivityPost(e,{id:e.creatorId,username:e.creatorUsername||'Membro',avatar:e.creatorAvatar||null,status:'on'});eventBus.emit('event:updated',e);}}return list;}
export async function getActiveEventForUser(userId){const list=await getEvents();return list.filter(e=>e.status==='in_progress'&&(e.confirmedMembers||[]).some(m=>String(m.id||m.userId)===String(userId))).sort((a,b)=>dateOf(a)-dateOf(b))[0]||null;}
export async function getEvents(){const list=await listRecords(TYPE);return syncLifecycle(list).then(a=>a.sort((x,y)=>dateOf(x)-dateOf(y)));}
export async function getUpcomingEvents(){const now=Date.now();return (await getEvents()).filter(e=>dateOf(e).getTime()>=now);}
export async function getEvent(id){return getRecord(TYPE,id);}
export async function createEvent(data,user=null){const title=String(data?.title||'').trim();if(!title)throw new Error('Nome do evento obrigatório.');const dateTime=data.dateTime||data.startAt;if(!dateTime||Number.isNaN(new Date(dateTime).getTime()))throw new Error('Data e horário do evento são obrigatórios.');const created=await insertRecord(TYPE,user?.id||null,{title,dateTime,startAt:dateTime,location:String(data.location||'').trim(),locationDetails:data.locationDetails||null,description:String(data.description||'').trim(),status:data.status||'planning',creatorId:user?.id||null,creatorUsername:user?.username||null,creatorAvatar:user?.avatar||null,confirmedMembers:[],createdAt:new Date().toISOString()});await syncEventActivityPost(created,user);void sendPushToAudience('approved',{type:'event',title:'Novo evento do clube',body:`${user?.username||user?.nickname||'Um membro'} criou o evento ${title}.`,data:{route:'event-detail',eventId:created.id,kind:'created'}});return created;}
export async function confirmAttendance(id,user,vehicle=null){const e=await getRecord(TYPE,id);if(!e)throw new Error('Evento não encontrado.');const members=[...(e.confirmedMembers||[])];const snap={id:user.id,username:user.username||'Membro',avatar:user.avatar||null,status:user.status||'on',vehicle:vehicle||user.currentVehicle||{type:'on_foot',id:'on_foot',name:'A pé'}};const i=members.findIndex(m=>String(m.id||m.userId)===String(user.id));if(i>=0)members[i]=snap;else members.push(snap);const updated=await updateRecord(TYPE,id,{confirmedMembers:members,updatedAt:new Date().toISOString()},{ownerId:e.creatorId});await syncEventActivityPost(updated,user);return updated;}
export async function cancelAttendance(id,userId){const e=await getRecord(TYPE,id);if(!e)throw new Error('Evento não encontrado.');const updated=await updateRecord(TYPE,id,{confirmedMembers:(e.confirmedMembers||[]).filter(m=>String(m.id||m.userId)!==String(userId)),updatedAt:new Date().toISOString()},{ownerId:e.creatorId});await syncEventActivityPost(updated,{id:e.creatorId,username:updated.creatorUsername||e.creatorUsername||'Membro',avatar:updated.creatorAvatar||e.creatorAvatar||null,status:'on'});return updated;}
export async function updateEvent(id,patch={},userId=null){const e=await getRecord(TYPE,id);if(!e)throw new Error('Evento não encontrado.');if(userId&&e.creatorId!==userId)throw new Error('Somente o criador pode editar este evento.');const updated=await updateRecord(TYPE,id,{...patch,updatedAt:new Date().toISOString()},{ownerId:e.creatorId}); await syncEventActivityPost(updated,{id:e.creatorId,username:updated.creatorUsername||e.creatorUsername||'Membro',avatar:updated.creatorAvatar||e.creatorAvatar||null,status:'on'});void sendPushToAudience('approved',{type:'event',title:'Evento atualizado',body:`O evento ${updated.title||e.title||'do clube'} foi atualizado.`,data:{route:'event-detail',eventId:id,kind:'updated'}});return updated;}
export async function finishEvent(id,userId=null){const e=await getRecord(TYPE,id);if(!e)throw new Error('Evento não encontrado.');if(userId&&e.creatorId!==userId)throw new Error('Somente o criador pode encerrar este evento.');const updated=await updateRecord(TYPE,id,{status:'finished',endedAt:new Date().toISOString()},{ownerId:e.creatorId}); await syncEventActivityPost(updated,{id:e.creatorId,username:updated.creatorUsername||e.creatorUsername||'Membro',avatar:updated.creatorAvatar||e.creatorAvatar||null,status:'on'});eventBus.emit('event:updated',updated);void sendPushToAudience('approved',{type:'event',title:'Evento encerrado',body:`O evento ${updated.title||e.title||'do clube'} foi encerrado.`,data:{route:'event-detail',eventId:id,kind:'finished'}});return updated;}
export async function deleteEvent(id,userId=null){const e=await getRecord(TYPE,id);if(!e)throw new Error('Evento não encontrado.');if(userId&&e.creatorId!==userId)throw new Error('Somente o criador pode excluir este evento.');const result=await deleteRecord(TYPE,id,e.creatorId);void sendPushToAudience('approved',{type:'event',title:'Evento removido',body:`O evento ${e.title||'do clube'} foi removido.`,data:{route:'events',eventId:id,kind:'deleted'}});return result;}




