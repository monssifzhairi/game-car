import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { World } from './World';
import { Car } from './Car';
import { BMWLoadingOverlay, useBMWAsset } from './BMWCar';
import { vehicles } from '../data/vehicles';
import { useGame } from '../store/gameStore';
import { Engine, input, clearInput, presentation } from './engine';
import { audio } from './AudioManager';
const dummy=new THREE.Object3D();const particleColors=[new THREE.Color('#8a9290'),new THREE.Color('#ffbf65'),new THREE.Color('#5af5d1'),new THREE.Color('#e7c67d')];
function TrafficCar({kind,color}:{kind:number;color:string}){const suv=kind===1,truck=kind===4,van=kind===2;return <group>
 <mesh castShadow position={[0,.55,0]}><boxGeometry args={[truck?2.1:1.8,.65,truck?6:4.3]}/><meshStandardMaterial color={color} metalness={.55} roughness={.32}/></mesh>
 <mesh castShadow position={[0,suv||van?1.17:1.05,.1]}><boxGeometry args={[1.5,suv||van?.8:.55,truck?2:van?3:2.1]}/><meshStandardMaterial color="#1e343d" metalness={.7} roughness={.25}/></mesh>
 {truck&&<mesh position={[0,1.6,-.4]} castShadow><boxGeometry args={[2.15,2,4]}/><meshStandardMaterial color="#a2a999" roughness={.7}/></mesh>}
 {[-1,1].map(side=><group key={side}>{[-1.25,1.25].map(z=><mesh key={z} position={[side*.92,.34,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.34,.34,.2,10]}/><meshStandardMaterial color="#161c1d" roughness={.9}/></mesh>)}<mesh position={[side*.64,.7,truck?3.01:2.16]}><boxGeometry args={[.4,.09,.03]}/><meshStandardMaterial color="#f5482a" emissive="#ff2a12" emissiveIntensity={2}/></mesh></group>)}
 </group>;}
