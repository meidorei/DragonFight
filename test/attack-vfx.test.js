import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,realpath,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRound,startAttack,step} from '../src/engine.js';
import {validateCharacter} from '../src/schema.js';
import {checkCharacter} from '../tools/check.mjs';

const templateDirectory=new URL('../templates/character/',import.meta.url);
const template=JSON.parse(await readFile(new URL('character.json',templateDirectory),'utf8'));
const layout={frameWidth:256,frameHeight:256,frames:4,fps:30,anchor:[128,128]};

function characterWithVfx(vfx){
  const character=structuredClone(template);
  character.moves.light.vfx=vfx;
  return character;
}

function round(character){
  return createRound({slots:[
    {character:template,team:0,control:'p1'},
    {character,team:1,control:'p2'},
  ],seed:42});
}

function ticks(w,count){
  for(let i=0;i<count;i++)step(w);
}

test('attack VFX plays once on its active frame even on a miss and stays at its spawn point',()=>{
  const animation={...layout,at:1,src:'vfx/slash.png',offset:[56,72]};
  const character=characterWithVfx([animation]);
  const move=character.moves.light;
  move.recovery=0;
  const w=round(character);
  const [target,attacker]=w.fighters;
  assert(startAttack(w,attacker,'light'));
  attacker.facing=1;
  attacker.x-=100;

  ticks(w,move.startup+animation.at);
  assert.deepEqual(w.visuals,[]);
  step(w);
  assert.equal(w.visuals.length,1);
  const spawnX=attacker.x-56;
  assert.deepEqual(w.visuals.map(({kind,x,y,facing})=>({kind,x,y,facing})),[
    {kind:'attack-vfx',x:spawnX,y:72,facing:-1},
  ]);
  assert.equal(target.hp,target.maxHp);

  attacker.x+=100;
  for(let elapsed=1;elapsed<8;elapsed++){
    step(w);
    assert.equal(w.visuals.length,1);
    assert.equal(w.visuals[0].x,spawnX);
  }
  assert.equal(attacker.attack,null);
  step(w);
  assert.deepEqual(w.visuals,[]);
});

test('a 60 fps single-frame attack VFX survives its spawn tick',()=>{
  const animation={...layout,at:0,frames:1,fps:60,src:'vfx/spark.png'};
  const character=characterWithVfx([animation]);
  const w=round(character);
  const attacker=w.fighters[1];
  step(w,{p2:{action:'light'}});
  ticks(w,character.moves.light.startup-1);
  assert.deepEqual(w.visuals,[]);

  step(w);
  assert.deepEqual(w.visuals.map(({kind,x,y})=>({kind,x,y})),[
    {kind:'attack-vfx',x:attacker.x,y:attacker.y},
  ]);
  step(w);
  assert.deepEqual(w.visuals,[]);
});

test('an attack VFX freezes during hitstop alongside unmodified attack damage',()=>{
  const character=characterWithVfx([{...layout,at:0,src:'vfx/slash.png'}]);
  const w=round(character);
  const [target,attacker]=w.fighters;
  target.x=450;
  attacker.x=510;
  assert(startAttack(w,attacker,'light'));
  ticks(w,character.moves.light.startup+1);
  assert.equal(target.hp,target.maxHp-character.moves.light.damage);
  assert(w.hitstop>0);

  const visual=w.visuals.find(({kind})=>kind==='attack-vfx');
  assert(visual);
  const life=visual.life;
  ticks(w,w.hitstop);
  assert.equal(visual.life,life);
  step(w);
  assert.equal(visual.life,life-1);
});

test('attack VFX validates timing, frame sources and placement',()=>{
  const strip={...layout,at:0,src:'vfx/slash.png',offset:[48,64],size:180};
  const sequence={...layout,at:1,frames:2,files:['vfx/01.png','vfx/02.png']};
  assert.deepEqual(validateCharacter(characterWithVfx([strip,sequence])),[]);

  const character=characterWithVfx([
    {...strip,at:template.moves.light.active,src:'../slash.png',offset:[48],size:0},
    {...sequence,files:['vfx/01.png']},
  ]);
  const errors=validateCharacter(character);
  for(const field of ['[0].at','[0].src','[0].offset','[0].size','[1].files']){
    assert(errors.some(error=>error.includes(`moves.light.vfx${field}`)),field);
  }
});

test('character asset checks include attack VFX strips and individual frames',async()=>{
  const strip={...layout,at:0,src:'vfx/slash.png'};
  const sequence={...layout,at:1,frames:2,files:['vfx/01.png','vfx/02.png']};
  const character=characterWithVfx([strip,sequence]);
  const temporaryRoot=await realpath(tmpdir());
  const prefix='dragonfight-vfx-test-';
  const directory=await mkdtemp(path.join(temporaryRoot,prefix));
  try{
    await cp(templateDirectory,directory,{recursive:true});
    const vfxDirectory=path.join(directory,'vfx');
    await mkdir(vfxDirectory);
    await cp(new URL('light.png',templateDirectory),path.join(vfxDirectory,'slash.png'));
    await cp(new URL('portrait.png',templateDirectory),path.join(vfxDirectory,'01.png'));
    await cp(new URL('portrait.png',templateDirectory),path.join(vfxDirectory,'02.png'));
    const characterFile=path.join(directory,'character.json');
    await writeFile(characterFile,JSON.stringify(character));
    assert.deepEqual(await checkCharacter(characterFile),[]);

    await cp(new URL('portrait.png',templateDirectory),path.join(vfxDirectory,'slash.png'));
    await rm(path.join(vfxDirectory,'02.png'));
    const errors=await checkCharacter(characterFile);
    assert(errors.some(error=>error.includes('vfx/slash.png')&&error.includes('1024×256')));
    assert(errors.some(error=>error.includes('vfx/02.png')));
  }finally{
    const resolved=await realpath(directory);
    assert.equal(path.dirname(resolved),temporaryRoot);
    assert(path.basename(resolved).startsWith(prefix));
    await rm(resolved,{recursive:true,force:true});
  }
});
