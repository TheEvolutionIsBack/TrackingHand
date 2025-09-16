// gesture.js
export let templates = []; // {id,name,response,cooldown,landmarks,lastTriggered}
export let recordFrames = [];
export let recording = false;
const RECORD_FRAME_COUNT = 18;

const gestureNameInput = document.getElementById('gestureName');
const gestureResponseInput = document.getElementById('gestureResponse');
const gestureCooldownInput = document.getElementById('gestureCooldown');
const gesturesListEl = document.getElementById('gesturesList');
const btnRecord = document.getElementById('btnRecord');
const btnStopRecord = document.getElementById('btnStopRecord');
const btnAutoName = document.getElementById('btnAutoName');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');
const sVal = document.getElementById('sVal');
const sensitivityRange = document.getElementById('sensitivity');

sensitivityRange.addEventListener('input', ()=> sVal.innerText = sensitivityRange.value );

export function normalizeLandmarks(raw){
  const ref = raw[0];
  const pts = raw.map(p => ({x: p.x - ref.x, y: p.y - ref.y}));
  let maxd = 1e-6;
  for(const p of pts){ const d = Math.hypot(p.x,p.y); if(d>maxd) maxd = d; }
  return pts.map(p => ({x: p.x / maxd, y: p.y / maxd}));
}

export function averageFrames(frames){
  if(frames.length===0) return null;
  const sum = Array(21).fill(0).map(()=>({x:0,y:0}));
  frames.forEach(f=>{ for(let i=0;i<21;i++){ sum[i].x += f[i].x; sum[i].y += f[i].y; } });
  const n = frames.length;
  return sum.map(p=>({x:p.x/n, y:p.y/n}));
}

export function compareTemplates(a,b){
  let s = 0;
  for(let i=0;i<21;i++){ s += Math.abs(a[i].x - b[i].x) + Math.abs(a[i].y - b[i].y); }
  return s;
}

export function renderTemplates(){
  gesturesListEl.innerHTML = templates.length ? '' : '<div class="tiny">(Belum ada gesture tersimpan)</div>';
  templates.forEach(t=>{
    const el = document.createElement('div'); el.className='gesture-item';
    const left = document.createElement('div'); left.className='gesture-left';
    left.innerHTML = `<div><b>${t.name}</b><div class="badge tiny">${t.response}</div></div>`;
    const right = document.createElement('div');
    right.innerHTML = `
      <div class="row">
        <button data-id="${t.id}" class="editBtn">✏️</button>
        <button data-id="${t.id}" class="delBtn">🗑️</button>
        <button data-id="${t.id}" class="testBtn">▶️ Test</button>
      </div>
    `;
    el.appendChild(left); el.appendChild(right);
    gesturesListEl.appendChild(el);
  });

  // handlers
  document.querySelectorAll('.delBtn').forEach(b=>{
    b.onclick = ()=>{ const id=b.dataset.id; templates = templates.filter(x=>x.id!==id); renderTemplates(); };
  });
  document.querySelectorAll('.editBtn').forEach(b=>{
    b.onclick = ()=>{
      const id=b.dataset.id; const t = templates.find(x=>x.id===id); if(!t) return;
      const newName = prompt('Ubah nama gesture', t.name); if(newName===null) return;
      const newResp = prompt('Ubah respon suara', t.response); if(newResp===null) return;
      const newCd = prompt('Cooldown (ms) untuk gestur ini', t.cooldown||gestureCooldownInput.value); if(newCd===null) return;
      t.name = newName || t.name; t.response = newResp || t.response; t.cooldown = parseInt(newCd)|| (parseInt(gestureCooldownInput.value)||2500);
      renderTemplates();
    };
  });
  document.querySelectorAll('.testBtn').forEach(b=>{
    b.onclick = ()=>{ const id=b.dataset.id; const t = templates.find(x=>x.id===id); if(t) window.speak(t.response); };
  });
}

/* ====== Auto-name heuristic ====== */
export function autoNameFromTemplate(norm){
  try{
    const tips = [4,8,12,16,20], pips = [3,6,10,14,18];
    let ext = 0;
    for(let i=0;i<5;i++){ if(norm[tips[i]].y < norm[pips[i]].y) ext++; }
    if(ext>=4) return 'open_palm';
    if(ext===0) return 'fist';
    return `${ext}_fingers`;
  }catch(e){ return 'gesture_'+Date.now().toString(36); }
}

btnAutoName.onclick = ()=>{
  if(!recordFrames.length){ alert('Rekam gesture dulu.'); return; }
  const avg = averageFrames(recordFrames);
  const name = autoNameFromTemplate(normalizeLandmarks(avg));
  gestureNameInput.value = name;
};

/* ====== Recording controls ====== */
btnRecord.onclick = ()=>{ recording = true; recordFrames = []; statusEl.innerText = '⏺️ Merekam gesture... tahan sampai selesai.'; };
btnStopRecord.onclick = ()=>{ recording = false; statusEl.innerText = '⏹️ Rekaman dihentikan. Klik Simpan Gestur untuk menyimpan.'; };

/* ====== Save / Export / Import / Clear ====== */
saveBtn.onclick = ()=>{
  if(!recordFrames.length){ alert('Rekam gesture dulu (tombol Rekam).'); return; }
  const avg = averageFrames(recordFrames);
  if(!avg){ alert('Gagal merekam.'); return; }
  const normalized = normalizeLandmarks(avg);
  const name = gestureNameInput.value.trim() || autoNameFromTemplate(normalized);
  const response = gestureResponseInput.value.trim() || prompt('Masukkan respon suara untuk gestur ini:') || 'Halo';
  const cooldown = parseInt(gestureCooldownInput.value) || 2500;
  const id = 'g'+Date.now().toString(36);
  templates.push({id,name,response,cooldown,landmarks:normalized,lastTriggered:0});
  recordFrames = []; recording = false;
  statusEl.innerText = `✅ Gestur "${name}" tersimpan. (${templates.length} total)`;
  renderTemplates();
};

exportBtn.onclick = ()=>{
  const data = JSON.stringify(templates);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='gestures.json'; a.click();
};

importBtn.onclick = ()=> importFile.click();
importFile.onchange = (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    try{
      const data = JSON.parse(ev.target.result);
      if(Array.isArray(data)){
        templates = data.map(d=>({...d, lastTriggered:0}));
        renderTemplates();
        statusEl.innerText = '✅ Import sukses.';
      } else alert('Format JSON tidak valid');
    }catch(err){ alert('File JSON tidak valid'); }
  };
  reader.readAsText(f);
};

clearBtn.onclick = ()=>{
  if(confirm('Hapus semua gesture?')){ templates=[]; renderTemplates(); statusEl.innerText='Semua gesture dihapus'; }
};
