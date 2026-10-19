// CÓDIGO DE HONRA — armazenamento temporário em memória.
// Dados persistentes pertencem ao Supabase.
const memory=new Map();
export function setItem(key,value){memory.set(String(key),value);}
export function getItem(key,fallback=null){return memory.has(String(key))?memory.get(String(key)):fallback;}
export function removeItem(key){memory.delete(String(key));}
export function hasItem(key){return memory.has(String(key));}
export function clearStorage(){memory.clear();}
export async function saveFile(key,file){if(!(file instanceof Blob)&&typeof file!=='string')throw new Error('Arquivo inválido.');memory.set(String(key),file);return file;}
export function getStoredFile(key){return memory.get(String(key))||null;}
