import * as THREE from 'three';
import { prepareBMW, floatGeometry, extractPart } from './bmwModel';
import type { ModelId } from './modelLoader';
export interface ImportedRig {
 root:THREE.Group;
 wheels:{steering:THREE.Group;rolling:THREE.Group;front:boolean;radius:number}[];
 paint?:THREE.MeshStandardMaterial;
 originalPaint?:THREE.Color;
 transmission:{material:THREE.MeshPhysicalMaterial;original:number}[];
 dispose:()=>void;
}
export function prepareImportedRig(source:THREE.Group,id:ModelId):ImportedRig{
 if(id==='bmw'){const rig=prepareBMW(source);return {...rig,transmission:[{material:rig.lens,original:rig.originalTransmission}]};}
 const content=source.clone(true);content.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(content,true),size=box.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.z)||size.z<1)throw new Error(`Invalid ${id} dimensions.`);
 const length=id==='mercedes'?5.05:4.65,scale=length/size.z;
 const meshes:THREE.Mesh[]=[];content.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});
 const ownedGeometries:THREE.BufferGeometry[]=[],ownedMaterials:THREE.Material[]=[];
 const transmission:ImportedRig['transmission']=[];
 let paint:THREE.MeshStandardMaterial|undefined;
 for(const mesh of meshes){mesh.castShadow=true;mesh.receiveShadow=true;
  const material=mesh.material as THREE.MeshPhysicalMaterial;
  if(material.name==='carpaint'){paint=material.clone();mesh.material=paint;ownedMaterials.push(paint);}
  if(material.transmission>0){const clone=material.clone();mesh.material=clone;ownedMaterials.push(clone);transmission.push({material:clone,original:clone.transmission});}
 }
 const wheels:ImportedRig['wheels']=[];
 if(id==='supra'){
  // Inspected source: Object_18/rubber.002, Object_19/wheel_metal.001,
  // Object_10/brake_disc and Object_11/brake_disc1 contain four disconnected wheels.
  const tire=meshes.find(m=>(m.material as THREE.Material).name==='rubber.002');
  if(!tire)throw new Error('Supra tire material is missing.');
  const bounds=Array.from({length:4},()=>new THREE.Box3()),v=new THREE.Vector3();
  const positions=tire.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(tire.matrixWorld);bounds[(v.x>0?1:0)+(v.z>0?2:0)].expandByPoint(v);}
  bounds.forEach((b,i)=>{if(b.isEmpty())throw new Error('Incomplete Supra wheel cluster.');const steering=new THREE.Group();steering.position.copy(b.getCenter(new THREE.Vector3()));steering.name=`Supra_${i>=2?'front':'rear'}_${i%2?'right':'left'}_steering`;const rolling=new THREE.Group();rolling.name=steering.name+'_rolling';steering.add(rolling);content.add(steering);wheels.push({steering,rolling,front:i>=2,radius:(b.max.y-b.min.y)*scale/2});});
  for(const mesh of meshes){const name=(mesh.material as THREE.Material).name;if(!['rubber.002','wheel_metal.001','brake_disc','brake_disc1'].includes(name))continue;
   const geometry=floatGeometry(mesh.geometry).applyMatrix4(mesh.matrixWorld),p=geometry.getAttribute('position'),idx=geometry.index;
   const parts=Array.from({length:4},()=>[] as number[]);
   for(let i=0;i<(idx?.count??p.count);i+=3){const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;const x=(p.getX(a)+p.getX(b)+p.getX(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;parts[(x>0?1:0)+(z>0?2:0)].push(a,b,c);}
   parts.forEach((indices,i)=>{if(!indices.length)throw new Error('Missing Supra wheel triangles.');const g=extractPart(geometry,indices),wheel=wheels[i];g.translate(-wheel.steering.position.x,-wheel.steering.position.y,-wheel.steering.position.z);g.computeBoundingSphere();ownedGeometries.push(g);const part=new THREE.Mesh(g,mesh.material);part.name=name+'_'+i;part.castShadow=true;(name==='brake_disc1'?wheel.steering:wheel.rolling).add(part);});geometry.dispose();mesh.removeFromParent();
  }
 }
 // Mercedes source has three fully merged palette meshes, without independent
 // wheel geometry. Preserve it intact rather than cutting fenders or inventing wheels.
 const center=box.getCenter(new THREE.Vector3());content.position.set(-center.x,-box.min.y,-center.z);
 const root=new THREE.Group();root.name=id==='mercedes'?'Mercedes_W140':'Toyota_Supra';root.scale.setScalar(scale);root.rotation.y=Math.PI;root.add(content);root.updateMatrixWorld(true);
 root.userData={asset:`3d/${id==='mercedes'?'mrc140':'supra'}.glb`,wheelCount:wheels.length,frontAxis:'-Z',length};
 return {root,wheels,paint,originalPaint:paint?.color.clone(),transmission,dispose:()=>{ownedGeometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());}};
}
