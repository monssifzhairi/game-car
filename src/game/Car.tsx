import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vehicle } from '../data/vehicles';
export function shell(rings:number[][]){const verts:number[]=[],indices:number[]=[];for(const [z,w,b,t] of rings){const bevel=.10;verts.push(-w+bevel,b,z,w-bevel,b,z,w,b+bevel,z,w,t-bevel,z,w-bevel,t,z,-w+bevel,t,z,-w,t-bevel,z,-w,b+bevel,z);}for(let r=0;r<rings.length-1;r++)for(let j=0;j<8;j++){const a=r*8+j,b=r*8+(j+1)%8,c=(r+1)*8+j,d=(r+1)*8+(j+1)%8;indices.push(a,b,c,b,d,c);}for(let j=1;j<7;j++){indices.push(0,j+1,j);const a=(rings.length-1)*8;indices.push(a,a+j,a+j+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();return g;}
export function Car({vehicle,color,traffic=false,motion,boost=false}:{vehicle:Vehicle;color:string;traffic?:boolean;motion?:{speed:number;steer:number;sliding:boolean};boost?:boolean}){
 const wheels=useRef<THREE.Group[]>([]);const front=useRef<THREE.Group[]>([]);
 const suv=vehicle.shape==='suv',sedan=vehicle.shape==='sedan',supercar=vehicle.shape==='super',sport=vehicle.shape==='sport';
 const len=sedan?2.7:suv?2.5:supercar?2.5:vehicle.id==='veloce'?2.55:sport?2.2:2.35,w=supercar?1.02:sport?.91:.94,h=suv?.38:supercar?-.16:0;
 const body=useMemo(()=>shell([[-len,.78,.35,.68+h],[-len+.24,w,.28,.83+h],[-1.25,w,.27,.97+h],[.9,w,.27,.96+h],[len-.2,w*.98,.32,.86+h],[len,.82,.40,.78+h]]),[len,w,h]);
 const cabin=useMemo(()=>shell([[-1.15,.77,.86+h,.98+h],[-.37,.72,.9+h,1.39+h+(suv?.25:0)],[.85,.73,.90+h,1.41+h+(suv?.25:0)],[sedan?1.65:1.42,.77,.85+h,1.02+h]]),[h,suv,sedan]);
 useEffect(()=>()=>{body.dispose();cabin.dispose();},[body,cabin]);
 useFrame((_,dt)=>{if(!motion)return;for(const wheel of wheels.current)if(wheel)wheel.rotation.x-=motion.speed/3.6*dt/.35;for(const wheel of front.current)if(wheel)wheel.rotation.y=-motion.steer*.035;});
 const tireRadius=suv?.43:.36;
 return <group scale={traffic?.95:1}>
  <mesh geometry={body} castShadow receiveShadow><meshPhysicalMaterial color={color} metalness={.78} roughness={.24} clearcoat={1} clearcoatRoughness={.16}/></mesh>
  <mesh geometry={cabin} castShadow><meshPhysicalMaterial color="#101d24" metalness={.72} roughness={.13}/></mesh>
  <mesh position={[0,1.415+h+(suv?.25:0),.26]} castShadow><boxGeometry args={[1.36,.045,1.08]}/><meshStandardMaterial color={supercar?'#18282b':color} metalness={.75} roughness={.25}/></mesh>
  {[-1,1].map(side=><group key={side}>
   <mesh position={[side*.755,1.15+h,.53]} rotation={[0,0,side*-.05]}><boxGeometry args={[.045,.48,.065]}/><meshStandardMaterial color={color} metalness={.7} roughness={.3}/></mesh>
   <mesh position={[side*(w+.06),.99+h,-.55]} castShadow><boxGeometry args={[.25,.12,.3]}/><meshStandardMaterial color={color} metalness={.75} roughness={.22}/></mesh>
   <mesh position={[side*(w+.006),.60+h,.45]}><boxGeometry args={[.015,.035,.25]}/><meshStandardMaterial color="#b9c6c7" metalness={1} roughness={.2}/></mesh>
   <mesh position={[side*(w+.005),.38,.05]}><boxGeometry args={[.05,.1,3.2]}/><meshStandardMaterial color="#172023" metalness={.6} roughness={.4}/></mesh>
   <mesh position={[side*.64,.43+h,-len-.024]}><boxGeometry args={[.42,.13,.035]}/><meshStandardMaterial color="#142024" metalness={.6} roughness={.35}/></mesh>
   <mesh position={[side*.46,.845+h,-1.7]} rotation={[-.08,side*.06,0]}><boxGeometry args={[.025,.012,.85]}/><meshStandardMaterial color={color} metalness={.85} roughness={.2}/></mesh>
   <mesh position={[side*.65,.68+h,-len-.012]} rotation={[0,0,side*.06]}><boxGeometry args={[.42,.065,.035]}/><meshStandardMaterial color="#ecf9ff" emissive="#d5efff" emissiveIntensity={4}/></mesh>
   <mesh position={[side*.73,.64+h,-len-.02]}><boxGeometry args={[.035,.12,.04]}/><meshStandardMaterial color="#edf9ff" emissive="#c5e9ff" emissiveIntensity={3}/></mesh>
   <mesh position={[side*.61,.73+h,len+.012]}><boxGeometry args={[.48,.055,.035]}/><meshStandardMaterial color="#ff331d" emissive="#ff2910" emissiveIntensity={3}/></mesh>
   <mesh position={[side*.58,.32,len+.06]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.1,.1,.16,12]}/><meshStandardMaterial color="#161d1e" metalness={.9} roughness={.25}/></mesh>
   {boost&&<mesh position={[side*.58,.32,len+.28]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.13,.65,8]}/><meshBasicMaterial color="#71fce1" transparent opacity={.8}/></mesh>}
   {[-1.47,1.48].map((z,index)=><group key={z} position={[side*(w-.015),tireRadius,z]} ref={el=>{if(index===0&&el)front.current[side===-1?0:1]=el;}}><group ref={el=>{if(el)wheels.current[(side===-1?0:2)+index]=el;}}>
     <mesh rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[tireRadius,tireRadius,.27,traffic?12:24]}/><meshStandardMaterial color="#111618" roughness={.88}/></mesh>
     <mesh position={[side*.145,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[tireRadius*.77,tireRadius*.77,.02,traffic?12:24]}/><meshStandardMaterial color="#9da9aa" metalness={.92} roughness={.22}/></mesh>
     <mesh position={[side*.16,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[tireRadius*.62,tireRadius*.62,.026,16]}/><meshStandardMaterial color="#222c2f" metalness={.85} roughness={.3}/></mesh>
     {!traffic&&Array.from({length:5},(_,i)=><mesh key={i} position={[side*.18,0,0]} rotation={[i*Math.PI/5,0,0]}><boxGeometry args={[.03,tireRadius*1.4,.035]}/><meshStandardMaterial color="#c4cdcf" metalness={.9} roughness={.23}/></mesh>)}
     <mesh position={[side*.19,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.075,.075,.03,12]}/><meshStandardMaterial color="#94a7a5" metalness={1} roughness={.2}/></mesh>
   </group></group>)}
  </group>)}
  <mesh position={[0,.50+h,-len-.018]}><boxGeometry args={[sedan?1.05:.7,sedan?.33:.18,.035]}/><meshStandardMaterial color="#101718" metalness={.65} roughness={.3}/></mesh>
  {Array.from({length:sedan?9:5},(_,i)=><mesh key={i} position={[(i-(sedan?4:2))*.09,.50+h,-len-.045]}><boxGeometry args={[.015,sedan?.29:.12,.012]}/><meshStandardMaterial color="#8b9b99" metalness={1} roughness={.2}/></mesh>)}
  <mesh position={[0,.45+h,len+.022]}><boxGeometry args={[.44,.12,.025]}/><meshStandardMaterial color="#d1d5c7" roughness={.4}/></mesh>
  <mesh position={[0,.14,0]} receiveShadow><boxGeometry args={[1.65,.12,len*1.85]}/><meshStandardMaterial color="#101819" roughness={.8}/></mesh>
  {(supercar||sport)&&<mesh position={[0,1.02,len-.25]} castShadow><boxGeometry args={[1.85,.07,.27]}/><meshStandardMaterial color={color} metalness={.8} roughness={.25}/></mesh>}
 </group>;
}
