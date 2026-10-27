import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
const temp=new THREE.Object3D();
const seed=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const base=import.meta.env.BASE_URL+'textures/';
function makeSign(){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d')!;c.fillStyle='#103b32';c.fillRect(0,0,1024,256);c.strokeStyle='#c0d7cb';c.lineWidth=4;c.strokeRect(10,10,1004,236);c.fillStyle='#e1e9d6';c.font='500 27px sans-serif';c.fillText('NORTHBOUND / ROUTE 01',55,58);c.font='500 70px sans-serif';c.fillText('Downtown',55,155);c.font='34px sans-serif';c.fillText('↑   ↑   ↑',760,150);c.font='22px sans-serif';c.fillText('MERIDIAN EXPRESSWAY',55,216);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
function barrierGeometry(){const shape=new THREE.Shape();shape.moveTo(-.36,0);shape.lineTo(.36,0);shape.lineTo(.36,.22);shape.lineTo(.19,.56);shape.lineTo(.16,1.02);shape.lineTo(-.16,1.02);shape.lineTo(-.19,.56);shape.lineTo(-.36,.22);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:850,bevelEnabled:false,steps:1});g.translate(0,0,-775);return g;}
export function World({distance,quality}:{distance:React.RefObject<number>;quality:'high'|'low'}){
 const scene=useThree(s=>s.scene);useEffect(()=>{scene.backgroundIntensity=1.15;scene.environmentIntensity=1.1;},[scene]);
 const markings=useRef<THREE.InstancedMesh>(null),buildings=useRef<THREE.InstancedMesh>(null),caps=useRef<THREE.InstancedMesh>(null),reflectors=useRef<THREE.InstancedMesh>(null),trees=useRef<THREE.InstancedMesh>(null),trunks=useRef<THREE.InstancedMesh>(null);
 const lamps=useRef<THREE.Group>(null),sign=useRef<THREE.Group>(null),bridge=useRef<THREE.Group>(null),lastDistance=useRef(-100);
 const loaded=useTexture([base+'asphalt-color.webp',base+'asphalt-normal.webp',base+'asphalt-roughness.webp',base+'concrete-color.webp',base+'concrete-normal.webp',base+'facade-color.webp',base+'facade-emission.webp',base+'facade-normal.webp',base+'sky.webp']);
 const textures=useMemo(()=>{
  const [road,normal,roughness,concrete,concreteNormal,facade,emission,facadeNormal,sky]=loaded.map(texture=>texture.clone());
  for(const t of [road,concrete,facade,emission,sky])t.colorSpace=THREE.SRGBColorSpace;
  for(const t of [road,normal,roughness]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3.5,145);t.anisotropy=8;}
  for(const t of [concrete,concreteNormal]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,100);t.anisotropy=4;}
  for(const t of [facade,emission,facadeNormal]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;}
  sky.mapping=THREE.EquirectangularReflectionMapping;sky.needsUpdate=true;
  return {road,normal,roughness,concrete,concreteNormal,facade,emission,facadeNormal,sky,sign:makeSign()};
 },[loaded]);
 const barrier=useMemo(barrierGeometry,[]);
 useEffect(()=>()=>{Object.values(textures).forEach(t=>t.dispose());barrier.dispose();},[textures,barrier]);
 const blocks=useMemo(()=>Array.from({length:88},(_,i)=>({x:(i%2?1:-1)*(25+seed(i+10)*68),z:-(i*73%710),w:9+seed(i*3)*14,h:13+seed(i*7)**1.5*76,d:10+seed(i*9)*15})),[]);
 const setup=useRef(false);
 useFrame(()=>{
  const d=distance.current;if(Math.abs(d-lastDistance.current)<.0001&&setup.current)return;lastDistance.current=d;
  const offset=-(d%(850/145))/(850/145);for(const t of [textures.road,textures.normal,textures.roughness])t.offset.y=offset;
  if(markings.current){let index=0;for(let lane=0;lane<3;lane++)for(let j=0;j<65;j++){temp.position.set((lane-1)*3.5,.014,-j*12+d%12+18);temp.scale.set(.12,.022,5);temp.rotation.set(0,0,0);temp.updateMatrix();markings.current.setMatrixAt(index++,temp.matrix);}markings.current.instanceMatrix.needsUpdate=true;}
  if(buildings.current&&caps.current){blocks.forEach((b,i)=>{const z=((b.z+d+750)%750)-715;
   temp.position.set(b.x,b.h/2-.1,z);temp.scale.set(b.w,b.h,b.d);temp.rotation.set(0,0,0);temp.updateMatrix();buildings.current!.setMatrixAt(i*2,temp.matrix);
   temp.position.y=b.h+Math.min(12,b.h*.2)/2;temp.scale.set(b.w*.72,Math.min(12,b.h*.2),b.d*.72);temp.updateMatrix();buildings.current!.setMatrixAt(i*2+1,temp.matrix);
   temp.position.y=b.h+.08;temp.scale.set(b.w+.2,.18,b.d+.2);temp.updateMatrix();caps.current!.setMatrixAt(i,temp.matrix);
   if(!setup.current){const color=new THREE.Color().setHSL(.56+seed(i)*.09,.04+seed(i+1)*.10,.62+seed(i+2)*.22);buildings.current!.setColorAt(i*2,color);buildings.current!.setColorAt(i*2+1,color);}
  });buildings.current.instanceMatrix.needsUpdate=true;caps.current.instanceMatrix.needsUpdate=true;if(buildings.current.instanceColor)buildings.current.instanceColor.needsUpdate=true;}
  if(reflectors.current){for(let i=0;i<104;i++){temp.position.set(i%2?8.12:-8.12,.89,-Math.floor(i/2)*14+d%14+20);temp.scale.set(.38,.095,.09);temp.rotation.set(0,0,0);temp.updateMatrix();reflectors.current.setMatrixAt(i,temp.matrix);}reflectors.current.instanceMatrix.needsUpdate=true;}
  if(trees.current&&trunks.current){for(let i=0;i<44;i++){const x=(i%2?1:-1)*(15.5+seed(i)*2),z=-Math.floor(i/2)*30+d%30+20;
   for(let j=0;j<5;j++){temp.position.set(x+(seed(i*9+j)-.5)*1.9,3.4+seed(i*3+j)*1.7,z+(seed(i*5+j)-.5)*1.4);temp.scale.set(1.2+seed(j+i)*.6,1.15+seed(i+2*j)*.5,1.2);temp.rotation.set(0,i*.7+j,0);temp.updateMatrix();trees.current.setMatrixAt(i*5+j,temp.matrix);if(!setup.current)trees.current.setColorAt(i*5+j,new THREE.Color().setHSL(.24+seed(i+j)*.07,.18,.15+seed(i*3+j)*.06));}
   temp.position.set(x,1.8,z);temp.scale.set(.19,3.6,.19);temp.rotation.set(0,0,0);temp.updateMatrix();trunks.current.setMatrixAt(i,temp.matrix);
  }trees.current.instanceMatrix.needsUpdate=true;trunks.current.instanceMatrix.needsUpdate=true;if(trees.current.instanceColor)trees.current.instanceColor.needsUpdate=true;}
  if(lamps.current)lamps.current.position.z=d%36;if(sign.current)sign.current.position.z=(d+160)%650-500;if(bridge.current)bridge.current.position.z=(d+600)%1300-1000;setup.current=true;
 });
 return <>
  <primitive attach="background" object={textures.sky}/><primitive attach="environment" object={textures.sky}/>
  <fog attach="fog" args={['#777f88',120,510]}/>
  <ambientLight intensity={.22} color="#b4c8df"/><hemisphereLight args={['#bdcede','#5c625d',1.15]}/>
  <directionalLight position={[-28,44,-35]} color="#ffe6c4" intensity={2.9} castShadow shadow-mapSize={quality==='high'?[2048,2048]:[512,512]} shadow-camera-left={-19} shadow-camera-right={19} shadow-camera-top={24} shadow-camera-bottom={-24} shadow-normalBias={.025} shadow-bias={-.00015}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.12,-300]} receiveShadow><planeGeometry args={[2000,1800]}/><meshStandardMaterial color="#333c38" roughness={1}/></mesh>
  <mesh position={[0,-.07,-350]} receiveShadow><boxGeometry args={[16,.14,850]}/><meshPhysicalMaterial color="#9aa3aa" map={textures.road} normalMap={textures.normal} normalScale={new THREE.Vector2(.5,.5)} roughnessMap={textures.roughness} roughness={.78} metalness={0} clearcoat={quality==='high'?.48:0} clearcoatRoughness={.32} envMapIntensity={.8}/></mesh>
  {[-1,1].map(side=><group key={side}>
   <mesh position={[side*7.35,.012,-350]}><boxGeometry args={[.12,.022,850]}/><meshStandardMaterial color="#d9d4bd" roughness={.68}/></mesh>
   <mesh position={[side*8.2,0,0]} geometry={barrier} receiveShadow><meshStandardMaterial map={textures.concrete} normalMap={textures.concreteNormal} normalScale={new THREE.Vector2(.3,.3)} color="#b5b8b5" roughness={.86}/></mesh>
   <mesh position={[side*10.8,-.025,-350]} receiveShadow><boxGeometry args={[4.4,.12,850]}/><meshStandardMaterial map={textures.concrete} color="#858a88" roughness={.9}/></mesh>
   <mesh position={[side*14,-.04,-350]}><boxGeometry args={[.25,.2,850]}/><meshStandardMaterial color="#979e97" roughness={.9}/></mesh>
   {[-5.25,-1.75,1.75,5.25].map(x=><mesh key={x} rotation={[-Math.PI/2,0,0]} position={[x+side*.6,.008,-350]}><planeGeometry args={[.32,850]}/><meshStandardMaterial color="#141a1d" transparent opacity={.13} depthWrite={false} roughness={.52}/></mesh>)}
  </group>)}
  <instancedMesh ref={markings} args={[undefined,undefined,195]}><boxGeometry/><meshStandardMaterial color="#dce0d8" roughness={.6}/></instancedMesh>
  <instancedMesh ref={reflectors} args={[undefined,undefined,104]}><boxGeometry/><meshStandardMaterial color="#f5c47e" emissive="#b48e4c" emissiveIntensity={.35}/></instancedMesh>
  <instancedMesh ref={buildings} args={[undefined,undefined,176]}><boxGeometry/><meshStandardMaterial map={textures.facade} normalMap={quality==='high'?textures.facadeNormal:null} normalScale={new THREE.Vector2(.25,.25)} emissiveMap={textures.emission} emissive="#ffc478" emissiveIntensity={.28} metalness={.25} roughness={.4}/></instancedMesh>
  <instancedMesh ref={caps} args={[undefined,undefined,88]}><boxGeometry/><meshStandardMaterial color="#657079" roughness={.8}/></instancedMesh>
  <instancedMesh ref={trees} args={[undefined,undefined,220]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial roughness={1}/></instancedMesh>
  <instancedMesh ref={trunks} args={[undefined,undefined,44]}><cylinderGeometry args={[1,1.2,1,6]}/><meshStandardMaterial color="#4b4840" roughness={1}/></instancedMesh>
  <group ref={lamps}>{Array.from({length:24},(_,i)=><group key={i} position={[i%2?-9.3:9.3,0,-Math.floor(i/2)*36+20]}><mesh position={[0,4.8,0]}><cylinderGeometry args={[.05,.09,9.6,6]}/><meshStandardMaterial color="#646e76" metalness={.7} roughness={.4}/></mesh><mesh position={[i%2?1.2:-1.2,9.55,0]}><boxGeometry args={[2.4,.09,.13]}/><meshStandardMaterial color="#747e83" metalness={.7} roughness={.4}/></mesh><mesh position={[i%2?2.2:-2.2,9.49,0]}><boxGeometry args={[.7,.06,.26]}/><meshStandardMaterial color="#fff1ce" emissive="#ffe0a1" emissiveIntensity={3}/></mesh></group>)}</group>
  <group ref={sign}>{[-8,8].map(x=><mesh key={x} position={[x,5.5,0]}><cylinderGeometry args={[.1,.14,11,8]}/><meshStandardMaterial color="#818b8e" metalness={.7} roughness={.4}/></mesh>)}<mesh position={[0,10.8,0]}><boxGeometry args={[16.2,.14,.15]}/><meshStandardMaterial color="#899792" metalness={.6} roughness={.4}/></mesh><mesh position={[0,9.3,0]}><boxGeometry args={[10,2.5,.15]}/><meshStandardMaterial map={textures.sign} emissiveMap={textures.sign} emissive="#c5dab7" emissiveIntensity={.15} roughness={.7}/></mesh></group>
  <group ref={bridge}><mesh position={[0,9,-20]} receiveShadow><boxGeometry args={[65,2,14]}/><meshStandardMaterial map={textures.concrete} color="#acb0ae" roughness={.9}/></mesh>{[-12,12].map(x=><mesh key={x} position={[x,4,-20]}><boxGeometry args={[2,10,9]}/><meshStandardMaterial map={textures.concrete} roughness={.9}/></mesh>)}<mesh position={[0,10.4,-20]}><boxGeometry args={[65,.6,.18]}/><meshStandardMaterial color="#899697" metalness={.5} roughness={.4}/></mesh></group>
 </>;
}
