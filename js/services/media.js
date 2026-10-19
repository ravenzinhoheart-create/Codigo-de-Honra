// CÓDIGO DE HONRA — Media Service
// Mídia persistente exclusivamente no Supabase Storage.
import { supabase } from './supabase.js';
import NativeGallery from '../native/gallery.js';

const BUCKET='media';
const urlCache=new Map();
function id(){return globalThis.crypto?.randomUUID?.()||`media-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
async function compressImageBlob(blob,maxSide=1600,quality=.82){if(!blob?.type?.startsWith('image/'))return blob;const bitmap=await createImageBitmap(blob);const scale=Math.min(1,maxSide/Math.max(bitmap.width||1,bitmap.height||1));const width=Math.max(1,Math.round((bitmap.width||1)*scale));const height=Math.max(1,Math.round((bitmap.height||1)*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas indisponível para preparar a imagem.');ctx.drawImage(bitmap,0,0,width,height);bitmap.close?.();return await new Promise(r=>canvas.toBlob(r,'image/jpeg',quality))||blob;}
async function compressVideoBlob(blob,size=1080,fps=30,bitrate=2200000){if(!blob?.type?.startsWith('video/')||typeof MediaRecorder==='undefined')return blob;const url=URL.createObjectURL(blob),video=document.createElement('video');video.src=url;video.muted=true;video.playsInline=true;video.preload='auto';try{await new Promise((res,rej)=>{video.onloadedmetadata=res;video.onerror=()=>rej(new Error('Vídeo inválido.'));});const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d',{alpha:false});const stream=canvas.captureStream?.(fps);if(!stream)return blob;try{const source=video.captureStream?.()||video.mozCaptureStream?.();source?.getAudioTracks?.().forEach(t=>stream.addTrack(t));}catch{}const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm'];const mime=types.find(t=>MediaRecorder.isTypeSupported?.(t));if(!mime)return blob;const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});const chunks=[];rec.ondataavailable=e=>e.data?.size&&chunks.push(e.data);const out=await new Promise((resolve,reject)=>{rec.onerror=()=>reject(rec.error||new Error('Falha ao comprimir vídeo.'));rec.onstop=()=>resolve(chunks.length?new Blob(chunks,{type:mime}):null);let drawing=true;const draw=()=>{if(!drawing)return;ctx.drawImage(video,0,0,size,size);if(!video.ended)requestAnimationFrame(draw);};video.onended=()=>{drawing=false;ctx.drawImage(video,0,0,size,size);setTimeout(()=>rec.stop(),120);};rec.start(1000);video.play().then(draw).catch(reject);});return out||blob;}catch{return blob}finally{try{video.pause()}catch{}video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}}
async function upload(blob,{userId=null,kind='media',name='media'}={}){if(!(blob instanceof Blob))throw new Error('Mídia inválida.');const uid=userId||'anonymous';const ext=blob.type.includes('webm')?'webm':blob.type.includes('mp4')?'mp4':blob.type.includes('jpeg')?'jpg':blob.type.includes('webp')?'webp':'bin';const path=`${kind}/${uid}/${id()}.${ext}`;const {error}=await supabase.storage.from(BUCKET).upload(path,blob,{contentType:blob.type||'application/octet-stream',upsert:false,cacheControl:'31536000'});if(error)throw error;return {path,type:blob.type,name};}
export async function getMediaUrl(path,expiresIn=3600,options={}){
    if(!path)return '';
    if(/^https?:\/\//i.test(path)||/^blob:/i.test(path)||/^data:/i.test(path))return path;

    const forceDownload = Boolean(options?.forceDownload);
    const cacheKey=`${forceDownload?'blob':'signed'}:${path}:${expiresIn}`;
    const cached=urlCache.get(cacheKey);
    if(cached){
        if(typeof cached==='string') return cached; // compatibility for object URLs cached by this session
        if(cached.expiresAt>Date.now()) return cached.url;
        urlCache.delete(cacheKey);
    }

    // Avatars are rendered inside the Android WebView. For them we deliberately
    // bypass signed URLs and create a local object URL from an authenticated
    // Storage download. This guarantees that the <img> receives actual image
    // bytes instead of a protected URL that the WebView may fail to render.
    if(forceDownload){
        const {data,error}=await supabase.storage.from(BUCKET).download(path);
        if(error||!data)throw error||new Error('Arquivo de mídia não encontrado.');
        const objectUrl=URL.createObjectURL(data);
        urlCache.set(cacheKey,objectUrl);
        return objectUrl;
    }

    try{
        const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,expiresIn);
        const url=data?.signedUrl||'';
        if(!error&&url){urlCache.set(cacheKey,{url,expiresAt:Date.now()+Math.max(30,Number(expiresIn)-60)*1000});return url;}
    }catch(error){
        console.warn('[MEDIA] Falha ao criar signed URL, tentando download autenticado:',error);
    }

    try{
        const {data,error}=await supabase.storage.from(BUCKET).download(path);
        if(error||!data)throw error||new Error('Arquivo de mídia não encontrado.');
        const objectUrl=URL.createObjectURL(data);
        urlCache.set(cacheKey,objectUrl);
        return objectUrl;
    }catch(error){
        console.warn('[MEDIA] Falha ao carregar mídia protegida:',error);
        throw error;
    }
}
async function fileToPersistentMedia(file,userId){if(!file)return null;if(!(file instanceof Blob))throw new Error('Arquivo de mídia inválido.');const type=file.type?.startsWith('video/')?'video':'image';const prepared=type==='image'?await compressImageBlob(file):await compressVideoBlob(file);const stored=await upload(prepared,{userId,kind:type,name:file.name});const src=await getMediaUrl(stored.path);return {id:stored.path,mediaId:stored.path,path:stored.path,type,src,url:src,thumbnail:type==='image'?src:null,mimeType:prepared.type||file.type||null,name:file.name||null};}
function extractStoragePath(value){
    if(!value||typeof value!=='string')return null;
    if(/^https?:\/\//i.test(value)){
        const match=value.match(/\/storage\/v1\/object\/sign\/media\/(.+?)(?:\?|$)/i)
            || value.match(/\/storage\/v1\/object\/public\/media\/(.+?)(?:\?|$)/i);
        if(match?.[1])return decodeURIComponent(match[1]);
    }
    return null;
}

export async function persistLegacyMediaItem(item){
    if(!item||typeof item!=='object')return item;

    const path =
        item.path ||
        item.mediaId ||
        extractStoragePath(item.url) ||
        extractStoragePath(item.src) ||
        extractStoragePath(item.thumbnail);

    if(!path)return item;

    return {
        ...item,
        path,
        mediaId:path
    };
}
export async function persistLegacyMediaList(items=[]){return Array.isArray(items)?Promise.all(items.map(persistLegacyMediaItem)):[];}
export async function hydrateMediaItems(items=[]){
    if(!Array.isArray(items))return [];

    return Promise.all(items.map(async item=>{
        if(!item||typeof item!=='object')return item;

        const path =
            item.path ||
            item.mediaId ||
            extractStoragePath(item.url) ||
            extractStoragePath(item.src) ||
            extractStoragePath(item.thumbnail);

        if(!path)return {...item};

        try{
            const src=await getMediaUrl(path);

            return {
                ...item,
                path,
                mediaId:path,
                src,
                url:src,
                thumbnail:item.type==='image'
                    ? src
                    : (item.thumbnail||null)
            };
        }catch{
            return {
                ...item,
                path,
                mediaId:path
            };
        }
    }));
}
export async function deleteMediaReference(path){if(!path)return;const {error}=await supabase.storage.from(BUCKET).remove([path]);if(error)throw error;urlCache.delete(`${path}:3600`);}


export async function selectMedia(options={}){
    if(!NativeGallery.isSupported()){
        throw new Error('Galeria indisponível.');
    }

    const {
        onProgress=null,
        ...pickOptions
    } = options;

    const result=await NativeGallery.pick({
        multiple:true,
        accept:'image/*,video/*',
        ...pickOptions
    });

    const files=Array.isArray(result)
        ? result.slice(0,10)
        : [];

    const total=files.length;
    const out=[];

    onProgress?.({
        stage:'starting',
        current:0,
        completed:0,
        total
    });

    for(let index=0;index<files.length;index++){
        const file=files[index];

        onProgress?.({
            stage:'processing',
            current:index+1,
            completed:out.length,
            total,
            name:file?.name||null
        });

        const item=await fileToPersistentMedia(
            file,
            pickOptions.userId
        );

        if(item){
            out.push(item);
        }

        onProgress?.({
            stage:'uploaded',
            current:index+1,
            completed:out.length,
            total,
            name:file?.name||null,
            item
        });
    }

    onProgress?.({
        stage:'completed',
        current:total,
        completed:out.length,
        total
    });

    return out;
}
export function validateMediaCount(media,max=10){return Array.isArray(media)&&media.length<=max;}
export function filterSupportedMedia(media){return Array.isArray(media)?media.filter(x=>x?.type==='image'||x?.type==='video'):[];}



