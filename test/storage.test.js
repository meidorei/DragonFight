import test from 'node:test';
import assert from 'node:assert/strict';
import {readStored,writeStored} from '../src/storage.js';
test('storage denial and corrupt saves do not crash play',()=>{globalThis.localStorage={getItem(){throw new Error('denied');},setItem(){throw new Error('quota');}};assert.deepEqual(readStored('settings',{}),{});assert.equal(writeStored('settings',{}),false);globalThis.localStorage.getItem=()=>'{broken';assert.equal(readStored('record.challenge',0),0);});
test('challenge records are stored under independent mode keys',()=>{const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};assert(writeStored('record.challenge',7));assert(writeStored('record.onslaught',3));assert.equal(readStored('record.challenge',0),7);assert.equal(readStored('record.onslaught',0),3);});
