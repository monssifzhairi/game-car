import * as THREE from 'three';

/** Verified from 3d/bmw.glb, not inferred from generic wheel-name patterns. */
export const BMW_MODEL = {
  factoryPaint: '#b81a1a',
  length: 4.55,
  sourceFront: '+Z',
  paintMaterial: 'BMW_E30_M3_PAINT',
  tireMaterial: 'BMW_E30_M3_TIRE',
  lensMaterial: 'BMW_E30_M3_LENS',
  wheelMaterials: ['BMW_E30_M3_RIM', 'BMW_E30_M3_TIRE', 'Brake_Disc', 'Brembo_Calipers'],
} as const;

export interface BMWRig {
  root: THREE.Group;
  wheels: { steering: THREE.Group; rolling: THREE.Group; front: boolean; radius: number }[];
  paint: THREE.MeshPhysicalMaterial;
  lens: THREE.MeshPhysicalMaterial;
  originalPaint: THREE.Color;
  originalTransmission: number;
  bounds: THREE.Box3;
  dispose: () => void;
}

function materialName(mesh: THREE.Mesh): string {
  return Array.isArray(mesh.material) ? '' : mesh.material.name;
}

/** Expand quantized attributes before applying transforms: writing world coordinates
 * back into normalized int16 attributes would clamp/wrap and corrupt the wheels. */
function floatGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const values = new Float32Array(attribute.count * attribute.itemSize);
    for (let i = 0; i < attribute.count; i++) {
      for (let c = 0; c < attribute.itemSize; c++) values[i * attribute.itemSize + c] = attribute.getComponent(i, c);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
  }
  if (source.index) geometry.setIndex(source.index.clone());
  return geometry;
}

