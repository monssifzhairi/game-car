import {useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {create} from 'zustand';
import {useGame} from '../store/gameStore';
export const useRenderStats=create<{fps:number;dpr:number;calls:number}>(()=>({fps:0,dpr:1,calls:0}));
export function RenderQuality(){
 const {setDpr,gl}=useThree();const elapsed=useRef(0),frames=useRef(0),adjust=useRef(0),ratio=useRef(1.2),previous=useRef('');
 useFrame((_,dt)=>{const s=useGame.getState(),quality=s.save.quality;
  if(previous.current!==quality){previous.current=quality;ratio.current=quality==='high'?Math.min(window.devicePixelRatio,1.35):.85;setDpr(ratio.current);}
  elapsed.current+=dt;frames.current++;adjust.current+=dt;
  if(elapsed.current>=1){const fps=Math.round(frames.current/elapsed.current);useRenderStats.setState({fps,dpr:ratio.current,calls:gl.info.render.calls});
   if(s.phase==='PLAYING'&&quality==='high'&&adjust.current>3){const next=fps<38?Math.max(.8,ratio.current-.15):fps>58?Math.min(1.35,window.devicePixelRatio,ratio.current+.05):ratio.current;if(next!==ratio.current){ratio.current=next;setDpr(next);}adjust.current=0;}
   elapsed.current=0;frames.current=0;
  }
 });return null;
}
