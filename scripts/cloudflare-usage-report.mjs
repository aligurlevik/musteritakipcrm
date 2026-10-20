import {randomBytes,createCipheriv,publicEncrypt,constants} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const START='2026-10-20',STOP='2026-11-20';
export function seal(report,publicKey){
 const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const ciphertext=Buffer.concat([cipher.update(JSON.stringify(report),'utf8'),cipher.final()]);
 return Buffer.from(JSON.stringify({version:1,key:publicEncrypt({key:publicKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},key).toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:ciphertext.toString('base64')})).toString('base64');
}
export function costEstimate({reads,writes,storageBytes,requests,cpuTimeUs}){
 return {subscriptionUsd:5,d1ReadsExtraUsd:Math.max(0,reads-25e9)/1e6*.001,d1WritesExtraUsd:Math.max(0,writes-50e6)/1e6,storageMonthlyRunRateExtraUsd:Math.max(0,storageBytes/1e9-5)*.75,workersRequestsExtraUsd:requests==null?null:Math.max(0,requests-10e6)/1e6*.30,workersCpuExtraUsd:cpuTimeUs==null?null:Math.max(0,cpuTimeUs/1000-30e6)/1e6*.02};
}
async function main(){
 const now=new Date(),today=now.toISOString().slice(0,10);
 if(today>=STOP){console.log('REPORT_WINDOW_COMPLETE');return;}
 const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
 if(!token||!account)throw Error('MISSING_SECRET');
 async function call(url,payload){
  const response=await fetch(url,{method:payload?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('API_HTTP_'+response.status);
  const result=await response.json();
  if(result.errors?.length||result.success===false)throw Error('API_QUERY_UNAVAILABLE');
  return result;
 }
 async function graphql(query,variables){
  const result=await call('https://api.cloudflare.com/client/v4/graphql',{query,variables:{accountTag:account,...variables}});
  const node=result.data?.viewer?.accounts?.[0];if(!node)throw Error('ACCOUNT_UNAVAILABLE');return node;
 }
 const d1=await graphql(`query($accountTag:string!,$start:Date!,$end:Date!){viewer{accounts(filter:{accountTag:$accountTag}){d1AnalyticsAdaptiveGroups(limit:10000,filter:{date_geq:$start,date_leq:$end},orderBy:[date_ASC]){dimensions{date databaseId}sum{rowsRead rowsWritten}}}}}`,{start:START,end:today});
 const rows=d1.d1AnalyticsAdaptiveGroups||[],daily={};
 for(const item of rows){const date=item.dimensions.date;daily[date]??={rowsRead:0,rowsWritten:0};daily[date].rowsRead+=Number(item.sum.rowsRead||0);daily[date].rowsWritten+=Number(item.sum.rowsWritten||0);}
 const reads=rows.reduce((s,x)=>s+Number(x.sum.rowsRead||0),0),writes=rows.reduce((s,x)=>s+Number(x.sum.rowsWritten||0),0);
 let storageBytes=null;try{let size=0;for(let page=1;page<=100;page++){const dbs=await call('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database?per_page=100&page='+page);for(const db of dbs.result||[]){if(typeof db.file_size!=='number')throw Error('SIZE_UNAVAILABLE');size+=db.file_size;}if((dbs.result||[]).length<100)break;}storageBytes=size;}catch{}
 if(storageBytes==null){try{
  const node=await graphql(`query($accountTag:string!,$start:Date!,$end:Date!){viewer{accounts(filter:{accountTag:$accountTag}){d1StorageAdaptiveGroups(limit:10000,filter:{date_geq:$start,date_leq:$end}){dimensions{databaseId}max{databaseSizeBytes}}}}}`,{start:today,end:today});
  const storage=node.d1StorageAdaptiveGroups||[];
  if(storage.length)storageBytes=storage.reduce((sum,row)=>sum+Number(row.max.databaseSizeBytes||0),0);
 }catch{}}
 let requests=0,cpuTimeUs=0,workersComplete=true;
 for(let day=new Date(START+'T00:00:00Z');day<=now;day=new Date(day.getTime()+86400000)){
  const end=new Date(Math.min(day.getTime()+86400000,now.getTime()));
  try{
   const node=await graphql(`query($accountTag:string!,$start:Time!,$end:Time!){viewer{accounts(filter:{accountTag:$accountTag}){workersInvocationsAdaptive(limit:1,filter:{datetime_geq:$start,datetime_lt:$end}){sum{requests cpuTimeUs}}}}}`,{start:day.toISOString(),end:end.toISOString()});
   const metric=node.workersInvocationsAdaptive?.[0]?.sum;
   requests+=Number(metric?.requests||0);cpuTimeUs+=Number(metric?.cpuTimeUs||0);
  }catch{workersComplete=false;requests=null;cpuTimeUs=null;break;}
 }
 const costs=costEstimate({reads,writes,storageBytes:storageBytes??0,requests,cpuTimeUs});
 if(storageBytes==null)costs.storageMonthlyRunRateExtraUsd=null;
 const report={schemaVersion:1,generatedAt:now.toISOString(),billingStart:START,billingEnd:STOP,metricsTimezone:'UTC',periodIncludesUpgradeDayPrepaymentUsage:true,daily,d1:{rowsRead:reads,rowsWritten:writes,storageBytes,readAllowance:25e9,writeAllowance:50e6,storageIncludedBytes:5e9},workers:{requests,cpuTimeUs,complete:workersComplete},costEstimate:costs,limitations:['Usage metrics are estimates, not an invoice.','The upgrade day may include usage before payment.','CPU and request estimates may differ from billing adjustments.','Storage extra is a monthly run-rate estimate, not accrued storage cost.','Excludes taxes, exchange rates, Logs, KV, R2 and other services.','A missing metric must be shown as unavailable, never zero.']};
 const publicKey=readFileSync(new URL('./cloudflare-report-public.pem',import.meta.url),'utf8');
 console.log('CLOUDFLARE_REPORT_V1:'+seal(report,publicKey));
 console.log('Encrypted usage report ready. No credentials or plaintext usage published.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(()=>{console.error('REPORT_FAILED: Cloudflare metrics could not be collected. No secret or usage data published.');process.exitCode=1;});}
