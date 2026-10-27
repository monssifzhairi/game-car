import type { Vehicle } from '../data/vehicles';
import type { HUD } from '../store/gameStore';
export type Input={left:boolean;right:boolean;accelerate:boolean;brake:boolean;drift:boolean;nitro:boolean};
export const input:Input={left:false,right:false,accelerate:false,brake:false,drift:false,nitro:false};
export function clearInput(){for(const k of Object.keys(input) as (keyof Input)[])input[k]=false;}
export const presentation={rotation:0};
export const lanes=[-5.25,-1.75,1.75,5.25];
export interface Traffic {x:number;z:number;speed:number;kind:number;color:string;passed:boolean;hit:boolean}
export interface Token {x:number;z:number;active:boolean;bonus:boolean}
export interface Particle {x:number;y:number;z:number;vx:number;vy:number;vz:number;life:number;max:number;kind:number}
const colors=['#e3dacc','#405a63','#8b4e39','#253b36','#827c79','#b2a996'];
export class Engine {
 x=1.75; lateral=0;speed=95;distance=0;score=0;cash=0;nitro=100;health=100;near=0;driftScore=0;maxSpeed=0;boost=false;sliding=false;yaw=0;time=0;invincible=0;shake=0;notice='THE CITY IS YOURS';noticeTime=3;combo=0;mission=false;event='';eventId=0;dead=false;autoDrive=true;collisionCount=0;lastDriftReward=0;
 traffic:Traffic[]=[];tokens:Token[]=[];particles:Particle[]=[];vehicle:Vehicle;
 constructor(vehicle:Vehicle){this.vehicle=vehicle;this.nitro=vehicle.nitro;for(let i=0;i<16;i++)this.traffic.push({x:lanes[(i*3+1)%4],z:-100-i*34,speed:45+(i%5)*8,kind:i%5,color:colors[i%colors.length],passed:false,hit:false});for(let i=0;i<24;i++)this.tokens.push({x:i<4?1.75:lanes[Math.floor(i/4)%4],z:-40-i*18,active:true,bonus:i%9===8});for(let i=0;i<96;i++)this.particles.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,max:1,kind:0});}
 notify(text:string,event=''){this.notice=text;this.noticeTime=2.1;if(event){this.event=event;this.eventId++;}}
 burst(x:number,z:number,kind:number,count=12){let n=0;for(const p of this.particles){if(p.life>0)continue;p.x=x;p.y=.35;p.z=z;p.vx=(Math.random()-.5)*(kind===1?9:3);p.vy=Math.random()*(kind===1?5:1.5);p.vz=Math.random()*6;p.life=p.max=.4+Math.random()*.6;p.kind=kind;if(++n>=count)break;}}
 impact(major:boolean){if(this.invincible>0)return;this.health=Math.max(0,this.health-(major?55:24));this.collisionCount++;this.speed*=major?.35:.68;this.invincible=1.5;this.shake=major?1:.5;this.combo=0;this.burst(this.x,-.4,1,25);this.notify(this.health<=0?'TOTALLED':'IMPACT · KEEP GOING','crash');if(this.health<=0){this.dead=true;}}
 step(rawDt:number,keys:Input){const dt=Math.min(rawDt,.05);if(this.dead){this.tickParticles(dt);this.shake=Math.max(0,this.shake-dt);return;}this.time+=dt;this.invincible=Math.max(0,this.invincible-dt);this.shake=Math.max(0,this.shake-dt*1.8);this.noticeTime=Math.max(0,this.noticeTime-dt);
 const v=this.vehicle;this.boost=keys.nitro&&this.nitro>1&&this.speed>15&&!keys.brake;this.sliding=keys.drift&&(keys.left||keys.right)&&this.speed>55;
 const top=v.topSpeed*(this.boost?1.25:1);const accel=keys.brake?-v.braking:keys.accelerate||this.boost?v.acceleration*(this.boost?1.65:1)*(1-this.speed/(top*1.35)):this.autoDrive&&this.speed<140?v.acceleration*.5:-5;
 this.speed=Math.max(0,Math.min(top,this.speed+accel*dt));if(this.boost)this.nitro=Math.max(0,this.nitro-dt*25);else this.nitro=Math.min(v.nitro,this.nitro+dt*(this.sliding?13:4));
 const steer=Number(keys.right)-Number(keys.left);const sensitivity=(3.1+Math.min(this.speed,200)/42)*(v.handling/8.2);const target=steer*sensitivity*(this.sliding?1.22:1)*Math.min(1,this.speed/20);this.lateral+=(target-this.lateral)*Math.min(1,dt*(this.sliding?3.8:10));this.x+=this.lateral*dt;this.yaw+=(this.lateral*-.035*(this.sliding?2.1:1)-this.yaw)*Math.min(1,dt*8);
 const roadLimit=this.vehicle.collider?8.2-this.vehicle.collider.width/2-.55:6.65;
 if(Math.abs(this.x)>roadLimit){this.x=Math.sign(this.x)*roadLimit;this.lateral*=-.3;if(this.speed>35)this.impact(false);}
 const travel=this.speed/3.6*dt;this.distance+=travel;this.score+=travel*(this.speed>180?2:1);this.maxSpeed=Math.max(this.maxSpeed,this.speed);
 if(this.sliding){const pts=dt*this.speed*.5;this.driftScore+=pts;this.score+=pts;if(this.driftScore-this.lastDriftReward>=150){this.lastDriftReward=this.driftScore;this.cash+=15;this.notify('CONTROLLED DRIFT +150','drift');}if(Math.random()<.5)this.burst(this.x+(Math.random()-.5)*1.4,1.5,0,2);}
 if(this.boost&&Math.random()<.6)this.burst(this.x,2,2,2);
 if(this.distance>1000&&!this.mission){this.mission=true;this.cash+=200;this.score+=1000;this.notify('1 KM CLUB · +$200','pickup');}
 for(const t of this.traffic){const relative=travel-t.speed/3.6*dt;const oldZ=t.z;t.z+=relative;
 // Swept longitudinal interval prevents tunnelling at boost speed and lower frame rates.
 const widthAdjustment=this.vehicle.collider?(this.vehicle.collider.width-1.9)/2:0;
 const lengthAdjustment=this.vehicle.collider?(this.vehicle.collider.length-4.5)/2:0;
 if(!t.hit&&Math.abs(this.x-t.x)<(t.kind===4?1.65:1.5)+widthAdjustment&&t.z>-(t.kind===4?4.2:3.5)-lengthAdjustment&&oldZ<3.4+lengthAdjustment){if(this.invincible<=0){t.hit=true;this.impact(this.speed-t.speed>90);}}
 if(!t.passed&&t.z>4.5){t.passed=true;if(!t.hit&&this.invincible<=0){const gap=Math.abs(t.x-this.x);if(gap>=1.5&&gap<2.8){this.near++;this.combo++;this.score+=150+Math.min(this.combo,5)*25;this.nitro=Math.min(v.nitro,this.nitro+9);this.notify(`NEAR MISS +${150+Math.min(this.combo,5)*25}`,'near');}else this.score+=35;}}
 if(t.z>35){let far=-210-Math.random()*170;let lane=Math.floor(Math.random()*4);for(let tries=0;tries<6;tries++){if(!this.traffic.some(other=>other!==t&&other.x===lanes[lane]&&Math.abs(other.z-far)<32))break;far-=35;lane=(lane+1)%4;}t.z=far;t.x=lanes[lane];t.speed=55+Math.random()*45+Math.min(25,this.distance/300);t.passed=false;t.hit=false;}}
 for(const c of this.tokens){c.z+=travel;if(c.active&&Math.abs(c.z)<2.5&&Math.abs(c.x-this.x)<1.15){c.active=false;this.cash+=c.bonus?50:10;this.score+=c.bonus?250:50;this.nitro=Math.min(v.nitro,this.nitro+(c.bonus?25:3));this.burst(c.x,c.z,3,10);this.notify(c.bonus?'BONUS TOKEN +$50':'CASH +$10','pickup');}if(c.z>25){c.z=-300-Math.random()*180;c.x=lanes[Math.floor(Math.random()*4)];c.active=true;}}
 this.tickParticles(dt);
 }
 tickParticles(dt:number){for(const p of this.particles){if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt+this.speed/3.6*dt*.35;p.vy-=dt*(p.kind===1?8:.3);}}
 hud():HUD{return {speed:this.speed,score:this.score,distance:this.distance,cash:this.cash,nitro:this.nitro/this.vehicle.nitro*100,health:this.health,near:this.near,drift:this.driftScore,maxSpeed:this.maxSpeed,notice:this.noticeTime>0?this.notice:'',combo:this.combo};}
}
