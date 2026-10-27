import { describe,it,expect } from 'vitest';
import { Engine,lanes } from './engine';
import type { Input } from './engine';
import { vehicles } from '../data/vehicles';
const idle:Input={left:false,right:false,accelerate:false,brake:false,drift:false,nitro:false};
const advance=(e:Engine,seconds:number,keys:Partial<Input>={})=>{for(let i=0;i<seconds*60;i++)e.step(1/60,{...idle,...keys});};
const empty=()=>{const e=new Engine(vehicles[0]);e.traffic.forEach(t=>t.z=-10000);e.tokens.forEach(t=>t.z=-10000);return e;};
describe('arcade simulation',()=>{
 it('accelerates, brakes and awards distance points',()=>{const e=empty();advance(e,2,{accelerate:true});expect(e.speed).toBeGreaterThan(110);expect(e.distance).toBeGreaterThan(45);expect(e.score).toBeGreaterThan(40);advance(e,2,{brake:true});expect(e.speed).toBe(0);});
 it('steers smoothly and returns lateral velocity to centre',()=>{const e=empty();advance(e,.35,{left:true});expect(e.x).toBeLessThan(1);advance(e,1);expect(Math.abs(e.lateral)).toBeLessThan(.01);});
 it('consumes finite nitro, raises top speed, and recharges',()=>{const e=empty();advance(e,3,{accelerate:true,nitro:true});expect(e.nitro).toBeLessThan(30);expect(e.boost).toBe(true);expect(e.speed).toBeGreaterThan(200);advance(e,3);expect(e.nitro).toBeGreaterThan(30);});
 it('collects tokens once, awards cash and scores',()=>{const e=empty();e.tokens[0]={x:e.x,z:-1,active:true,bonus:true};advance(e,.05);expect(e.cash).toBe(50);expect(e.tokens[0].active).toBe(false);const cash=e.cash;advance(e,.05);expect(e.cash).toBe(cash);});
 it('rewards a safe near miss but never a collision',()=>{const e=empty();e.traffic[0]={x:e.x+2,z:4.4,speed:0,kind:0,color:'red',passed:false,hit:false};advance(e,.1);expect(e.near).toBe(1);const other=empty();other.traffic[0]={x:other.x,z:-2,speed:0,kind:0,color:'red',passed:false,hit:false};advance(other,1);expect(other.health).toBeLessThan(100);expect(other.near).toBe(0);});
 it('minor impacts recover; repeated major crashes end the run',()=>{const e=empty();e.impact(true);expect(e.health).toBe(45);e.impact(true);expect(e.health).toBe(45);advance(e,1.6);e.impact(true);expect(e.health).toBe(0);expect(e.dead).toBe(true);const dist=e.distance;advance(e,1);expect(e.distance).toBe(dist);});
 it('pooled entities stay bounded through a long drive',()=>{const e=empty();e.traffic.forEach((t,i)=>{t.z=10+i;t.x=lanes[i%4];});advance(e,180,{accelerate:true});expect(e.traffic).toHaveLength(16);expect(e.tokens).toHaveLength(24);expect(e.particles).toHaveLength(96);expect(e.traffic.every(t=>Number.isFinite(t.z))).toBe(true);});
 it('controlled drifting awards drift score and cash',()=>{const e=empty();e.speed=200;e.x=0;for(let j=0;j<10;j++)advance(e,.4,{accelerate:true,drift:true,left:j%2===0,right:j%2===1});expect(e.driftScore).toBeGreaterThan(150);expect(e.cash).toBeGreaterThan(0);});
 it('swept collision works at high speed and low frame rate',()=>{const e=empty();e.speed=300;e.traffic[0].x=e.x;e.traffic[0].speed=0;e.traffic[0].z=-4;e.step(.05,idle);expect(e.health).toBe(45);});
 it('all six cars have distinct meaningful tuning',()=>{expect(new Set(vehicles.map(v=>v.topSpeed)).size).toBe(6);for(const v of vehicles){const e=new Engine(v);advance(e,2,{accelerate:true});expect(e.speed).toBeGreaterThan(80);expect(e.speed).toBeLessThanOrEqual(v.topSpeed);}});
});
