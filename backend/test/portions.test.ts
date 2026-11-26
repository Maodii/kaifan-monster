import assert from 'node:assert/strict';
import { recommendPortions, PortionOptions } from '../src/portion-core';
const options = Object.assign(new PortionOptions(),{people:4,basePeople:2});
const source=[{name:'鸡肉',quantity:300,unit:'g'},{name:'盐',quantity:2,unit:'g',optional:true}];
const four=recommendPortions(source,options);
assert.equal(four[0].quantity,600);
assert(four[1].quantity>2&&four[1].quantity<4);
assert.match(four[0].quantitySource,/推荐/);
const light=recommendPortions(source,Object.assign(new PortionOptions(),options,{seasoning:'清淡'}));
assert(light[1].quantity<four[1].quantity);
const inferred=recommendPortions([{name:'酱油',quantity:0,unit:''},{name:'鸡蛋',quantity:0,unit:''},{name:'神秘食材',quantity:0,unit:''}],Object.assign(new PortionOptions(),{people:3}));
assert.equal(inferred[0].unit,'mL');assert.equal(inferred[0].quantity,15);
assert.equal(inferred[1].quantity,3);assert.match(inferred[1].quantitySource,/估算/);
assert.equal(inferred[2].quantity,0);assert.match(inferred[2].quantityBasis,/填写/);
assert.throws(()=>recommendPortions(source,Object.assign(new PortionOptions(),{people:0})));
assert.equal(source[0].quantity,300);
console.log('PASS portions: scaling, seasoning, inference, unknowns, validation, immutable baseline');
const peppers=[{name:'辣椒',quantity:10,unit:'g',optional:true}];
assert.equal(recommendPortions(peppers,Object.assign(new PortionOptions(),{spice:'不辣'}))[0].quantity,0);
assert.equal(recommendPortions(peppers,Object.assign(new PortionOptions(),{spice:'微辣'}))[0].quantity,5);
assert.throws(()=>recommendPortions(peppers,Object.assign(new PortionOptions(),{spice:'invalid'})));

assert.equal(recommendPortions([{name:'水',quantity:200,unit:'mL',optional:true}],options)[0].quantity,400);
// Small pieces may remain halves; eggs must remain whole.
assert.equal(recommendPortions([{name:'柠檬',quantity:1,unit:'个'}],Object.assign(new PortionOptions(),{people:1,basePeople:2}))[0].quantity,0.5);
assert.equal(recommendPortions([{name:'鸡蛋',quantity:1,unit:'个'}],Object.assign(new PortionOptions(),{people:1,basePeople:2}))[0].quantity,1);
