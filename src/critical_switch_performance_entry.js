import worker from './portfolio_workflow_patch_entry.js';
import {RELIABLE_PROGRAM_SWITCH_V4} from './reliable_program_switch_client.js';

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-crm-performance':'reliable-v4'
    }
  });
}

function assetResponse(response,type){
  const headers=new Headers(response.headers);
  headers.set('content-type',type);
  headers.set('cache-control','public, max-age=3600');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function roleFor(request,env,ctx){
  try{
    const url=new URL(request.url);
    url.pathname='/api/session';
    url.search='';
    const response=await worker.fetch(new Request(url.toString(),{
      method:'GET',
      headers:request.headers,
      redirect:'manual'
    }),env,ctx);
    if(!response.ok)return '';
    const data=await response.json();
    return String(data.role||'');
  }catch(_){
    return '';
  }
}

function isProgramHtml(path){
  return path==='/'||path==='/index.html'||
    ['/notlar-v2','/notlar-v2/','/notlar-v2.html','/planlama','/planlama/','/planlama.html'].includes(path);
}

function prefetchMarkup(path){
  const links=[];
  if(path==='/'||path==='/index.html'){
    links.push('/notlar-v2.html','/planlama.html');
  }else if(path.startsWith('/notlar-v2')){
    links.push('/planlama.html','/');
  }else if(path.startsWith('/planlama')){
    links.push('/notlar-v2.html','/');
  }
  return links.map(href=>'<link rel="prefetch" href="'+href+'">').join('');
}

function rebuildHtml(response,html,path){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-cache, must-revalidate');
  headers.set('x-crm-performance','reliable-v4');

  const prefetch=prefetchMarkup(path);
  if(prefetch&&!html.includes('data-crm-program-prefetch')){
    html=html.replace(/<\/head>/i,'<meta data-crm-program-prefetch="reliable-v4">'+prefetch+'</head>');
  }
  if((path==='/'||path==='/index.html')&&!html.includes('data-crm-switch-reliable')){
    html=html.replace(/<\/body>/i,'<script data-crm-switch-reliable="reliable-v4" src="/crm-switch-reliable-v4.js?v=20261007-4"></script></body>');
  }
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;

    if(request.method==='GET'&&path==='/crm-switch-reliable-v4.js'){
      return new Response(RELIABLE_PROGRAM_SWITCH_V4,{
        status:200,
        headers:{
          'content-type':'application/javascript; charset=utf-8',
          'cache-control':'no-cache, must-revalidate',
          'x-crm-switch-client':'worker-bundled-v4'
        }
      });
    }

    if(request.method==='GET'&&path==='/api/graphic-jobs-summary'){
      const role=await roleFor(request,env,ctx);
      if(!role)return json({error:'Yetkisiz'},401);
      if(role==='tracking')return json({error:'Yetkisiz'},403);
      try{
        const row=await env.DB.prepare('SELECT COALESCE(SUM(price),0) total, COUNT(*) count FROM graphic_jobs').first();
        return json({total:Number(row?.total||0),count:Number(row?.count||0)});
      }catch(error){
        console.error('graphic summary failed',error?.stack||error);
        return json({error:'Grafik toplamı alınamadı.'},500);
      }
    }

    const response=await worker.fetch(request,env,ctx);

    if(request.method==='GET'&&isProgramHtml(path)&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      const backup=response.clone();
      try{
        return rebuildHtml(response,await response.text(),path);
      }catch(error){
        console.error('performance html layer skipped',error?.stack||error);
        return backup;
      }
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};