function Scene(){
 const session=useGame(s=>s.session),selected=useGame(s=>s.save.selected),paint=useGame(s=>s.save.paint),quality=useGame(s=>s.save.quality);
 const vehicle=vehicles.find(v=>v.id===selected)||vehicles[0];
 const engine=useMemo(()=>new Engine(vehicle),[session,vehicle]);
 const player=useRef<THREE.Group>(null),traffic=useRef<(THREE.Group|null)[]>([]),tokens=useRef<(THREE.Group|null)[]>([]),particles=useRef<THREE.InstancedMesh>(null);
 const distance=useRef(0),elapsed=useRef(0),hudTimer=useRef(0),eventId=useRef(0),crashTime=useRef(0),motion=useRef({speed:0,steer:0,sliding:false,boosting:false});
 useEffect(()=>{elapsed.current=0;crashTime.current=0;eventId.current=0;clearInput();},[session]);
 useFrame(({camera,clock,size},rawDt)=>{
  const dt=Math.min(rawDt,.05),state=useGame.getState(),phase=state.phase;audio.enabled=state.save.sound;
  if(vehicle.model==='bmw'&&useBMWAsset.getState().status!=='ready'){audio.update(0,false,false,false);return;}
  if(phase==='COUNTDOWN'){elapsed.current+=dt;engine.notice=String(Math.max(1,3-Math.floor(elapsed.current*1.4)));engine.noticeTime=1;engine.speed=65;if(elapsed.current>2.1){engine.notify('GO · OWN THE ROAD','go');state.setPhase('PLAYING');}}
  if(phase==='PLAYING'){
   engine.autoDrive=state.save.autoDrive;
   const steps=Math.max(1,Math.ceil(dt/(1/60)));for(let i=0;i<steps;i++)engine.step(dt/steps,input);
   distance.current=engine.distance;
   if(engine.eventId!==eventId.current){eventId.current=engine.eventId;if(engine.event==='crash')audio.crash();else if(engine.event==='pickup')audio.pickup();else if(engine.event==='near')audio.tone(600,.15,'sine',.04,900);}
   if(engine.dead){state.updateHUD(engine.hud());state.setPhase('CRASHING');crashTime.current=0;clearInput();}
  }
  if(phase==='CRASHING'){crashTime.current+=dt;engine.step(dt,input);if(crashTime.current>1.1)state.finish(engine.hud());}
  if(phase==='MENU'||phase==='GARAGE'){distance.current+=dt*1.7;}
  if(phase==='PLAYING'||phase==='CRASHING'||phase==='COUNTDOWN'){hudTimer.current+=dt;if(hudTimer.current>.09){state.updateHUD(engine.hud());hudTimer.current=0;}}
  const driving=!['MENU','GARAGE'].includes(phase);
  if(player.current){player.current.position.set(driving?engine.x:1.75,.025+(phase==='PLAYING'?Math.sin(engine.time*18)*Math.min(.018,engine.speed*.0001):0),0);player.current.rotation.set(0,driving?engine.yaw+(engine.dead?Math.min(crashTime.current*.8,.7):0):phase==='GARAGE'?presentation.rotation+(vehicle.model==='bmw'?Math.PI+.25:0):Math.PI+.25+Math.sin(clock.elapsedTime*.23)*.025,driving?-engine.lateral*.008:0);player.current.visible=!(phase==='PLAYING'&&engine.invincible>0&&Math.floor(engine.invincible*12)%2===0);}
  motion.current.speed=phase==='PLAYING'?engine.speed:0;motion.current.boosting=phase==='PLAYING'&&engine.boost;motion.current.steer=engine.lateral;motion.current.sliding=engine.sliding;
  for(let i=0;i<traffic.current.length;i++){const obj=traffic.current[i],t=engine.traffic[i];if(obj){obj.visible=driving;obj.position.set(t.x,0,t.z);obj.rotation.y=t.hit?.15:0;}}
  tokens.current.forEach((obj,i)=>{if(!obj)return;const t=engine.tokens[i];obj.visible=driving&&t.active;obj.position.set(t.x,1.15+Math.sin(engine.time*3+i)*.12,t.z);obj.rotation.set(0,engine.time*2+i,Math.PI/2);});
  if(particles.current){engine.particles.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);const size=p.life>0?Math.max(0,p.life/p.max)*(p.kind===0?.38:.1):0;dummy.scale.setScalar(size);dummy.updateMatrix();particles.current!.setMatrixAt(i,dummy.matrix);particles.current!.setColorAt(i,particleColors[p.kind]);});particles.current.instanceMatrix.needsUpdate=true;if(particles.current.instanceColor)particles.current.instanceColor.needsUpdate=true;}
  const cam=camera as THREE.PerspectiveCamera;
  if(driving){const speed=engine.speed/260,shake=engine.shake*.10;const mobile=size.width<760;const target=new THREE.Vector3(engine.x*.45+Math.sin(clock.elapsedTime*70)*shake,(mobile?5.6:4.3)+speed*.55,(mobile?12.5:9.3)+speed*2);camera.position.lerp(target,1-Math.exp(-dt*(phase==='COUNTDOWN'?3:6)));const look=new THREE.Vector3(engine.x*.5,mobile?-1:1,mobile?-10:-14);camera.lookAt(look);const fov=(mobile?58:54)+speed*5+(engine.boost?6:0);cam.fov=THREE.MathUtils.lerp(cam.fov,fov,dt*4);}
  else {const garage=phase==='GARAGE',mobile=size.width<760;camera.position.lerp(new THREE.Vector3(mobile?7.5:garage?8:8.2,mobile?4:garage?3.5:3.4,mobile?10.5:garage?9:8.8),1-Math.exp(-dt*2.8));camera.lookAt(mobile?1.6:garage?1:-1.9,mobile?garage?2.4:2.3:.55,mobile?-1:-1.4);cam.fov=THREE.MathUtils.lerp(cam.fov,mobile?51:garage?43:44,dt*3);}
  cam.updateProjectionMatrix();audio.update(engine.speed,phase==='PLAYING',engine.boost&&phase==='PLAYING',engine.sliding&&phase==='PLAYING');
 });
 return <><World distance={distance} quality={quality}/>
  <group ref={player}><Car vehicle={vehicle} color={paint} motion={motion.current} boost={useGame(s=>s.hud.nitro)<99&&input.nitro}/></group>
  {engine.traffic.map((t,i)=><group key={i} ref={el=>{traffic.current[i]=el;}}><TrafficCar kind={t.kind} color={t.color}/></group>)}
  {engine.tokens.map((t,i)=><group key={i} ref={el=>{tokens.current[i]=el;}}><mesh castShadow><cylinderGeometry args={[t.bonus?.52:.35,t.bonus?.52:.35,.10,6]}/><meshStandardMaterial color={t.bonus?'#6cedc4':'#edc67b'} emissive={t.bonus?'#33966c':'#b38a37'} emissiveIntensity={.7} metalness={.7} roughness={.25}/></mesh><mesh rotation={[Math.PI/2,0,0]} position={[0,.065,0]}><torusGeometry args={[t.bonus?.32:.2,.025,4,12]}/><meshStandardMaterial color="#fff4d0" emissive="#ffe3a3" emissiveIntensity={1}/></mesh></group>)}
  <instancedMesh ref={particles} args={[undefined,undefined,96]} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshBasicMaterial transparent opacity={.65}/></instancedMesh>
 </>;
}
export function GameScene(){const quality=useGame(s=>s.save.quality);return <div className="scene"><Canvas shadows dpr={quality==='high'?[1,1.4]:[1,1]} gl={{antialias:quality==='high',powerPreference:'high-performance'}} camera={{position:[10,4.1,11],fov:45,near:.1,far:1300}}><Suspense fallback={null}><Scene/></Suspense></Canvas><BMWLoadingOverlay/></div>;}
