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
test('customer recovery hook never reads or writes the database, even concurrently',async()=>{
 const db=database(),other=database();
 const results=await Promise.all(Array.from({length:10},()=>restorePortfolioCustomers({DB:db})));
 assert.ok(results.every(x=>x.ok&&!x.restored));
 await restorePortfolioCustomers({DB:other});
 assert.equal(db.reads,0);assert.equal(other.reads,0);
});
test('disabled recovery cannot resurrect customers or trigger quota errors',async()=>{
 let attempts=0;const db={prepare(){attempts++;throw Error('D1 daily limit')}};
 assert.equal((await restorePortfolioCustomers({DB:db})).restored,false);
 assert.equal(attempts,0);
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
