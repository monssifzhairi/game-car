import { create } from 'zustand';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
export type ModelId = 'bmw' | 'mercedes' | 'supra';
export const modelFiles: Record<ModelId, {file:string;name:string;source:string}> = {
 bmw:{file:'bmw',name:'BMW M3 E30',source:'3d/bmw.glb'},
 mercedes:{file:'mrc140',name:'Mercedes S-Class W140',source:'3d/mrc140.glb'},
 supra:{file:'supra',name:'Toyota Supra',source:'3d/supra.glb'},
};
export type AssetEntry={status:'idle'|'downloading'|'decoding'|'preparing'|'ready'|'error';loaded:number;total:number;message:string;attempt:number};
export const idleAsset:AssetEntry={status:'idle',loaded:0,total:0,message:'',attempt:0};
export const useModelAssets=create<{entries:Partial<Record<ModelId,AssetEntry>>}>(()=>({entries:{}}));
const cache=new Map<ModelId,GLTF>();
const pending=new Map<ModelId,Promise<GLTF>>();
const update=(id:ModelId,change:Partial<AssetEntry>)=>useModelAssets.setState(s=>({entries:{...s.entries,[id]:{...idleAsset,...s.entries[id],...change}}}));
export function getCachedModel(id:ModelId){return cache.get(id);}
export function markModelReady(id:ModelId){update(id,{status:'ready',message:''});}
export function markModelError(id:ModelId,error:unknown){update(id,{status:'error',message:error instanceof Error?error.message:String(error)});}
export function retryModel(id:ModelId){cache.delete(id);update(id,{status:'idle',loaded:0,total:0,message:'',attempt:(useModelAssets.getState().entries[id]?.attempt||0)+1});}
export function loadVehicleModel(id:ModelId):Promise<GLTF>{
 const existing=cache.get(id);if(existing)return Promise.resolve(existing);
 const task=pending.get(id);if(task)return task;
 const promise=(async()=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),60000);
  update(id,{status:'downloading',loaded:0,total:0,message:''});
  try{
   const url=`${import.meta.env.BASE_URL}models/${modelFiles[id].file}.glb`;
   const response=await fetch(url,{signal:controller.signal});
   if(!response.ok)throw new Error(`Model request returned HTTP ${response.status}. Please retry.`);
   const total=Number(response.headers.get('content-length'))||0;
   const chunks:Uint8Array[]=[];let loaded=0,lastUpdate=0;
   if(response.body){const reader=response.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.byteLength;if(Date.now()-lastUpdate>80){update(id,{loaded,total});lastUpdate=Date.now();}}}finally{reader.releaseLock();}}
   else{const bytes=new Uint8Array(await response.arrayBuffer());chunks.push(bytes);loaded=bytes.length;}
   clearTimeout(timeout);
   const data=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
   if(data.length<12||new DataView(data.buffer).getUint32(0,true)!==0x46546c67)throw new Error('The server returned an invalid GLB (possibly an HTML rewrite). Check the deployment asset path.');
   update(id,{status:'decoding',loaded,total:loaded});
   const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
   let decodeTimer:ReturnType<typeof setTimeout>|undefined;
   const model=await Promise.race([loader.parseAsync(data.buffer,''),new Promise<never>((_,reject)=>{decodeTimer=setTimeout(()=>reject(new Error('Model decoding timed out. Try Performance mode or reload the model.')),30000);})]).finally(()=>clearTimeout(decodeTimer));
   cache.set(id,model);update(id,{status:'preparing'});return model;
  }catch(error){const message=controller.signal.aborted?new Error('Download timed out after 60 seconds. Check your connection and retry.'):error;markModelError(id,message);throw message;}
  finally{clearTimeout(timeout);pending.delete(id);}
 })();pending.set(id,promise);return promise;
}
