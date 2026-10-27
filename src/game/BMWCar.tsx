import { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useProgress } from '@react-three/drei';
import { create } from 'zustand';
import * as THREE from 'three';
import modelUrl from '../../3d/bmw.glb?url';
import { BMW_MODEL, prepareBMW } from './bmwModel';
import { useGame } from '../store/gameStore';

export interface VehicleMotion { speed: number; steer: number; sliding: boolean; boosting?: boolean }
type AssetState = { status: 'loading' | 'ready' | 'error'; message: string; attempt: number };
export const useBMWAsset = create<AssetState>(() => ({ status: 'loading', message: '', attempt: 0 }));

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { useBMWAsset.setState({ status: 'error', message: error.message }); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Model({ color, motion }: { color: string; motion?: VehicleMotion }) {
  // This GLB needs no Draco/Meshopt decoder or external textures.
  const { scene } = useGLTF(modelUrl, false, false);
  const rig = useMemo(() => prepareBMW(scene), [scene]);
  const flames = useRef<THREE.Group>(null);
  const quality = useGame(state => state.save.quality);
  const steering = useRef(0);
  useEffect(() => {
    useBMWAsset.setState({ status: 'ready', message: '' });
    return () => rig.dispose();
  }, [rig]);
  useEffect(() => {
    if (color.toLowerCase() === BMW_MODEL.factoryPaint) rig.paint.color.copy(rig.originalPaint);
    else rig.paint.color.set(color);
  }, [color, rig]);
  useEffect(() => {
    // Only the lamp-lens material uses transmission in the source. Preserve it
    // in High; avoid the extra refractive scene pass in Performance mode.
    rig.lens.transmission = quality === 'high' ? rig.originalTransmission : 0;
    rig.lens.needsUpdate = true;
  }, [quality, rig]);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, .05);
    const phase = useGame.getState().phase;
    const paused = ['PAUSED', 'CRASHING', 'GAME_OVER'].includes(phase);
    if (!paused) {
      const target = motion ? THREE.MathUtils.clamp(-motion.steer * .045, -.40, .40) : 0;
      steering.current = THREE.MathUtils.damp(steering.current, target, 12, dt);
      for (const wheel of rig.wheels) {
        // Root rotates PI around Y, so local +X is world -X.
        wheel.rolling.rotation.x += (motion?.speed ?? 0) / 3.6 * dt / wheel.radius;
        if (wheel.front) wheel.steering.rotation.y = steering.current;
      }
    }
    if (flames.current) {
      flames.current.visible = phase === 'PLAYING' && !!motion?.boosting;
      flames.current.scale.z = 1 + Math.sin(performance.now() * .035) * .16;
    }
  });
  return <group>
    <primitive object={rig.root} dispose={null} />
    <group ref={flames} visible={false} name="BMW_nitro_exhaust">
      {[.54, .68].map(x => <mesh key={x} position={[x, .22, BMW_MODEL.length / 2 + .12]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[.07, .6, 8]} />
        <meshBasicMaterial color="#77ffe1" transparent opacity={.85} depthWrite={false} />
      </mesh>)}
    </group>
  </group>;
}

export function BMWCar(props: { color: string; motion?: VehicleMotion }) {
  const attempt = useBMWAsset(state => state.attempt);
  return <ModelBoundary key={attempt}><Suspense fallback={null}><Model {...props} /></Suspense></ModelBoundary>;
}

export function BMWLoadingOverlay() {
  const selected = useGame(state => state.save.selected);
  const status = useBMWAsset(state => state.status);
  const message = useBMWAsset(state => state.message);
  const { progress, loaded, total } = useProgress();
  if (selected !== 'apex' || status === 'ready') return null;
  const failed = status === 'error';
  return <div className="model-loading-overlay" role={failed ? 'alert' : 'status'} aria-live="polite" data-model="bmw-m3-e30" data-load-state={status}>
    <div className="model-loading-panel">
      <span className="eyebrow">YOUR ORIGINAL BMW MODEL</span>
      <h2>{failed ? 'The BMW couldn’t load.' : 'Preparing your M3 E30.'}</h2>
      <p>{failed ? 'The game will not substitute a placeholder. Check your connection, then retry the original model.' : 'Loading the real vehicle, its embedded textures, and four animated wheel assemblies.'}</p>
      {!failed && <><div className="model-loading-track"><i style={{ width: `${Math.max(3, Math.min(99, progress))}%` }} /></div><small>{progress >= 99 ? 'PREPARING MATERIALS & WHEELS' : `${Math.round(progress)}% · LOADING 3d/bmw.glb`}{total > 0 && ` · ${loaded}/${total}`}</small></>}
      {failed && <><code>{message}</code><button className="button primary" onClick={() => {
        useGLTF.clear(modelUrl);
        useBMWAsset.setState(state => ({ status: 'loading', message: '', attempt: state.attempt + 1 }));
      }}>Retry BMW model <span>↗</span></button></>}
    </div>
  </div>;
}
