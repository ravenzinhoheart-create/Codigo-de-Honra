import { listRecords,getRecord,insertRecord,updateRecord,deleteRecord } from './app-records.js';
import { hydrateMediaItems } from './media.js';
export const MARKETPLACE_CATEGORIES={motorcycles:'Motocicletas',parts:'PeÃ§as e acessÃ³rios',supplies:'Suprimentos',others:'Outros'};
const TYPE='marketplace';
export async function getProducts(filters={}){
    let a=await listRecords(TYPE);

    a=a.filter(x=>x.sold!==true&&x.status!=='closed');

    if(filters.category&&filters.category!=='all'){
        a=a.filter(x=>x.category===filters.category);
    }

    if(filters.userId){
        a=a.filter(x=>x.sellerId===filters.userId);
    }

    if(filters.search){
        const s=filters.search.toLowerCase().trim();
        a=a.filter(x=>`${x.name} ${x.description}`.toLowerCase().includes(s));
    }

    a=await Promise.all(
        a.map(async product=>({
            ...product,
            media:await hydrateMediaItems(product.media||[])
        }))
    );

    return a;
}

export async function getProduct(id){
    const product=await getRecord(TYPE,id);

    if(!product)return product;

    return {
        ...product,
        media:await hydrateMediaItems(product.media||[])
    };
}

export async function createProduct(product,user){const title=String(product?.name||product?.title||'').trim();if(!title)throw new Error('Nome do anÃºncio obrigatÃ³rio.');if(!product?.category)throw new Error('Categoria obrigatÃ³ria.');return insertRecord(TYPE,user.id,{sellerId:user.id,sellerUsername:user.username,sellerAvatar:user.avatar||null,seller:{uid:user.id,username:user.username,avatar:user.avatar||null},name:title,title,description:product.description||'',price:Number(product.price||0),priceFormatted:product.priceFormatted||null,category:product.category,categoryLabel:product.categoryLabel||MARKETPLACE_CATEGORIES[product.category]||product.category,condition:product.condition||'',media:Array.isArray(product.media)?product.media.slice(0,10):[],sold:false,createdAt:new Date().toISOString()});}
export async function updateProduct(id,patch,userId){
    const p=await getRecord(TYPE,id);

    if(!p){
        throw new Error("Anúncio não encontrado.");
    }

    const ownerId =
        p.sellerId ||
        p.ownerId ||
        p.createdBy?.id ||
        p.createdBy ||
        null;

    if(
        !userId ||
        !ownerId ||
        String(ownerId)!==String(userId)
    ){
        throw new Error("Somente o dono pode editar este anúncio.");
    }

    if(p.sold){
        throw new Error("Um anúncio vendido não pode ser editado.");
    }

    return updateRecord(
        TYPE,
        id,
        {...patch,id:undefined},
        {ownerId:userId}
    );
}
export async function closeProduct(id,userId){return updateProduct(id,{status:'closed',closedAt:new Date().toISOString()},userId);}
export async function markAsSold(id,userId){return updateProduct(id,{sold:true,soldAt:new Date().toISOString()},userId);}
export async function deleteProduct(id,userId){return deleteRecord(TYPE,id,userId);}





