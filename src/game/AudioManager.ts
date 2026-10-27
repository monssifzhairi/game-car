class AudioManager {
 ctx:AudioContext|null=null; engine:OscillatorNode|null=null; gain:GainNode|null=null; enabled=true; lastBoost=false;
 init(){if(this.ctx){if(this.ctx.state==='suspended')void this.ctx.resume();return;}try{this.ctx=new AudioContext();this.engine=this.ctx.createOscillator();this.gain=this.ctx.createGain();this.engine.type='sawtooth';this.engine.frequency.value=35;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=320;this.gain.gain.value=0;this.engine.connect(filter).connect(this.gain).connect(this.ctx.destination);this.engine.start();}catch{this.ctx=null;}}
 tone(frequency:number,duration=.15,type:OscillatorType='sine',volume=.06,end=frequency){if(!this.ctx||!this.enabled)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+duration);o.onended=()=>{o.disconnect();g.disconnect();};}
 update(speed:number,playing:boolean,boost:boolean,drift:boolean){if(!this.ctx||!this.engine||!this.gain)return;const t=this.ctx.currentTime;this.engine.frequency.setTargetAtTime(30+speed*.55+(boost?22:0),t,.09);this.gain.gain.setTargetAtTime(this.enabled&&playing?.018+speed*.00011:0,t,.08);if(boost&&!this.lastBoost)this.tone(100,.4,'sawtooth',.025,550);this.lastBoost=boost;if(drift&&Math.random()<.05)this.tone(580+Math.random()*100,.1,'triangle',.012,400);}
 pickup(){this.tone(880,.12,'sine',.08,1500);}
 crash(){this.tone(100,.5,'sawtooth',.16,20);}
 click(){this.init();this.tone(450,.06,'sine',.035,650);}
}
export const audio=new AudioManager();
