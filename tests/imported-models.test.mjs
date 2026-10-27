import {it,expect} from 'vitest';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {prepareImportedRig} from '../src/game/importedRig.ts';
async function loadGeometry(file){const bytes=fs.readFileSync(`public/models/${file}.glb`),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
 for(const m of json.materials){for(const k of Object.keys(m))if(k.includes('Texture'))delete m[k];for(const k of Object.keys(m.pbrMetallicRoughness||{}))if(k.includes('Texture'))delete m.pbrMetallicRoughness[k];for(const e of Object.values(m.extensions||{}))for(const k of Object.keys(e))if(k.includes('Texture'))delete e[k];}delete json.textures;delete json.images;
 const b=Buffer.from(JSON.stringify(json)),pad=Buffer.alloc(Math.ceil(b.length/4)*4,32);b.copy(pad);const bin=bytes.subarray(20+length),out=Buffer.alloc(20+pad.length+bin.length);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(pad.length,12);out.writeUInt32LE(0x4e4f534a,16);pad.copy(out,20);bin.copy(out,20+pad.length);
 return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(out.buffer,'')).scene;
}
const manifest=JSON.parse(fs.readFileSync('public/models/manifest.json'));
for(const [id,file,length,wheels] of [['bmw','bmw',4.55,4],['mercedes','mrc140',5.05,0],['supra','supra',4.65,4]]){
 it(`loads the real optimized ${id} with a local decoder, correct size and wheel structure`,async()=>{const source=await loadGeometry(file),rig=prepareImportedRig(source,id);let triangles=0;rig.root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});expect(triangles).toBe(manifest[file].triangles);expect(rig.wheels).toHaveLength(wheels);const bounds=new THREE.Box3().setFromObject(rig.root,true),size=bounds.getSize(new THREE.Vector3());expect(size.z).toBeCloseTo(length,3);expect(size.x).toBeGreaterThan(1.7);expect(size.x).toBeLessThan(2.2);expect(bounds.min.y).toBeCloseTo(0,3);expect(rig.root.rotation.y).toBe(Math.PI);for(const wheel of rig.wheels){expect(wheel.radius).toBeGreaterThan(.25);expect(wheel.radius).toBeLessThan(.5);}rig.dispose();});
 it(`reduces ${id} download size without mutating source files`,()=>{expect(manifest[file].optimizedBytes).toBeLessThan(manifest[file].sourceBytes*.7);expect(fs.statSync(`3d/${file}.glb`).size).toBe(manifest[file].sourceBytes);});
}
it('keeps original BMW and Supra triangle counts; conservatively simplifies Mercedes',()=>{expect(manifest.bmw.triangles).toBe(71421);expect(manifest.supra.triangles).toBe(29980);expect(manifest.mrc140.triangles).toBeGreaterThan(170000);expect(manifest.mrc140.triangles).toBeLessThan(223405);});