/** Keep vertices/UVs/normals intact and remap only the indices of each wheel. */
function extractPart(source: THREE.BufferGeometry, indices: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const remap = new Map<number, number>();
  for (const index of indices) if (!remap.has(index)) remap.set(index, remap.size);
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const values = new Float32Array(remap.size * attribute.itemSize);
    for (const [oldIndex, newIndex] of remap) {
      for (let c = 0; c < attribute.itemSize; c++) values[newIndex * attribute.itemSize + c] = attribute.getComponent(oldIndex, c);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
  }
  geometry.setIndex(indices.map(index => remap.get(index)!));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function prepareBMW(source: THREE.Group): BMWRig {
  const content = source.clone(true);
  content.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(content, true);
  const size = sourceBounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.z) || size.z < 1) throw new Error('BMW geometry has invalid dimensions.');
  const scale = BMW_MODEL.length / size.z;
  const center = sourceBounds.getCenter(new THREE.Vector3());
  const meshes: THREE.Mesh[] = [];
  content.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
  const tire = meshes.find(mesh => materialName(mesh) === BMW_MODEL.tireMaterial);
  const paintMesh = meshes.find(mesh => materialName(mesh) === BMW_MODEL.paintMaterial);
  const lensMesh = meshes.find(mesh => materialName(mesh) === BMW_MODEL.lensMaterial);
  if (!tire || !paintMesh || !lensMesh) throw new Error('The uploaded BMW material/hierarchy no longer matches the inspected asset.');
  const paint = (paintMesh.material as THREE.MeshPhysicalMaterial).clone();
  const lens = (lensMesh.material as THREE.MeshPhysicalMaterial).clone();
  paintMesh.material = paint;
  lensMesh.material = lens;
  const originalPaint = paint.color.clone();
  const originalTransmission = lens.transmission;

  const position = new THREE.Vector3();
  const tirePositions = tire.geometry.getAttribute('position');
  const quadrants = Array.from({ length: 4 }, () => new THREE.Box3());
  for (let i = 0; i < tirePositions.count; i++) {
    position.fromBufferAttribute(tirePositions, i).applyMatrix4(tire.matrixWorld);
    quadrants[(position.x > 0 ? 1 : 0) + (position.z > 0 ? 2 : 0)].expandByPoint(position);
  }
  if (quadrants.some(box => box.isEmpty())) throw new Error('Could not identify all four BMW tire clusters.');
  const wheels = quadrants.map((box, index) => {
    const steering = new THREE.Group();
    steering.name = `BMW_${index >= 2 ? 'front' : 'rear'}_${index % 2 ? 'right' : 'left'}_steering`;
    steering.position.copy(box.getCenter(new THREE.Vector3()));
    const rolling = new THREE.Group();
    rolling.name = `${steering.name}_rolling`;
    steering.add(rolling);
    content.add(steering);
    return { steering, rolling, front: index >= 2, radius: (box.max.y - box.min.y) * scale / 2 };
  });
  // Front wheels in the source are posed at -0.500837 radians. Neutralize that
  // authored pose around each tire centre, then let the controller steer them.
  const authoredFrontYaw = new THREE.Euler().setFromQuaternion(tire.quaternion, 'YXZ').y;
  const ownedGeometry: THREE.BufferGeometry[] = [];
  let wheelParts = 0;
  for (const mesh of meshes) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (!(BMW_MODEL.wheelMaterials as readonly string[]).includes(materialName(mesh))) continue;
    const geometry = floatGeometry(mesh.geometry).applyMatrix4(mesh.matrixWorld);
    const positions = geometry.getAttribute('position');
    const index = geometry.index;
    const indices = Array.from({ length: 4 }, () => [] as number[]);
    for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
      const a = index ? index.getX(i) : i;
      const b = index ? index.getX(i + 1) : i + 1;
      const c = index ? index.getX(i + 2) : i + 2;
      const x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3;
      const z = (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3;
      const quadrant = (x > 0 ? 1 : 0) + (z > 0 ? 2 : 0);
      // Each source wheel is spatially disconnected. Reject a changed asset
      // rather than silently stretching a triangle across separate pivots.
      for (const vertex of [a, b, c]) {
        if ((positions.getX(vertex) > 0 ? 1 : 0) + (positions.getZ(vertex) > 0 ? 2 : 0) !== quadrant) {
          throw new Error('BMW wheel triangles cross cluster boundaries.');
        }
      }
      indices[quadrant].push(a, b, c);
    }
    indices.forEach((partIndices, i) => {
      if (!partIndices.length) throw new Error(`Missing BMW wheel part: ${materialName(mesh)}.`);
      const wheel = wheels[i];
      const part = extractPart(geometry, partIndices);
      part.translate(-wheel.steering.position.x, -wheel.steering.position.y, -wheel.steering.position.z);
      if (wheel.front) part.rotateY(-authoredFrontYaw);
      part.computeBoundingBox();
      part.computeBoundingSphere();
      ownedGeometry.push(part);
      const object = new THREE.Mesh(part, mesh.material);
      object.name = `${materialName(mesh)}_${i}`;
      object.castShadow = true;
      object.receiveShadow = true;
      // Calipers follow steering, but do not rotate with the tires/discs.
      (materialName(mesh) === 'Brembo_Calipers' ? wheel.steering : wheel.rolling).add(object);
      wheelParts++;
    });
    geometry.dispose();
    mesh.removeFromParent();
  }
  if (wheelParts !== 16) throw new Error('BMW wheel assembly is incomplete.');
  content.position.set(-center.x, -sourceBounds.min.y, -center.z);
  const root = new THREE.Group();
  root.name = 'BMW_M3_E30';
  root.rotation.y = Math.PI; // Source front +Z -> game forward -Z.
  root.scale.setScalar(scale);
  root.add(content);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root, true);
  root.userData = { asset: '3d/bmw.glb', wheelCount: wheels.length, frontAxis: '-Z', length: BMW_MODEL.length };
  return {
    root, wheels, paint, lens, originalPaint, originalTransmission, bounds,
    dispose: () => { ownedGeometry.forEach(geometry => geometry.dispose()); paint.dispose(); lens.dispose(); },
  };
}
