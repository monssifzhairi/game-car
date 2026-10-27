import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, meshopt, textureCompress, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
await fs.mkdir('public/models',{recursive:true});
const report={};
for(const file of ['bmw','mrc140','supra']){
 const doc=await io.read(`3d/${file}.glb`);
 for(const animation of [...doc.getRoot().listAnimations()]) animation.dispose();
 await doc.transform(dedup(),weld());
 if(file==='mrc140')await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:.55,error:.0003,lockBorder:true}));
 await doc.transform(
  textureCompress({encoder:sharp,targetFormat:'webp',slots:/normalTexture|metallicRoughnessTexture|occlusionTexture/,lossless:true,effort:70}),
  textureCompress({encoder:sharp,targetFormat:'webp',formats:/png|jpeg/,quality:94,effort:70}),
  meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:10,quantizeTexcoord:14})
 );
 await io.write(`public/models/${file}.glb`,doc);
 let triangles=0;for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;
 report[file]={sourceBytes:(await fs.stat(`3d/${file}.glb`)).size,optimizedBytes:(await fs.stat(`public/models/${file}.glb`)).size,triangles};
 console.log(file,report[file]);
}
await fs.writeFile('public/models/manifest.json',JSON.stringify(report,null,2)+'\n');
