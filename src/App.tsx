import { Component,useState,useEffect } from 'react';
import type { ReactNode } from 'react';
import { GameScene } from './game/GameScene';
import { useGame } from './store/gameStore';
import { MainMenu } from './components/Menu';
import type { Modal } from './components/Menu';
import { Garage } from './components/Garage';
import { GameHUD,PauseMenu,GameOver,Dialog } from './components/GameUI';
import { useControls } from './components/Controls';
class SceneBoundary extends Component<{children:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<div className="webgl-error"><h2>The 3D scene couldn’t start.</h2><p>Check your connection and enable hardware acceleration, then try again.</p><button className="button primary" onClick={()=>location.reload()}>Try again</button></div>:this.props.children;}}
export default function App(){const phase=useGame(s=>s.phase);const [modal,setModal]=useState<Modal>(null);useControls();useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.code==='Escape'&&modal){e.stopImmediatePropagation();setModal(null);}};window.addEventListener('keydown',onKey,{capture:true});return()=>window.removeEventListener('keydown',onKey,{capture:true});},[modal]);return <div className={`app phase-${phase.toLowerCase()}`}><SceneBoundary><GameScene/></SceneBoundary><div className="scene-vignette"/><div className="scene-grain"/>{phase==='MENU'&&<MainMenu open={setModal}/ >}{phase==='GARAGE'&&<Garage/>}{['COUNTDOWN','PLAYING','PAUSED','CRASHING'].includes(phase)&&<GameHUD/>}{phase==='PAUSED'&&<PauseMenu open={setModal}/ >}{phase==='GAME_OVER'&&<GameOver/>}<Dialog modal={modal} close={()=>setModal(null)}/></div>;}
