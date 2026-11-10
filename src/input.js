export const DEFAULT_KEYS={
 p1:{left:'KeyA',right:'KeyD',jump:'KeyW',guard:'KeyS',dodge:'KeyQ',light:'KeyJ',heavy:'KeyK',skill1:'KeyU',skill2:'KeyI',skill3:'KeyO',ultimate:'KeyL'},
 p2:{left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',guard:'ArrowDown',dodge:'Numpad0',light:'Numpad1',heavy:'Numpad2',skill1:'Numpad4',skill2:'Numpad5',skill3:'Numpad6',ultimate:'Numpad3'}
};
export const ACTION_LABELS={left:'左移',right:'右移',jump:'跳跃',guard:'防御',dodge:'后撤',light:'轻击',heavy:'重击',skill1:'技能一',skill2:'技能二',skill3:'技能三',ultimate:'大招'};
export function keyLabel(code){return code.replace('Key','').replace('Numpad','小键盘 ').replace('ArrowLeft','←').replace('ArrowRight','→').replace('ArrowUp','↑').replace('ArrowDown','↓').replace('Space','空格');}
export function keyConflicts(keys){const seen=new Map(),out=[];for(const [p,map]of Object.entries(keys))for(const [a,k]of Object.entries(map)){if(seen.has(k))out.push(`${keyLabel(k)}：${seen.get(k)} / ${p.toUpperCase()} ${ACTION_LABELS[a]}`);else seen.set(k,`${p.toUpperCase()} ${ACTION_LABELS[a]}`);}if(Object.values(keys).some(map=>Object.values(map).includes('Escape')))out.push('Esc 保留用于暂停');if(Object.entries(keys).some(([p,map])=>Object.entries(map).some(([a,k])=>k==='Space'&&(p!=='p1'||a!=='jump'))))out.push('空格保留给 1P 跳跃');return out;}
export class Input {
 constructor(keys,onPause,onActivate){
  this.keys=keys;this.down=new Set();this.pressed=new Set();this.touch=new Map();this.touchPressed=new Set();this.enabled=false;this.onPause=onPause;
  window.addEventListener('keydown',e=>{if(!this.enabled)return;if(e.code==='Escape'){e.preventDefault();if(!e.repeat)onPause();return;}if(Object.values(this.keys).some(m=>Object.values(m).includes(e.code))||e.code==='Space'){e.preventDefault();onActivate();if(!this.down.has(e.code))this.pressed.add(e.code);this.down.add(e.code);}});
  window.addEventListener('keyup',e=>this.down.delete(e.code));
  window.addEventListener('blur',()=>{this.clear();if(this.enabled)onPause(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();if(this.enabled)onPause(true);}});
 }
 clear(){this.down.clear();this.pressed.clear();this.touch.clear();this.touchPressed.clear();this.resetTouch?.();document.querySelectorAll('.touch-key.held').forEach(e=>e.classList.remove('held'));const knob=document.querySelector('.stick-knob');if(knob)knob.style.transform='';}
 read(){const result={};for(const p of ['p1','p2']){const m=this.keys[p],touch=a=>p==='p1'&&[...this.touch.values()].some(v=>v===a||Array.isArray(v)&&v.includes(a));const held=a=>this.down.has(m[a])||touch(a),pressed=a=>this.pressed.has(m[a])||p==='p1'&&this.touchPressed.has(a);result[p]={move:Number(held('right'))-Number(held('left')),guard:held('guard'),jump:pressed('jump')||p==='p1'&&this.pressed.has('Space'),dodge:pressed('dodge'),action:['ultimate','skill1','skill2','skill3','heavy','light'].find(pressed)};}this.pressed.clear();this.touchPressed.clear();return result;}
 attachTouch(root,onActivate){
  root.querySelectorAll('[data-action]').forEach(button=>{
   const end=e=>{this.touch.delete(e.pointerId);if(![...this.touch.values()].includes(button.dataset.action))button.classList.remove('held');};
   button.addEventListener('pointerdown',e=>{if(!this.enabled)return;e.preventDefault();onActivate();button.setPointerCapture(e.pointerId);this.touch.set(e.pointerId,button.dataset.action);this.touchPressed.add(button.dataset.action);button.classList.add('held');});
   button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);button.addEventListener('lostpointercapture',end);
  });
  const stick=root.querySelector('.stick'),knob=stick.querySelector('.stick-knob');let active=null;
  this.resetTouch=()=>{active=null;};
  const move=e=>{if(e.pointerId!==active)return;const r=stick.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2),v=[];if(dx<-.25)v.push('left');if(dx>.25)v.push('right');if(dy<-.55&&!this.touch.get(e.pointerId)?.includes('jump'))this.touchPressed.add('jump');if(dy<-.55)v.push('jump');this.touch.set(e.pointerId,v);knob.style.transform=`translate(${Math.max(-32,Math.min(32,dx*32))}px,${Math.max(-32,Math.min(32,dy*32))}px)`;};
  stick.addEventListener('pointerdown',e=>{if(!this.enabled||active!==null)return;active=e.pointerId;onActivate();stick.setPointerCapture(active);move(e);});stick.addEventListener('pointermove',move);
  const end=e=>{if(e.pointerId===active){this.touch.delete(active);active=null;knob.style.transform='';}};for(const evt of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(evt,end);
 }
}
