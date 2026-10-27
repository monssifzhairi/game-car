import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareBMW, BMW_MODEL } from '../src/game/bmwModel.ts';

const bytes = readFileSync(new URL('../3d/bmw.glb', import.meta.url));
const jsonLength = bytes.readUInt32LE(12);
const metadata = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());

async function sourceWithoutImageDecode() {
  // Node tests inspect the real GLB geometry. Only texture references are
  // removed in memory because Node has no PNG/createImageBitmap implementation.
  // Browser tests separately load and render the untouched GLB and all textures.
  const json = structuredClone(metadata);
  for (const material of json.materials) {
    for (const key of Object.keys(material)) if (key.includes('Texture')) delete material[key];
    for (const key of Object.keys(material.pbrMetallicRoughness || {})) if (key.includes('Texture')) delete material.pbrMetallicRoughness[key];
    for (const extension of Object.values(material.extensions || {})) for (const key of Object.keys(extension)) if (key.includes('Texture')) delete extension[key];
  }
  delete json.textures;
  delete json.images;
  const serialized = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(serialized.length / 4) * 4, 32);
  serialized.copy(padded);
  const bin = bytes.subarray(20 + jsonLength);
  const glb = Buffer.alloc(20 + padded.length + bin.length);
  glb.write('glTF'); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(padded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(glb, 20); bin.copy(glb, 20 + padded.length);
  return (await new GLTFLoader().parseAsync(glb.buffer, '')).scene;
}
function triangles(root) {
  let count = 0;
  root.traverse(object => { if (object.isMesh) count += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3; });
  return count;
}

describe('actual uploaded BMW GLB', () => {
  it('is a self-contained GLB 2.0, with embedded textures and CC BY attribution', () => {
    expect(bytes.toString('ascii', 0, 4)).toBe('glTF');
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(metadata.images).toHaveLength(20);
    expect(metadata.images.every(image => !image.uri && image.bufferView !== undefined)).toBe(true);
    expect(metadata.buffers.every(buffer => !buffer.uri)).toBe(true);
    expect(metadata.asset.extras.title).toContain('BMW M3 E30');
    expect(metadata.asset.extras.license).toContain('CC-BY-4.0');
    expect(metadata.extensionsRequired).toEqual(['KHR_mesh_quantization']);
  });
  it('preserves all 71,421 original triangles and fits the existing road/controller', async () => {
    const source = await sourceWithoutImageDecode();
    const rig = prepareBMW(source);
    expect(triangles(source)).toBe(71421);
    expect(triangles(rig.root)).toBe(triangles(source));
    expect(rig.bounds.getSize(new THREE.Vector3()).z).toBeCloseTo(4.55, 4);
    expect(rig.bounds.getSize(new THREE.Vector3()).x).toBeLessThan(1.95);
    expect(rig.bounds.min.y).toBeCloseTo(0, 5);
    expect(rig.bounds.getCenter(new THREE.Vector3()).z).toBeCloseTo(0, 5);
    expect(source.children).toHaveLength(10);
    rig.dispose();
  });
  it('recovers four complete wheels, neutralizes the source front pose, and faces -Z', async () => {
    const rig = prepareBMW(await sourceWithoutImageDecode());
    expect(rig.wheels).toHaveLength(4);
    expect(rig.wheels.filter(wheel => wheel.front)).toHaveLength(2);
    for (const wheel of rig.wheels) {
      expect(wheel.rolling.children).toHaveLength(3);
      expect(wheel.steering.children.filter(child => child.name.startsWith('Brembo_Calipers'))).toHaveLength(1);
      expect(wheel.radius).toBeGreaterThan(.3);
      expect(wheel.radius).toBeLessThan(.35);
      const tire = wheel.rolling.children.find(child => child.name.startsWith(BMW_MODEL.tireMaterial));
      const size = tire.geometry.boundingBox.getSize(new THREE.Vector3());
      expect(size.x).toBeLessThan(.28); // Tire axis is +X, not the source's posed diagonal.
      expect(size.z).toBeGreaterThan(.60);
      const worldCenter = wheel.steering.getWorldPosition(new THREE.Vector3());
      expect(wheel.front ? worldCenter.z < 0 : worldCenter.z > 0).toBe(true);
    }
    rig.dispose();
  });
  it('keeps original factory paint/lens values and shared source resources unmodified', async () => {
    const source = await sourceWithoutImageDecode();
    const originalPaint = source.children.find(mesh => mesh.material?.name === BMW_MODEL.paintMaterial).material;
    const originalLens = source.children.find(mesh => mesh.material?.name === BMW_MODEL.lensMaterial).material;
    const rig = prepareBMW(source);
    expect(rig.paint).not.toBe(originalPaint);
    expect(rig.paint.color.getHexString()).toBe('b81a1a');
    expect(rig.originalTransmission).toBe(originalLens.transmission);
    rig.paint.color.set('#155b48');
    rig.lens.transmission = 0;
    expect(originalPaint.color.getHexString()).toBe('b81a1a');
    expect(originalLens.transmission).toBeGreaterThan(.95);
    rig.dispose();
  });
  it('rejects mismatched models rather than silently displaying a substitute', () => {
    expect(() => prepareBMW(new THREE.Group())).toThrow('invalid dimensions');
  });
});
