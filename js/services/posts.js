import { events as eventBus } from '../core/events.js';
import { listRecords, getRecord, insertRecord, updateRecord, deleteRecord } from './app-records.js';
import { getCurrentVehicle } from './vehicles.js';
import { getCurrentActivityContext, getActivityContextAt } from './activity-context.js';
import { hydrateMediaItems } from './media.js';

const TYPE = 'posts';

function normalizeComment(comment = {}) {
  const existing = comment.author || comment.user || {};
  const username = existing.username || comment.username || comment.nickname || 'Membro';
  const avatar = existing.avatar || comment.avatar || comment.avatarUrl || null;
  return {
    ...comment,
    username,
    avatar,
    author: {
      ...existing,
      id: existing.id || comment.userId || comment.authorId || null,
      username,
      avatar,
      status: existing.status || comment.status || 'off'
    }
  };
}

async function hydratePost(record) {
  if (!record) return record;
  const media = await hydrateMediaItems(Array.isArray(record.media) ? record.media : []);
  return {
    ...record,
    media,
    comments: Array.isArray(record.comments) ? record.comments.map(normalizeComment) : []
  };
}

export async function getPosts() {
  const records = await listRecords(TYPE);
  return Promise.all(records.map(hydratePost));
}
export async function getPost(id) {
  return hydratePost(await getRecord(TYPE, id));
}

export async function createActivityPost({ user, type, title, description = '', metadata = {}, vehicleSnapshot = null, createdAt = null } = {}) {
  if (!user?.id) throw new Error('Usuário não autenticado.');
  const post = { author:{id:user.id,username:user.username||'Membro',avatar:user.avatar||null,status:user.status||'on'}, caption:String(description||title||'').trim(), media:[], vehicleSnapshot:vehicleSnapshot||await getCurrentVehicle().catch(()=>user.currentVehicle||{type:'on_foot'}), likes:0, likedBy:[], comments:[], createdAt:createdAt||new Date().toISOString(), activity:{type:String(type||'activity'),title:String(title||'Atividade do clube'),description:String(description||''),...metadata} };
  const saved = await insertRecord(TYPE,user.id,post); eventBus.emit('post:created',saved); return saved;
}
export async function getActivityPostBy(entityKey, entityId) { const all=await listRecords(TYPE); return all.find(p=>String(p.activity?.[entityKey]||'')===String(entityId))||null; }
export async function updateActivityPost(id, activityPatch={}, postPatch={}, options={}) { const current=await getRecord(TYPE,id); if(!current) throw new Error('Publicação de atividade não encontrada.'); const saved=await updateRecord(TYPE,id,{...postPatch,activity:{...(current.activity||{}),...activityPatch,updatedAt:new Date().toISOString()},updatedAt:new Date().toISOString()},{ownerId:current.author?.id||current.ownerId}); if(options.emit!==false) eventBus.emit('post:updated',saved); return saved; }
export async function updateActivityPostBy(key,id,activityPatch={},postPatch={}) { const p=await getActivityPostBy(key,id); return p?updateActivityPost(p.id,activityPatch,postPatch):null; }
export async function createPost(post,user) {
  if(!user?.id) throw new Error('Usuário não autenticado.');
  const vehicle=post.vehicleSnapshot||await getCurrentVehicle().catch(()=>user.currentVehicle||{type:'on_foot'});
  const createdAt=new Date().toISOString();
   const activityContext=await getActivityContextAt(createdAt,user.id);
   const id=globalThis.crypto?.randomUUID?.() || `post-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const optimistic={
    id, ownerId:user.id,
    author:{id:user.id,username:user.username,avatar:user.avatar||null,status:user.status||'off'},
    caption:post.caption||'',
    media:Array.isArray(post.media)?post.media.slice(0,10):[],
    vehicleSnapshot:vehicle, rideContext:post.rideContext||null, eventContext:post.eventContext||null, activityContext:{rideId:activityContext.ride?.id||null,sosId:activityContext.sos?.id||null,eventId:activityContext.event?.id||null,at:createdAt},
    likes:0, likedBy:[], comments:[], createdAt:new Date().toISOString(), pending:true
  };
  // A UI recebe o post imediatamente; a persistência acontece em segundo plano.
  eventBus.emit('post:created',optimistic);
  void insertRecord(TYPE,user.id,{...optimistic,id,ownerId:undefined,createdAt:undefined,pending:undefined})
    .then(saved=>eventBus.emit('post:persisted',saved))
    .catch(error=>{
      console.error('[POST] Falha ao persistir publicação:',error);
      eventBus.emit('post:failed',{id,error});
    });
  return optimistic;
}
export async function toggleLike(id,userId) { const p=await getRecord(TYPE,id); if(!p) throw new Error('Publicação não encontrada.'); const likedBy=Array.isArray(p.likedBy)?[...p.likedBy]:[]; const i=likedBy.indexOf(userId); if(i<0)likedBy.push(userId);else likedBy.splice(i,1); const saved=await updateRecord(TYPE,id,{likedBy,likes:likedBy.length},{ownerId:p.author?.id||p.ownerId}); return {liked:i<0,likes:saved.likes}; }
export async function addComment(id,user,text) { const p=await getRecord(TYPE,id); if(!p) throw new Error('Publicação não encontrada.'); const comments=Array.isArray(p.comments)?[...p.comments]:[]; const username=user.username||user.nickname||user.displayName||user.name||'Membro';const avatar=user.avatar||user.avatarUrl||user.photoURL||user.photoUrl||null;const comment={id:globalThis.crypto?.randomUUID?.()||`comment-${Date.now()}-${Math.random().toString(36).slice(2)}`,userId:user.id,username,avatar,author:{id:user.id,username,avatar,status:user.status||'off'},text:String(text||'').trim(),createdAt:new Date().toISOString()}; if(!comment.text)throw new Error('Comentário vazio.'); comments.push(comment); await updateRecord(TYPE,id,{comments},{ownerId:p.author?.id||p.ownerId}); return comment; }
export async function updateComment(id,commentId,text,userId){const p=await getRecord(TYPE,id);if(!p)throw new Error('Publicação não encontrada.');const comments=(p.comments||[]).map(c=>c.id===commentId&&c.userId===userId?{...c,text:String(text||'').trim(),updatedAt:new Date().toISOString()}:c);await updateRecord(TYPE,id,{comments},{ownerId:p.author?.id||p.ownerId});return comments.find(c=>c.id===commentId)||null;}
export async function deleteComment(id,commentId,userId){const p=await getRecord(TYPE,id);if(!p)throw new Error('Publicação não encontrada.');await updateRecord(TYPE,id,{comments:(p.comments||[]).filter(c=>!(c.id===commentId&&c.userId===userId))},{ownerId:p.author?.id||p.ownerId});return true;}
export async function updatePost(id,patch={},userId){const p=await getRecord(TYPE,id);if(!p)throw new Error('Publicação não encontrada.');if((p.author?.id||p.ownerId)!==userId)throw new Error('Somente o autor pode editar.');return updateRecord(TYPE,id,patch,{ownerId:userId});}
export async function deletePost(id,userId){return deleteRecord(TYPE,id,userId);}





