import { listRecords,insertRecord,updateRecord } from './app-records.js';
import { supabase } from './supabase.js';
const TYPE='notifications';

export async function getNotifications(userId){return listRecords(TYPE,{ownerId:userId});}
export async function createNotification(notification){return insertRecord(TYPE,notification.userId,{...notification,read:false,createdAt:new Date().toISOString()});}
export async function markAsRead(id){return updateRecord(TYPE,id,{read:true});}
export async function markAllAsRead(userId){const list=await listRecords(TYPE,{ownerId:userId});await Promise.all(list.filter(x=>!x.read).map(x=>updateRecord(TYPE,x.id,{read:true},{ownerId:userId})));return true;}
export async function getUnreadCount(userId){return (await getNotifications(userId)).filter(x=>!x.read).length;}

/**
 * Envia uma notificação remota através da Edge Function.
 * A função não usa service_role no cliente; o JWT da sessão atual é
 * encaminhado automaticamente pelo Supabase Functions client.
 */
async function dispatchRemote(payload){
    const { data, error } = await supabase.functions.invoke('send-push', { body: payload });
    if(error) throw error;
    return data;
}

export async function sendPush(notification){
    const saved = notification?.userId ? await createNotification(notification) : null;
    try {
        await dispatchRemote({
            type: notification.type || 'general',
            title: notification.title || 'Código de Honra',
            body: notification.body || '',
            data: notification.data || {},
            userIds: notification.userId ? [notification.userId] : []
        });
    } catch(error){
        console.warn('[PUSH] Falha no envio remoto:', error);
    }
    window.dispatchEvent(new CustomEvent('notification:push',{detail:notification}));
    return saved;
}

export async function sendPushToUsers(userIds=[], notification={}){
    const ids=[...new Set((userIds||[]).filter(Boolean).map(String))];
    if(!ids.length) return { sent:0 };
    const records=await Promise.all(ids.map(userId=>createNotification({...notification,userId})));
    try {
        return await dispatchRemote({
            type: notification.type || 'general',
            title: notification.title || 'Código de Honra',
            body: notification.body || '',
            data: notification.data || {},
            userIds: ids
        });
    } catch(error){
        console.warn('[PUSH] Falha no envio remoto:', error);
        return { sent:0, error:error?.message || String(error), records };
    }
}

export async function sendPushToAudience(audience='on', notification={}){
    try {
        return await dispatchRemote({
            type: notification.type || 'general',
            title: notification.title || 'Código de Honra',
            body: notification.body || '',
            data: notification.data || {},
            audience
        });
    } catch(error){
        console.warn('[PUSH] Falha no envio remoto para audiência:', error);
        return { sent:0, error:error?.message || String(error) };
    }
}
