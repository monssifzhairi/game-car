import { Component, useEffect, useMemo, useRef, useState } from 'react';
import type {ReactNode} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {useGame} from '../store/gameStore';
import {vehicles} from '../data/vehicles';
import {getCachedModel,idleAsset,loadVehicleModel,markModelError,markModelReady,modelFiles,retryModel,useModelAssets} from './modelLoader';
import type {ModelId} from './modelLoader';
import {prepareImportedRig} from './importedRig';
export interface VehicleMotion{speed:number;steer:number;sliding:boolean;boosting?:boolean}
class ModelBoundary extends Component<{id:ModelId;children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(error:Error){markModelError(this.props.id,error);}render(){return this.state.failed?null:this.props.children;}}
function Rig({source,id,color,motion}:{source:GLTF;id:ModelId;color:string;motion?:VehicleMotion}){
 const rig=useMemo(()=>prepareImportedRig(source.scene,id),[source,id]);const steering=useRef(0),flames=useRef<THREE.Group>(null);
 const quality=useGame(s=>s.save.quality);
 useEffect(()=>{markModelReady(id);return()=>rig.dispose();},[rig,id]);
 useEffect(()=>{if(!rig.paint)return;const factory=vehicles.find(v=>v.model===id)?.color;if(color===factory&&rig.originalPaint)rig.paint.color.copy(rig.originalPaint);else rig.paint.color.set(color);},[color,rig,id]);
 useEffect(()=>{for(const t of rig.transmission){t.material.transmission=quality==='high'?t.original:0;t.material.needsUpdate=true;}},[quality,rig]);
 useFrame((_,dt)=>{dt=Math.min(dt,.05);const phase=useGame.getState().phase;
  if(!['PAUSED','CRASHING','GAME_OVER'].includes(phase)){steering.current=THREE.MathUtils.damp(steering.current,THREE.MathUtils.clamp(-(motion?.steer??0)*.045,-.4,.4),12,dt);for(const wheel of rig.wheels){wheel.rolling.rotation.x+=(motion?.speed??0)/3.6*dt/wheel.radius;if(wheel.front)wheel.steering.rotation.y=steering.current;}}
  if(flames.current){flames.current.visible=phase==='PLAYING'&&!!motion?.boosting;flames.current.scale.z=1+Math.sin(performance.now()*.035)*.16;}
 });
 return <group><primitive object={rig.root} dispose={null}/><group ref={flames} visible={false} name="vehicle_nitro_exhaust">{[.54,.68].map(x=><mesh key={x} position={[x,.23,Number(rig.root.userData.length)/2+.10]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.075,.65,8]}/><meshBasicMaterial color="#77ffe1" transparent opacity={.85} depthWrite={false}/></mesh>)}</group></group>;
}
export function ImportedCar({id,color,motion}:{id:ModelId;color:string;motion?:VehicleMotion}){
 const entry=useModelAssets(s=>s.entries[id]??idleAsset);
 const [source,setSource]=useState(()=>getCachedModel(id));
 useEffect(()=>{let active=true;setSource(getCachedModel(id));loadVehicleModel(id).then(model=>{if(active)setSource(model);}).catch(()=>{});return()=>{active=false;};},[id,entry.attempt]);
 return <ModelBoundary key={`${id}-${entry.attempt}`} id={id}>{source&&<Rig source={source} id={id} color={color} motion={motion}/>}</ModelBoundary>;
}
export function ModelLoadingOverlay(){
 const phase=useGame(s=>s.phase);
 const selected=useGame(s=>s.save.selected),model=vehicles.find(v=>v.id===selected)?.model;
 const entry=useModelAssets(s=>model?s.entries[model]??idleAsset:idleAsset);
 useEffect(()=>{if(!model||entry.status!=='preparing')return;const timer=setTimeout(()=>markModelError(model,new Error('The model downloaded, but rendering did not become ready. Try Performance mode.')),25000);return()=>clearTimeout(timer);},[model,entry.status]);
 if(!model||entry.status==='ready')return null;
 const failed=entry.status==='error',download=entry.status==='idle'||entry.status==='downloading';
 const percent=entry.total?Math.min(100,Math.round(entry.loaded/entry.total*100)):0;
 const mb=(n:number)=>(n/1048576).toFixed(1);
 return <div className={`model-loading-overlay ${phase==='GARAGE'?'collection-loading':''}`} role={failed?'alert':'status'} aria-live="polite" data-model={model} data-load-state={entry.status}><div className="model-loading-panel"><span className="eyebrow">YOUR ORIGINAL 3D COLLECTION</span><h2>{failed?'The vehicle couldn’t load.':`Preparing your ${modelFiles[model].name}.`}</h2><p>{failed?'Your actual model has not been replaced. Retry the download, or return to the collection.':download?'Downloading the optimized version of your original model. Real byte progress is shown below.':'Decoding embedded textures and preparing the original geometry. This step has a timeout, too.'}</p>{!failed&&<><div className="model-loading-track"><i style={{width:`${download?Math.max(2,percent):100}%`}}/></div><small>{download?`${entry.total?percent+'%':'DOWNLOADING'} · ${mb(entry.loaded)}${entry.total?` / ${mb(entry.total)}`:''} MB`:`${entry.status==='decoding'?'DECODING TEXTURES':'PREPARING WHEELS & MATERIALS'} · DOWNLOAD COMPLETE`}</small></>}{failed&&<><code>{entry.message}</code><button className="button primary" onClick={()=>retryModel(model)}>Retry original model <span>↗</span></button>{phase!=='GARAGE'&&<button className="text-button" onClick={()=>useGame.getState().setPhase('GARAGE')}>Open vehicle collection</button>}<button className="text-button" onClick={()=>{useGame.getState().updateSave({quality:'low'});retryModel(model);}}>Retry in Performance mode</button></>}{!failed&&phase!=='GARAGE'&&<button className="text-button" onClick={()=>useGame.getState().setPhase('GARAGE')}>Choose another vehicle</button>}<small className="asset-source">SOURCE: {modelFiles[model].source} · LOCAL DECODER · NO CDN</small></div></div>;
}
