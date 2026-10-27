import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
const temp=new THREE.Object3D();
function rand(n:number){return (Math.sin(n*127.1+311.7)*43758.5453)%1+.5;}
function facade(){const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#172a31';ctx.fillRect(0,0,128,256);for(let y=0;y<256;y+=12)for(let x=0;x<128;x+=10){const n=Math.abs(Math.sin(x*13+y*27));ctx.fillStyle=n>.72?'#aca18b':n>.55?'#576a68':'#233d46';ctx.fillRect(x+2,y+2,5,7);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
function asphalt(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!;const img=ctx.createImageData(128,128);for(let i=0;i<img.data.length;i+=4){const n=31+Math.random()*12;img.data[i]=n;img.data[i+1]=n+3;img.data[i+2]=n+4;img.data[i+3]=255;}ctx.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(8,100);t.colorSpace=THREE.SRGBColorSpace;return t;}
function signTexture(){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#163c35';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#b8cfc2';ctx.lineWidth=4;ctx.strokeRect(10,10,1004,236);ctx.fillStyle='#dae3cf';ctx.font='500 28px sans-serif';ctx.fillText('NORTHBOUND  /  ROUTE 01',55,60);ctx.font='500 72px sans-serif';ctx.fillText('Downtown',55,155);ctx.font='32px sans-serif';ctx.fillText('↑     ↑     ↑',740,150);ctx.font='22px sans-serif';ctx.fillStyle='#8eb5a2';ctx.fillText('MERIDIAN EXPRESSWAY',55,214);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
export function World({distance,quality}:{distance:React.RefObject<number>;quality:'high'|'low'}){
 const markings=useRef<THREE.InstancedMesh>(null), buildings=useRef<THREE.InstancedMesh>(null),rails=useRef<THREE.InstancedMesh>(null),lamps=useRef<THREE.Group>(null),sign=useRef<THREE.Group>(null),bridge=useRef<THREE.Group>(null);
 const trees=useRef<THREE.InstancedMesh>(null),trunks=useRef<THREE.InstancedMesh>(null);
 const textures=useMemo(()=>({facade:facade(),asphalt:asphalt(),sign:signTexture()}),[]);
 useEffect(()=>()=>{Object.values(textures).forEach(t=>t.dispose());},[textures]);
 const blocks=useMemo(()=>Array.from({length:110},(_,i)=>({x:(i%2===0?1:-1)*(23+Math.abs(rand(i+10))*65),z:-((i*53)%700),w:7+Math.abs(rand(i*3))*14,h:10+Math.abs(rand(i*7))*75,d:8+Math.abs(rand(i*9))*12})),[]);
 useFrame(()=>{const d=distance.current;
  if(markings.current){let i=0;for(let lane=0;lane<3;lane++)for(let j=0;j<65;j++){temp.position.set((lane-1)*3.5,.016,-j*12+(d%12)+18);temp.scale.set(.12,.025,5);temp.rotation.set(0,0,0);temp.updateMatrix();markings.current.setMatrixAt(i++,temp.matrix);}markings.current.instanceMatrix.needsUpdate=true;}
  if(rails.current){for(let i=0;i<160;i++){temp.position.set(i%2===0?-8.2:8.2,.53,-Math.floor(i/2)*10+d%10+25);temp.scale.set(.12,.75,.16);temp.rotation.set(0,0,0);temp.updateMatrix();rails.current.setMatrixAt(i,temp.matrix);}rails.current.instanceMatrix.needsUpdate=true;}
  if(buildings.current){blocks.forEach((b,i)=>{const z=((b.z+d*.82+750)%750)-715;temp.position.set(b.x,b.h/2-.5,z);temp.scale.set(b.w,b.h,b.d);temp.rotation.set(0,0,0);temp.updateMatrix();buildings.current!.setMatrixAt(i,temp.matrix);});buildings.current.instanceMatrix.needsUpdate=true;}
  if(trees.current&&trunks.current){for(let i=0;i<56;i++){const x=(i%2===0?-1:1)*(13.5+(i%3)*1.1),z=-Math.floor(i/2)*26+d%26+20;temp.position.set(x,3.3,z);temp.scale.set(1.6,2.6,1.6);temp.rotation.set(0,i*.7,0);temp.updateMatrix();trees.current.setMatrixAt(i,temp.matrix);temp.position.set(x,1.4,z);temp.scale.set(.18,2.8,.18);temp.updateMatrix();trunks.current.setMatrixAt(i,temp.matrix);}trees.current.instanceMatrix.needsUpdate=true;trunks.current.instanceMatrix.needsUpdate=true;}
  if(lamps.current)lamps.current.position.z=d%36;
  if(sign.current)sign.current.position.z=(d+160)%650-500;
  if(bridge.current)bridge.current.position.z=(d+600)%1300-1000;
 });
 return <>
  <mesh><sphereGeometry args={[900,24,24]}/><shaderMaterial side={THREE.BackSide} depthWrite={false} uniforms={{top:{value:new THREE.Color('#182c3b')},bottom:{value:new THREE.Color('#d99f77')}}} vertexShader={`varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`varying vec3 vWorld;uniform vec3 top;uniform vec3 bottom;void main(){float h=normalize(vWorld).y;vec3 c=mix(bottom,top,smoothstep(-.03,.52,h));gl_FragColor=vec4(c,1.);}`}/></mesh>
  <fog attach="fog" args={['#8d8881',95,510]}/>
  <ambientLight intensity={.72} color="#c4ced4"/>
  <hemisphereLight args={['#b5c7dc','#62503f',1.4]}/>
  <directionalLight position={[-40,45,-75]} color="#ffe1b1" intensity={2.1} castShadow shadow-mapSize={quality==='high'?[1024,1024]:[512,512]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-bias={-.0005}/>
  <mesh position={[-220,42,-360]}><sphereGeometry args={[21,24,24]}/><meshBasicMaterial color="#ffe3af" fog={false}/></mesh>
  <Environment resolution={128} frames={1}><Lightformer intensity={2} color="#c9dae5" position={[0,8,0]} scale={[20,10,1]} rotation={[Math.PI/2,0,0]}/><Lightformer intensity={4} color="#ffe1b3" position={[-12,4,-8]} scale={[15,5,1]} rotation={[0,Math.PI/2,0]}/><Lightformer intensity={1} color="#6a8e9c" position={[12,2,0]} scale={[20,8,1]} rotation={[0,-Math.PI/2,0]}/></Environment>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.09,-300]} receiveShadow><planeGeometry args={[2000,1800]}/><meshStandardMaterial color="#25372c" roughness={.95}/></mesh>
  <mesh position={[0,-.06,-350]} receiveShadow><boxGeometry args={[16,.12,850]}/><meshStandardMaterial map={textures.asphalt} roughness={.9} metalness={0}/></mesh>
  {[-1,1].map(side=><group key={side}>
   <mesh position={[side*7.35,.012,-350]}><boxGeometry args={[.13,.025,850]}/><meshStandardMaterial color="#c9c6ad" roughness={.5}/></mesh>
   <mesh position={[side*8.2,.88,-350]}><boxGeometry args={[.18,.24,850]}/><meshStandardMaterial color="#758783" metalness={.65} roughness={.4}/></mesh>
   <mesh position={[side*8.7,-.01,-350]}><boxGeometry args={[1.15,.17,850]}/><meshStandardMaterial color="#8b8c81" roughness={.7}/></mesh>
   <mesh position={[side*9.5,.5,-350]}><boxGeometry args={[.25,1,850]}/><meshStandardMaterial color="#626c68" roughness={.9}/></mesh>
   <mesh position={[side*10,-2,-350]}><boxGeometry args={[3,4,850]}/><meshStandardMaterial color="#555b55" roughness={.8}/></mesh>
  </group>)}
  <instancedMesh ref={markings} args={[undefined,undefined,195]}><boxGeometry/><meshStandardMaterial color="#e2dec7" roughness={.6}/></instancedMesh>
  <instancedMesh ref={rails} args={[undefined,undefined,160]}><boxGeometry/><meshStandardMaterial color="#b0b3a4" roughness={.5} metalness={.5}/></instancedMesh>
  <instancedMesh ref={buildings} args={[undefined,undefined,110]}><boxGeometry/><meshStandardMaterial map={textures.facade} emissiveMap={textures.facade} emissive="#d6b284" emissiveIntensity={.18} color="#adb5b5" metalness={.35} roughness={.45}/></instancedMesh>
  <instancedMesh ref={trees} args={[undefined,undefined,56]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#3c5140" roughness={1}/></instancedMesh>
  <instancedMesh ref={trunks} args={[undefined,undefined,56]}><boxGeometry/><meshStandardMaterial color="#514e40" roughness={1}/></instancedMesh>
  <group ref={lamps}>{Array.from({length:22},(_,i)=><group key={i} position={[i%2===0?-8.6:8.6,0,-Math.floor(i/2)*36+20]}>
    <mesh position={[0,4.5,0]}><cylinderGeometry args={[.055,.1,9,6]}/><meshStandardMaterial color="#526763" metalness={.6} roughness={.4}/></mesh>
    <mesh position={[i%2===0?1.1:-1.1,8.95,0]}><boxGeometry args={[2.25,.08,.12]}/><meshStandardMaterial color="#64746e" metalness={.6}/></mesh>
    <mesh position={[i%2===0?2.1:-2.1,8.91,0]}><boxGeometry args={[.6,.06,.25]}/><meshStandardMaterial color="#fff6d2" emissive="#ffe4b4" emissiveIntensity={3}/></mesh>
  </group>)}</group>
  <group ref={sign}>
   {[-8,8].map(x=><mesh key={x} position={[x,5.5,0]}><cylinderGeometry args={[.1,.14,11,8]}/><meshStandardMaterial color="#737e76" metalness={.7}/></mesh>)}
   <mesh position={[0,10.8,0]}><boxGeometry args={[16.2,.12,.15]}/><meshStandardMaterial color="#82918a" metalness={.6}/></mesh>
   <mesh position={[0,9.3,0]}><boxGeometry args={[10,2.5,.15]}/><meshStandardMaterial map={textures.sign} emissiveMap={textures.sign} emissive="#c5dab7" emissiveIntensity={.22} roughness={.7}/></mesh>
  </group>
  <group ref={bridge}>
   <mesh position={[0,9,-20]}><boxGeometry args={[65,2,14]}/><meshStandardMaterial color="#6b7470" roughness={.9}/></mesh>
   {[-12,12].map(x=><mesh key={x} position={[x,4,-20]}><boxGeometry args={[2,10,9]}/><meshStandardMaterial color="#737975" roughness={.9}/></mesh>)}
   <mesh position={[0,10.5,-20]}><boxGeometry args={[65,.6,.2]}/><meshStandardMaterial color="#b2aea0" metalness={.5}/></mesh>
  </group>
 </>;
}
