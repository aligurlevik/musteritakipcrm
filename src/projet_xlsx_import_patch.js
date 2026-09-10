import worker from './ciro_checked_only_fix.js';

const PROJET_XLSX_IMPORT_PATCH = String.raw`
<style id="projetXlsxImportStyle">
.projet-import-btn{background:#0f766e!important;color:#fff!important;border:1px solid #0f766e!important;white-space:nowrap}
.projet-import-btn:hover{background:#115e59!important}
.projet-import-btn.busy{opacity:.65;cursor:wait}
</style>
<script id="projetXlsxImportPatch">
(() => {
  if (window.__projetXlsxImportLoaded) return;
  window.__projetXlsxImportLoaded = true;

  const utf8 = new TextDecoder('utf-8');

  function u16(view, offset){ return view.getUint16(offset, true); }
  function u32(view, offset){ return view.getUint32(offset, true); }

  async function unzipXlsx(arrayBuffer){
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    let eocd = -1;
    for(let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--){
      if(u32(view, i) === 0x06054b50){ eocd = i; break; }
    }
    if(eocd < 0) throw new Error('Excel dosyası okunamadı (ZIP sonu bulunamadı).');

    const entryCount = u16(view, eocd + 10);
    const centralOffset = u32(view, eocd + 16);
    const files = new Map();
    let p = centralOffset;

    for(let n = 0; n < entryCount; n++){
      if(u32(view, p) !== 0x02014b50) throw new Error('Excel dosyası bozuk görünüyor.');
      const method = u16(view, p + 10);
      const compressedSize = u32(view, p + 20);
      const nameLen = u16(view, p + 28);
      const extraLen = u16(view, p + 30);
      const commentLen = u16(view, p + 32);
      const localOffset = u32(view, p + 42);
      const name = utf8.decode(bytes.slice(p + 46, p + 46 + nameLen));
      files.set(name, {method, compressedSize, localOffset});
      p += 46 + nameLen + extraLen + commentLen;
    }

    async function readFile(name){
      const file = files.get(name);
      if(!file) return '';
      const o = file.localOffset;
      if(u32(view, o) !== 0x04034b50) throw new Error('Excel iç dosyası okunamadı.');
      const nameLen = u16(view, o + 26);
      const extraLen = u16(view, o + 28);
      const start = o + 30 + nameLen + extraLen;
      const compressed = bytes.slice(start, start + file.compressedSize);
      if(file.method === 0) return utf8.decode(compressed);
      if(file.method !== 8) throw new Error('Bu Excel sıkıştırma biçimi desteklenmiyor.');
      if(typeof DecompressionStream === 'undefined') throw new Error('Tarayıcı Excel açmayı desteklemiyor. Chrome/Edge kullanın.');
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return utf8.decode(new Uint8Array(await new Response(stream).arrayBuffer()));
    }

    return {readFile, files};
  }

  function xml(text){
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if(doc.querySelector('parsererror')) throw new Error('Excel XML içeriği okunamadı.');
    return doc;
  }

  function readSharedStrings(text){
    if(!text) return [];
    return [...xml(text).getElementsByTagName('si')].map(si =>
      [...si.getElementsByTagName('t')].map(t => t.textContent || '').join('')
    );
  }

  function readSheetCells(text, shared){
    const doc = xml(text);
    const out = {};
    for(const cell of doc.getElementsByTagName('c')){
      const ref = cell.getAttribute('r');
      if(!ref) continue;
      const type = cell.getAttribute('t') || '';
      let value = '';
      if(type === 'inlineStr'){
        value = [...cell.getElementsByTagName('t')].map(t => t.textContent || '').join('');
      }else{
        const v = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        value = type === 's' ? (shared[Number(v)] ?? '') : v;
      }
      out[ref.toUpperCase()] = value;
    }
    return out;
  }

  function excelSerialToParts(value){
    const serial = Number(value);
    if(!Number.isFinite(serial) || serial <= 0) return {date:'', time:''};
    const whole = Math.floor(serial);
    let seconds = Math.round((serial - whole) * 86400);
    const date = new Date(Date.UTC(1899, 11, 30) + whole * 86400000);
    if(seconds >= 86400){ seconds -= 86400; date.setUTCDate(date.getUTCDate() + 1); }
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth()+1).padStart(2,'0');
    const dd = String(date.getUTCDate()).padStart(2,'0');
    const hh = String(Math.floor(seconds/3600)).padStart(2,'0');
    const min = String(Math.floor((seconds%3600)/60)).padStart(2,'0');
    return {date: yyyy+'-'+mm+'-'+dd, time: hh+':'+min};
  }

  function normalizePlace(value){
    const raw = String(value || '').trim();
    const key = raw.toLocaleUpperCase('tr-TR');
    if(key.includes('BURSA')) return 'Bursa';
    if(key.includes('KARGO')) return 'Kargo';
    if(key.includes('İSTANBUL') || key.includes('ISTANBUL')) return 'İstanbul';
    if(key.includes('OTOB')) return 'Otobüs';
    return raw;
  }

  function normalizeStatus(value){
    const key = String(value || '').trim().toLocaleUpperCase('tr-TR');
    return key.includes('BEKLE') ? 'Bekleme' : 'İmalat';
  }

  function normalizePerson(value){
    const raw = String(value || '').trim();
    const key = raw.toLocaleLowerCase('tr-TR');
    if(key === 'ali') return 'Ali';
    if(key === 'çağatay' || key === 'cagatay') return 'Çağatay';
    return raw || (typeof currentGraphicUser === 'function' ? currentGraphicUser() : 'Ali');
  }

  function numberValue(value){
    const cleaned = String(value ?? '').trim().replace(/\s/g,'').replace(',','.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? Math.max(0,n) : 0;
  }

  async function parseProjetXlsx(file){
    const archive = await unzipXlsx(await file.arrayBuffer());
    const shared = readSharedStrings(await archive.readFile('xl/sharedStrings.xml'));
    let sheetPath = 'xl/worksheets/sheet1.xml';
    if(!archive.files.has(sheetPath)){
      const found = [...archive.files.keys()].find(x => /^xl\/worksheets\/sheet\d+\.xml$/i.test(x));
      if(!found) throw new Error('Excel içinde çalışma sayfası bulunamadı.');
      sheetPath = found;
    }
    const cells = readSheetCells(await archive.readFile(sheetPath), shared);
    const delivery = excelSerialToParts(cells.E6);
    const company = String(cells.B3 || '').trim();
    const description = String(cells.B4 || '').trim();
    const jobNo = String(cells.B5 || '').trim();
    if(!company || !jobNo) throw new Error('Projet formunda Firma veya Kod No bulunamadı.');
    if(!delivery.date) throw new Error('Projet formunda Teslim Tarihi okunamadı.');

    return {
      work_date: delivery.date,
      delivery_date: '',
      delivery_place: normalizePlace(cells.E5),
      job_no: jobNo,
      customer_name: company,
      description,
      price: numberValue(cells.B22),
      created_by: normalizePerson(cells.B6),
      quantity: 1,
      status: normalizeStatus(cells.E7),
      remind_at: delivery.time ? delivery.date+'T'+delivery.time : '',
      allow_duplicate: false
    };
  }

  async function importProjetFile(file, button){
    if(!file) return;
    const oldText = button.textContent;
    button.classList.add('busy');
    button.disabled = true;
    button.textContent = '⏳ Okunuyor...';
    try{
      const payload = await parseProjetXlsx(file);
      button.textContent = '⏳ Aktarılıyor...';
      await req('/api/graphic-jobs',{method:'POST',body:JSON.stringify(payload)});
      if(typeof showMsg === 'function') showMsg('✅ Projet’ten aktarıldı: '+payload.customer_name+' — '+payload.job_no);
      const selectedDate = document.getElementById('g_date');
      if(selectedDate) selectedDate.value = typeof localDateKey === 'function' ? localDateKey() : payload.work_date;
      const search = document.getElementById('graphicSearch');
      if(search) search.value = '';
      if(typeof loadGraphicJobs === 'function') await loadGraphicJobs();
    }catch(error){
      const message = String(error?.message || error || 'Aktarım başarısız.');
      if(typeof showMsg === 'function'){
        showMsg(message.includes('daha önce') ? 'Bu iş kodu CRM’de zaten var; ikinci kez eklenmedi.' : 'Projet aktarımı: '+message,'err');
      }else alert(message);
    }finally{
      button.classList.remove('busy');
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function installProjetImport(){
    if(document.getElementById('projetXlsxImportButton')) return;
    const section = document.getElementById('graphicJobs');
    const bar = section?.querySelector('.toolbar .filterbar');
    if(!bar){ setTimeout(installProjetImport, 300); return; }

    const input = document.createElement('input');
    input.id = 'projetXlsxImportInput';
    input.type = 'file';
    input.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.style.display = 'none';

    const button = document.createElement('button');
    button.id = 'projetXlsxImportButton';
    button.type = 'button';
    button.className = 'btn projet-import-btn';
    button.textContent = '📥 Projet’ten Aktar';
    button.title = 'Projet Organizer’dan XLS ile alınan sipariş formunu Grafik İşleri’ne aktar';
    button.onclick = () => { input.value=''; input.click(); };
    input.onchange = () => importProjetFile(input.files?.[0], button);

    bar.prepend(button);
    bar.appendChild(input);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installProjetImport, {once:true});
  else installProjetImport();
})();
</script>`;

function shouldPatch(path){
  return path === '/' || path === '/index.html';
}

export default {
  async fetch(request, env, ctx){
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const type = response.headers.get('content-type') || '';
    if(request.method !== 'GET' || !shouldPatch(url.pathname) || !response.ok || !type.includes('text/html')) return response;

    let html = await response.text();
    if(!html.includes('projetXlsxImportPatch')) html = html.replace('</body>', PROJET_XLSX_IMPORT_PATCH + '\n</body>');

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-cache, no-store, must-revalidate');
    headers.set('pragma','no-cache');
    headers.set('expires','0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
