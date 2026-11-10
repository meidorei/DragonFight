export class AudioEngine{
 constructor(){this.volume=.3;this.ctx=null;}
 activate(){try{this.ctx??=new AudioContext();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{}}
 play(type){if(!this.ctx||this.ctx.state!=='running'||this.volume<=0)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type==='hit'?'sawtooth':'triangle';const hz=type==='hit'?125:type==='block'?420:type==='roundEnd'?660:230;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(hz*.4,t+.1);g.gain.setValueAtTime(this.volume*.11,t);g.gain.exponentialRampToValueAtTime(.001,t+.13);o.connect(g).connect(this.ctx.destination);o.start();o.stop(t+.14);}
}
