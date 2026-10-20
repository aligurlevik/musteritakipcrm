import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {restorePortfolioCustomers} from '../src/restore_portfolio_customers.js';
import worker from '../src/d1_like_emergency_patch.js';

function database(){
 const sql=new DatabaseSync(':memory:');let reads=0;
 return {get reads(){return reads},prepare(query){
  const statement=sql.prepare(query);let args=[];
  return {bind(...values){args=values;return this},async run(){reads++;statement.run(...args);return {success:true}},async all(){reads++;return {results:statement.all(...args)}},async first(){reads++;return statement.get(...args)||null}};
 }};
}
test('portfolio recovery coalesces concurrent requests and skips repeat scans, independently per database',async()=>{
 const db=database(),other=database();
 await Promise.all(Array.from({length:10},()=>restorePortfolioCustomers({DB:db})));
 const initial=db.reads;assert.ok(initial>0);
 await restorePortfolioCustomers({DB:db});assert.equal(db.reads,initial);
 await restorePortfolioCustomers({DB:other});assert.ok(other.reads>0);
});
test('failed recovery backs off repeated quota errors',async()=>{
 let attempts=0;const db={prepare(){attempts++;throw Error('D1 daily limit')}};
 await assert.rejects(restorePortfolioCustomers({DB:db}));
 await assert.rejects(restorePortfolioCustomers({DB:db}));assert.equal(attempts,1);
});
test('login quota failure is a service error and never falls back to an older password',async()=>{
 const request=new Request('https://crm.test/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({user:'Ali',password:'test-old-password'})});
 const db={prepare(){return {bind(){return this},async first(){throw Error("D1_ERROR: Your account has exceeded D1's free tier daily row read limit.")}}}};
 const response=await worker.fetch(request,{DB:db,ADMIN_PASSWORD:'test-old-password'},{});
 assert.equal(response.status,503);assert.equal(response.headers.get('set-cookie'),null);
 assert.equal((await response.json()).code,'D1_DAILY_LIMIT');
});
test('unexpected password database failures never turn into invalid password responses',async()=>{
 const db={prepare(){throw Error('database unavailable')}};
 const response=await worker.fetch(new Request('https://crm.test/api/login',{method:'POST',body:'{}'}),{DB:db},{});
 assert.equal(response.status,503);assert.equal((await response.json()).code,'DATABASE_UNAVAILABLE');
});
