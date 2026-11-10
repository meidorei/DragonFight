import test from 'node:test';
import assert from 'node:assert/strict';
import {Input,DEFAULT_KEYS} from '../src/input.js';
// Lightweight DOM event adapters test input behavior, without a browser package.
class Element extends EventTarget {
 constructor(action){super();this.dataset={action};this.style={};this.classes=new Set();this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)};}
 setPointerCapture(){}
 getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
 querySelector(){return this.knob;}
}
const event=(type,fields={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,fields);return e;};
function env(){
 const win=new EventTarget(),doc=new EventTarget(),knob=new Element();doc.hidden=false;doc.querySelectorAll=()=>[];doc.querySelector=()=>knob;
 globalThis.window=win;globalThis.document=doc;
 let pauses=0;const input=new Input(structuredClone(DEFAULT_KEYS),()=>pauses++,()=>{});input.enabled=true;
 const stick=new Element(),buttons=['light','guard'].map(a=>new Element(a));stick.knob=knob;
 input.attachTouch({querySelectorAll:()=>buttons,querySelector:()=>stick},()=>{});
 return {win,doc,input,stick,buttons,pauses:()=>pauses};
}
test('simultaneous keyboard players, edge attacks, release and focus loss',()=>{
 const {win,input,pauses}=env();
 for(const code of ['KeyD','ArrowLeft','KeyJ','Numpad2'])win.dispatchEvent(event('keydown',{code,repeat:false}));
 const first=input.read();assert.equal(first.p1.move,1);assert.equal(first.p2.move,-1);assert.equal(first.p1.action,'light');assert.equal(first.p2.action,'heavy');
 const held=input.read();assert.equal(held.p1.move,1);assert.equal(held.p1.action,undefined);
 win.dispatchEvent(event('keyup',{code:'KeyD'}));assert.equal(input.read().p1.move,0);
 win.dispatchEvent(event('blur'));assert.equal(pauses(),1);assert.equal(input.read().p2.move,0);
});
test('multitouch movement plus attack, pointer cancellation and new joystick after clearing',()=>{
 const {input,stick,buttons}=env();
 stick.dispatchEvent(event('pointerdown',{pointerId:1,clientX:95,clientY:50}));
 buttons[0].dispatchEvent(event('pointerdown',{pointerId:2}));
 let intent=input.read().p1;assert.equal(intent.move,1);assert.equal(intent.action,'light');
 buttons[0].dispatchEvent(event('pointercancel',{pointerId:2}));assert.equal(input.read().p1.move,1);
 input.clear();assert.equal(input.read().p1.move,0);
 stick.dispatchEvent(event('pointerdown',{pointerId:3,clientX:5,clientY:50}));assert.equal(input.read().p1.move,-1);
 stick.dispatchEvent(event('lostpointercapture',{pointerId:3}));assert.equal(input.read().p1.move,0);
});
test('joystick jump fires only on upward crossing and held guard uses independent pointers',()=>{
 const {input,stick,buttons}=env();
 stick.dispatchEvent(event('pointerdown',{pointerId:1,clientX:50,clientY:5}));buttons[1].dispatchEvent(event('pointerdown',{pointerId:2}));
 const first=input.read().p1;assert.equal(first.jump,true);assert.equal(first.guard,true);
 stick.dispatchEvent(event('pointermove',{pointerId:1,clientX:52,clientY:6}));assert.equal(input.read().p1.jump,false);
 buttons[1].dispatchEvent(event('pointerup',{pointerId:2}));assert.equal(input.read().p1.guard,false);
});
test('visibility pause clears all controls and disabled input ignores new buttons',()=>{
 const {doc,input,buttons,pauses}=env();buttons[1].dispatchEvent(event('pointerdown',{pointerId:2}));doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(pauses(),1);assert.equal(input.read().p1.guard,false);input.enabled=false;buttons[0].dispatchEvent(event('pointerdown',{pointerId:3}));assert.equal(input.read().p1.action,undefined);
});
