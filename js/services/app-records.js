// CÓDIGO DE HONRA — Persistência central Supabase
import { supabase } from './supabase.js';

export async function listRecords(type, { ownerId = null, order = 'created_at', ascending = false } = {}) {
  let q = supabase.from('app_records').select('id,owner_id,data,created_at,updated_at').eq('entity_type', type).order(order, { ascending });
  if (ownerId) q = q.eq('owner_id', ownerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(row => ({ ...(row.data || {}), id: row.id, ownerId: row.owner_id, createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function getRecord(type, id) {
  const { data, error } = await supabase.from('app_records').select('id,owner_id,data,created_at,updated_at').eq('entity_type', type).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...(data.data || {}), id: data.id, ownerId: data.owner_id, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function insertRecord(type, ownerId, value) {
  const id = value?.id || globalThis.crypto?.randomUUID?.();
  const payload = { ...(value || {}), id: undefined, ownerId: undefined, createdAt: undefined, updatedAt: undefined };
  delete payload.id; delete payload.ownerId; delete payload.createdAt; delete payload.updatedAt;
  const { data, error } = await supabase.from('app_records').insert({ id, entity_type: type, owner_id: ownerId, data: payload }).select('id,owner_id,data,created_at,updated_at').single();
  if (error) throw error;
  return { ...(data.data || {}), id: data.id, ownerId: data.owner_id, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function updateRecord(type, id, patch, { ownerId = null } = {}) {
  const current = await getRecord(type, id);
  if (!current) throw new Error('Registro não encontrado.');
  const next = { ...current, ...patch };
  const payload = { ...next };
  delete payload.id; delete payload.ownerId; delete payload.createdAt; delete payload.updatedAt;
  let q = supabase.from('app_records').update({ data: payload }).eq('entity_type', type).eq('id', id);
  if (ownerId) q = q.eq('owner_id', ownerId);
  const { data, error } = await q.select('id,owner_id,data,created_at,updated_at').single();
  if (error) throw error;
  return { ...(data.data || {}), id: data.id, ownerId: data.owner_id, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function deleteRecord(type, id, ownerId = null) {
  let q = supabase.from('app_records').delete().eq('entity_type', type).eq('id', id);
  if (ownerId) q = q.eq('owner_id', ownerId);
  const { error } = await q;
  if (error) throw error;
  return true;
}
