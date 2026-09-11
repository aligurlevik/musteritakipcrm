import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import worker from '../src/production_guard.js';

const androidUa='Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';

function fakeDb(){
  const statement=()=>({
    bind(){return this},
    async all(){return {results:[],success:true}},
    async first(){return null},
    async run(){return {success:true,meta:{changes:0,last_row_id:0}}},
    async raw(){return []}
  });
  return {
    prepare(){return statement()},
    async batch(){return []},
    async exec(){return {count:0,duration:0}},
    async dump(){return new ArrayBuffer(0)}
  };
}

function testEnv({failFirstAsset=false,withDb=true}={}){
  let calls=0;
  const files={
    '/':'public/index.html',
    '/index.html':'public/index.html',
    '/notlar-v2.html':'public/notlar-v2.html'
  };
  const env={
    ASSETS:{
      async fetch(request){
        calls++;
        if(failFirstAsset&&calls===1)throw new Error('simulated asset failure');
        const pathname=new URL(request.url).pathname;
        const file=files[pathname];
        if(!file)return new Response('Bulunamadı',{status:404});
        return new Response(await readFile(file),{
          status:200,
          headers:{'content-type':'text/html; charset=utf-8',etag:'test-etag'}
        });
      }
    }
  };
  if(withDb)env.DB=fakeDb();
  return env;
}

async function textResponse(url,{ua='desktop-test',mobileHint='',env=testEnv()}={}){
  const headers={'user-agent':ua,'accept-language':'tr-TR'};
  if(mobileHint)headers['sec-ch-ua-mobile']=mobileHint;
  const response=await worker.fetch(new Request(url,{headers}),env,{});
  const body=await response.text();
  return {response,body};
}

test('Android ana sayfası Notlar olarak açılır ve masaüstü yamalarından ayrıdır',async()=>{
  const {response,body}=await textResponse('https://crm.test/',{ua:androidUa,mobileHint:'?1'});
  assert.equal(response.status,200);
  assert.match(body,/<title>Notlarım<\/title>/);
  assert.doesNotMatch(body,/projetXlsxImportPatch|agendaRollingWeekStyle|graphicDesktopQuickFixes/);
});

test('Not başlığı yalnızca telefon ekranında büyür',async()=>{
  const {response,body}=await textResponse('https://crm.test/notlar-v2.html',{ua:androidUa,mobileHint:'?1'});
  assert.equal(response.status,200);
  assert.match(body,/\.noteTitleMobile\{font-size:17px;font-weight:950;line-height:24px/);
  assert.match(body,/@media\(max-width:560px\)[\s\S]*?\.noteTitleMobile\{font-size:18px;line-height:26px\}/);
  assert.match(body,/ALI GURLEVIK/);
  assert.match(body,/NOT DEFTERİ/);
});

test('mobile=1 masaüstü tarayıcıda da güvenli mobil yolu kullanır',async()=>{
  const {response,body}=await textResponse('https://crm.test/?mobile=1');
  assert.equal(response.status,200);
  assert.match(body,/<title>Notlarım<\/title>/);
  assert.doesNotMatch(body,/projetXlsxImportPatch/);
});

test('masaüstü ana sayfası CRM yamalarıyla açılmaya devam eder',async()=>{
  const {response,body}=await textResponse('https://crm.test/');
  assert.equal(response.status,200);
  assert.match(body,/id="graphicJobs"/);
  assert.match(body,/id="projetXlsxImportPatch"/);
});

test('mobil Worker hatasında doğrudan Notlar sayfasına kurtarır',async()=>{
  const {response,body}=await textResponse('https://crm.test/',{
    ua:androidUa,
    mobileHint:'?1',
    env:testEnv({failFirstAsset:true})
  });
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-crm-recovered'),'1');
  assert.match(body,/<title>Notlarım<\/title>/);
});

test('masaüstü Worker hatasında doğrudan CRM sayfasına kurtarır',async()=>{
  const {response,body}=await textResponse('https://crm.test/',{
    env:testEnv({failFirstAsset:true})
  });
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-crm-recovered'),'1');
  assert.match(body,/<title>CRM Müşteri Takip<\/title>/);
});

test('API istisnası Cloudflare 1101 yerine kontrollü JSON döndürür',async()=>{
  const response=await worker.fetch(new Request('https://crm.test/api/login',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({user:'Ali',password:'test'})
  }),testEnv({withDb:false}),{});
  assert.equal(response.status,500);
  assert.equal(response.headers.get('x-crm-recovered'),'1');
  assert.match(response.headers.get('content-type')||'',/application\/json/);
});
