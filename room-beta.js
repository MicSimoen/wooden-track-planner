/* =====================================================================================
   ROOM SCAN — BETA
   Put a 3D scan of your real room around the track: on the 2D plan (seen from above),
   in the 3D view, and on "Ride along".

   Everything for this feature lives in this one file. To remove it again:
     1. delete room-beta.js
     2. index.html: delete the three lines marked ROOM-BETA (in build3D, at the end of the main script, and the <script> tag)
     3. sw.js: delete the lines marked ROOM-BETA (and bump VERSION)
   It stores its own data in localStorage "wtp-room-beta" and IndexedDB "wtp-room-beta";
   nothing in the layout or inventory depends on it, so leftovers are harmless.

   index.html hands it exactly what it may use, in window.RoomBetaApp: V3, svg, svgPt, bbox, loadScript, toast, build3D.
   ===================================================================================== */
(function(){
"use strict";
const A = window.RoomBetaApp; if(!A) return;
const {V3, svg, svgPt, bbox, loadScript, toast, build3D} = A;
const KEY = "wtp-room-beta";
const LIB = "https://cdn.jsdelivr.net/npm/three@0.128.0/";
const NS  = "http://www.w3.org/2000/svg";
const R = Object.assign({ on:false, show2d:true, show3d:true, x:0, z:0, rot:0, lift:0, upright:0, cut:100, opacity:80, placed:false }, readCfg());
function readCfg(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } }
function saveCfg(){ try{ localStorage.setItem(KEY, JSON.stringify(R)); }catch(e){} }

let rec = null;        // {name, ext, buf}  the scan file as loaded
let model = null;      // THREE object as the loader returned it
let norm = null;       // group: turns the scan upright, scales it to mm, floor at 0, centred
let root = null;       // group: where the room sits under the layout (R.x, R.z, R.rot)
let info = null;       // {w, d, h, unit}
let backdrop = null;   // {url, w, d}: the room seen from above, for the 2D plan
let CLIP = null;       // clipping plane: cuts the ceiling away when looking from above
let busy = false, moving = false, status = "";

/* ---------- pure helpers (no THREE; tested on their own) ---------- */
// which unit the file is in, from its largest dimension: rooms are 1.5–20 m
function unitScale(big){ return big < 60 ? {s:1000, unit:"m"} : big < 600 ? {s:10, unit:"cm"} : {s:1, unit:"mm"}; }
// height of the floor: the lowest level that has a big share of all the flat (horizontal) surface
function floorY(T){                    // T: [x,y,z, x,y,z, x,y,z, ...] — 9 numbers per triangle
  const BIN = 20, bins = new Map();
  const tri = (i, f) => { const ux=T[i+3]-T[i], uy=T[i+4]-T[i+1], uz=T[i+5]-T[i+2], vx=T[i+6]-T[i], vy=T[i+7]-T[i+1], vz=T[i+8]-T[i+2];
    const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx, len=Math.hypot(nx,ny,nz);
    if(!len || Math.abs(ny)/len < 0.9) return; f(len/2, (T[i+1]+T[i+4]+T[i+7])/3); };
  for(let i=0;i+8<T.length;i+=9) tri(i,(a,y)=>{ const b=Math.floor(y/BIN); bins.set(b,(bins.get(b)||0)+a); });
  if(!bins.size) return null;
  const max = Math.max(...bins.values());
  const lo = Math.min(...[...bins].filter(([,a])=>a>=0.3*max).map(([b])=>b));
  let sa=0, sy=0;                       // refine: area-weighted mean height around that level
  for(let i=0;i+8<T.length;i+=9) tri(i,(a,y)=>{ if(y>=(lo-1)*BIN && y<(lo+2)*BIN){ sa+=a; sy+=a*y; } });
  return sa ? sy/sa : (lo+0.5)*BIN;
}

/* ---------- storage of the scan file (IndexedDB: too big for localStorage) ---------- */
function db(){ return new Promise((ok,bad)=>{ const q=indexedDB.open(KEY,1); q.onupgradeneeded=()=>q.result.createObjectStore("files"); q.onsuccess=()=>ok(q.result); q.onerror=()=>bad(q.error); }); }
async function dbDo(mode, fn){ const d=await db(); return new Promise((ok,bad)=>{ const t=d.transaction("files",mode), q=fn(t.objectStore("files")); t.oncomplete=()=>ok(q&&q.result); t.onerror=()=>bad(t.error); }); }
const dbGet = k => dbDo("readonly", s=>s.get(k));
const dbPut = (k,v) => dbDo("readwrite", s=>s.put(v,k));
const dbDel = k => dbDo("readwrite", s=>s.delete(k));

/* ---------- loading and fitting the scan ---------- */
async function need3(){
  if(!window.THREE) await loadScript(LIB+"build/three.min.js");
  if(!THREE.GLTFLoader) await loadScript(LIB+"examples/js/loaders/GLTFLoader.js");
  if(!THREE.DRACOLoader) await loadScript(LIB+"examples/js/loaders/DRACOLoader.js");
  if(!THREE.OBJLoader) await loadScript(LIB+"examples/js/loaders/OBJLoader.js");
  if(!CLIP) CLIP = new THREE.Plane(new THREE.Vector3(0,-1,0), 1e7);   // keeps everything below y = constant
}
function parse(r){
  return new Promise((ok,bad)=>{
    if(r.ext==="obj"){ try{ ok(new THREE.OBJLoader().parse(new TextDecoder().decode(r.buf))); }catch(e){ bad(e); } return; }
    const L=new THREE.GLTFLoader(), D=new THREE.DRACOLoader(); D.setDecoderPath(LIB+"examples/js/libs/draco/gltf/"); L.setDRACOLoader(D);
    L.parse(r.buf, "", g=>ok(g.scene || g.scenes[0]), bad);
  });
}
function meshes(o){ const a=[]; o.traverse(m=>{ if(m.isMesh) a.push(m); }); return a; }
function triangles(o, cap=400000){    // world-space triangles of everything under o (sampled when huge)
  o.updateMatrixWorld(true);
  const ms=meshes(o); let total=0; ms.forEach(m=>{ const g=m.geometry; total+=(g.index?g.index.count:g.attributes.position.count)/3; });
  const step=Math.max(1,Math.ceil(total/cap)), out=[], v=new THREE.Vector3();
  ms.forEach(m=>{ const g=m.geometry, p=g.attributes.position, ix=g.index, n=(ix?ix.count:p.count)/3;
    for(let t=0;t<n;t+=step) for(let k=0;k<3;k++){ const j=ix?ix.getX(t*3+k):t*3+k; v.fromBufferAttribute(p,j).applyMatrix4(m.matrixWorld); out.push(v.x,v.y,v.z); } });
  return out;
}
const UPRIGHT = [0, -Math.PI/2, Math.PI/2, Math.PI];
function fit(){
  if(norm){ norm.remove(model); if(norm.parent) norm.parent.remove(norm); }
  norm = new THREE.Group(); norm.add(model); norm.rotation.x = UPRIGHT[R.upright%4]; norm.scale.setScalar(1);
  norm.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(norm), sz=box.getSize(new THREE.Vector3());
  const u=unitScale(Math.max(sz.x,sz.y,sz.z)); norm.scale.setScalar(u.s); norm.updateMatrixWorld(true);
  box.setFromObject(norm);
  const fy = floorY(triangles(norm)); const floor = fy==null ? box.min.y : fy;
  norm.position.set(-(box.min.x+box.max.x)/2, -floor, -(box.min.z+box.max.z)/2);
  info = { w:box.max.x-box.min.x, d:box.max.z-box.min.z, h:box.max.y-floor, unit:u.unit };
  if(!root) root = new THREE.Group();
  root.add(norm); place3D();
}
function prepMaterials(){
  meshes(model).forEach(m=>{ m.castShadow=false; m.receiveShadow=true;
    (Array.isArray(m.material)?m.material:[m.material]).forEach(mt=>{ if(!mt) return; mt.clippingPlanes=[CLIP]; if("metalness" in mt) mt.metalness=0; mt.needsUpdate=true; }); });
}
function place3D(){ if(!root) return; root.position.set(R.x, -R.lift, R.z); root.rotation.y = -R.rot*Math.PI/180; }
function centreOnTrack(){ const b=bbox(); if(b){ R.x=Math.round((b.x0+b.x1)/2); R.z=Math.round((b.y0+b.y1)/2); } R.placed=true; saveCfg(); place3D(); draw2D(); }

async function show(r, fresh){
  busy=true; status="Loading the scan…"; renderSec();
  try{
    await need3();
    model = await parse(r); rec = r; prepMaterials();
    if(fresh){                          // .glb is always upright; for other files pick the turn that makes the room lowest
      R.upright=0;
      if(r.ext!=="glb"){ let best=0, bh=Infinity; [0,1].forEach(k=>{ R.upright=k; fit(); if(info.h<bh){ bh=info.h; best=k; } }); R.upright=best; }
    }
    fit(); if(fresh || !R.placed) centreOnTrack();
    renderBackdrop(); status="";
  }catch(e){
    console.error("room scan", e); model=null; rec=null; info=null; backdrop=null;
    status = (e && /load|fetch|script/i.test(String(e.message||e))) ? "Couldn't load the 3D library — check your internet connection."
           : "Couldn't read that file. Export the scan as .glb and try again.";
  }
  busy=false; renderSec(); draw2D(); refresh3D();
}
async function loadFile(f){
  const ext=(f.name.split(".").pop()||"").toLowerCase();
  if(!["glb","gltf","obj"].includes(ext)){ toast("Use a .glb file (or .gltf / .obj)"); return; }
  const r={ name:f.name, ext, buf:await f.arrayBuffer() };
  await show(r, true);
  if(model){ try{ await dbPut("room", r); }catch(e){ toast("Loaded, but too big to remember for next time"); } }
}
async function forget(){
  stopMoving(); if(root && root.parent) root.parent.remove(root);
  model=norm=root=info=backdrop=rec=null; R.placed=false; saveCfg();
  try{ await dbDel("room"); }catch(e){}
  renderSec(); draw2D(); refresh3D();
}

/* ---------- the room seen from above, as a picture under the 2D plan ---------- */
function renderBackdrop(){
  if(!norm || !info) return;
  const {w,d}=info, k=Math.min(0.5, 2048/Math.max(w,d));          // ≤ 5 px per cm, ≤ 2048 px
  const W=Math.max(2,Math.round(w*k)), H=Math.max(2,Math.round(d*k));
  let r;
  try{
    r=new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true}); r.setSize(W,H,false); r.localClippingEnabled=true;
    const sc=new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff,0x8a8a8a,1.15));
    const keep=norm.parent; sc.add(norm); const p0=norm.position.clone();
    const cam=new THREE.OrthographicCamera(-w/2,w/2,d/2,-d/2,1,50000); cam.position.set(0,20000,0); cam.up.set(0,0,-1); cam.lookAt(0,0,0);
    CLIP.constant = R.cut*10; r.render(sc,cam);
    backdrop = { url:r.domElement.toDataURL("image/png"), w, d };
    norm.position.copy(p0); if(keep) keep.add(norm);
  }catch(e){ console.error("room backdrop", e); backdrop=null; }
  if(r){ r.dispose(); if(r.forceContextLoss) r.forceContextLoss(); }
}
let img=null;
function layer(){
  let g=document.getElementById("layerRoom");
  if(!g){ g=document.createElementNS(NS,"g"); g.id="layerRoom"; g.setAttribute("pointer-events","none");
    const bg=document.getElementById("bg"); bg.parentNode.insertBefore(g,bg); }          // under the grid, so the grid stays readable
  return g;
}
function draw2D(){
  const g=layer();
  if(!R.on || !R.show2d || !backdrop){ g.style.display="none"; return; }
  g.style.display="";
  if(!img || img.dataset.url!==backdrop.url.slice(-64)){
    g.textContent=""; img=document.createElementNS(NS,"image"); img.dataset.url=backdrop.url.slice(-64);
    img.setAttribute("href",backdrop.url); img.setAttribute("preserveAspectRatio","none");
    const fr=document.createElementNS(NS,"rect"); fr.setAttribute("fill","none"); fr.setAttribute("stroke","#2f6fde"); fr.setAttribute("stroke-width","6"); fr.setAttribute("stroke-dasharray","24 14"); fr.id="roomFrame";
    g.append(img, fr);
  }
  const {w,d}=backdrop;
  [img, g.querySelector("#roomFrame")].forEach(e=>{ e.setAttribute("x",-w/2); e.setAttribute("y",-d/2); e.setAttribute("width",w); e.setAttribute("height",d); });
  img.setAttribute("opacity", R.opacity/100);
  g.querySelector("#roomFrame").style.display = moving ? "" : "none";
  g.setAttribute("transform",`translate(${R.x} ${R.z}) rotate(${R.rot})`);
}

/* ---------- moving / turning the room on the plan ---------- */
let bar=null, drag=null;
function startMoving(){
  if(!backdrop) return; moving=true; R.show2d=true; draw2D();
  if(!bar){ bar=document.createElement("div"); bar.id="roomBar";
    bar.style.cssText="position:absolute;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;"+
      "background:#fff;border:2px solid #2f6fde;border-radius:12px;padding:6px 10px;box-shadow:0 4px 14px rgba(0,0,0,.15);font-size:13px";
    bar.innerHTML=`<span>✋ Drag the room</span><button data-r="-15">↺ 15°</button><button data-r="-1">↺ 1°</button><button data-r="1">↻ 1°</button><button data-r="15">↻ 15°</button><button data-done class="primary">Done</button>`;
    bar.addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return;
      if(b.dataset.done!==undefined){ stopMoving(); return; }
      R.rot=((R.rot+(+b.dataset.r))%360+360)%360; saveCfg(); place3D(); draw2D(); });
    (svg.parentNode).appendChild(bar); }
  bar.style.display="flex"; renderSec();
}
function stopMoving(){ moving=false; drag=null; if(bar) bar.style.display="none"; saveCfg(); draw2D(); renderSec(); }
// capture phase on window: while moving, the plan's own dragging/panning doesn't see these pointers
window.addEventListener("pointerdown",e=>{
  if(!moving || !svg.contains(e.target)) return; e.stopImmediatePropagation(); e.preventDefault();
  if(drag) return; const p=svgPt(e); drag={id:e.pointerId, x:p.x, y:p.y, rx:R.x, rz:R.z};
},true);
window.addEventListener("pointermove",e=>{
  if(!moving || !drag || e.pointerId!==drag.id) return; e.stopImmediatePropagation();
  const p=svgPt(e); R.x=Math.round(drag.rx+p.x-drag.x); R.z=Math.round(drag.rz+p.y-drag.y); place3D(); draw2D();
},true);
const up=e=>{ if(!moving) return; if(drag && e.pointerId===drag.id){ drag=null; saveCfg(); } if(svg.contains(e.target)) e.stopImmediatePropagation(); };
window.addEventListener("pointerup",up,true); window.addEventListener("pointercancel",up,true);

/* ---------- 3D view hook (called from build3D) ---------- */
function v3open(){ const v=document.getElementById("v3d"); return v && v.classList.contains("show"); }
function refresh3D(){ if(V3.ready && v3open()) build3D(); }
function add3D(G){
  if(!R.on || !R.show3d || !root || !model || !V3.ready) return false;
  V3.r.localClippingEnabled = true;
  CLIP.constant = (V3.ride && V3.ride.on) ? 1e7 : R.cut*10;   // riding: the whole room; from above: ceiling cut away
  place3D(); G.add(root);
  V3.scene.background = new THREE.Color(0xeef2f6);
  return true;                                                  // build3D then skips its own floor
}

/* ---------- the "Room scan (beta)" section at the end of Settings ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function secHTML(){
  let h=`<h3>🧪 Room scan <span style="font-size:10px;background:#2f6fde;color:#fff;border-radius:6px;padding:1px 6px;vertical-align:2px">BETA</span></h3>
  <label class="chk2"><input type="checkbox" id="rbOn" ${R.on?"checked":""}> Try it: put a 3D scan of your room around the track</label>`;
  if(!R.on) return h;
  h+=`<p class="hint2">Scan the room with a free scanning app (for example Polycam, Scaniverse or 3D Scanner App), export it as a <b>.glb</b> file and load it here. The room then shows on the plan, in the 3D view and when you ride along.</p>
  <p><button id="rbPick" ${busy?"disabled":""}>📂 ${model?"Load another scan…":"Load room scan…"}</button> ${model?`<button id="rbDel" class="danger">Remove scan</button>`:""}
  <input type="file" id="rbFile" style="display:none"></p>`;
  if(status) h+=`<p class="hint2">${esc(status)}</p>`;
  if(!model || !info) return h;
  h+=`<p class="hint2"><b>${esc(rec.name)}</b> · ${(info.w/1000).toFixed(1)} × ${(info.d/1000).toFixed(1)} m, ${(info.h/1000).toFixed(1)} m high
      ${info.unit!=="m"?` (file measured in ${info.unit})`:""}. Wrong size or a wall lying on the floor? Try <a href="#" id="rbUp">turning it upright</a>.</p>
  <p><button id="rbMove" class="primary" ${moving?"disabled":""}>✋ Move / turn the room</button> <button id="rbCentre">Centre on the track</button></p>
  <label class="chk2"><input type="checkbox" id="rbShow2" ${R.show2d?"checked":""}> Show on the plan</label>
  <label class="chk2"><input type="checkbox" id="rbShow3" ${R.show3d?"checked":""}> Show in 3D and when riding along</label>
  <label>Room on the plan: how strong (%)<input id="rbOp" type="range" min="15" max="100" step="5" value="${R.opacity}" style="width:100%"></label>
  <label>Cut away everything higher than (cm) — to look in from above<input id="rbCut" type="number" min="10" step="10" value="${R.cut}"></label>
  <label>Track above the scanned floor (mm) — if it sinks in or floats<input id="rbLift" type="number" step="1" value="${R.lift}"></label>`;
  return h;
}
function renderSec(){ const s=document.getElementById("rbSec"); if(s) s.innerHTML=secHTML(); }
function injectSec(){
  const sets=document.querySelector("#inv .sets"); if(!sets || document.getElementById("rbSec")) return;
  const d=document.createElement("div"); d.id="rbSec"; d.innerHTML=secHTML();
  const det=sets.querySelector(":scope > details"); det ? sets.insertBefore(d,det) : sets.appendChild(d);
}
const inv=document.getElementById("inv");
new MutationObserver(injectSec).observe(inv,{childList:true});
injectSec();
inv.addEventListener("click",e=>{
  const id=e.target.id; if(!id || !id.startsWith("rb")) return;
  if(id==="rbPick"){ document.getElementById("rbFile").click(); }
  else if(id==="rbDel"){ forget(); toast("Room scan removed"); }   // no confirm dialog: those freeze the app on iPad, and the file can just be loaded again
  else if(id==="rbMove"){ startMoving(); }
  else if(id==="rbCentre"){ centreOnTrack(); toast("Room centred on the track"); }
  else if(id==="rbUp"){ e.preventDefault(); R.upright=(R.upright+1)%4; saveCfg(); fit(); renderBackdrop(); renderSec(); draw2D(); refresh3D(); }
});
inv.addEventListener("change",e=>{
  const t=e.target; if(!t.id || !t.id.startsWith("rb")) return;
  if(t.id==="rbOn"){ R.on=t.checked; saveCfg(); if(!R.on){ stopMoving(); if(root&&root.parent) root.parent.remove(root); } else if(!model) restore(); renderSec(); draw2D(); refresh3D(); }
  if(t.id==="rbFile" && t.files[0]) loadFile(t.files[0]);
  if(t.id==="rbShow2"){ R.show2d=t.checked; saveCfg(); draw2D(); }
  if(t.id==="rbShow3"){ R.show3d=t.checked; saveCfg(); refresh3D(); }
  if(t.id==="rbCut"){ R.cut=Math.max(10,+t.value||100); saveCfg(); renderBackdrop(); draw2D(); refresh3D(); }
  if(t.id==="rbLift"){ R.lift=+t.value||0; saveCfg(); place3D(); refresh3D(); }
});
inv.addEventListener("input",e=>{ if(e.target.id==="rbOp"){ R.opacity=+e.target.value; saveCfg(); draw2D(); } });

/* ---------- start: bring back the scan from last time ---------- */
async function restore(){ try{ const r=await dbGet("room"); if(r && r.buf) await show(r, false); }catch(e){ console.warn("room scan: nothing restored", e); } }
if(R.on) setTimeout(restore, 400);

window.RoomBeta = { add3D, _test:{ floorY, unitScale, cfg:R, fakeBackdrop(b){ backdrop=b; draw2D(); }, startMoving, stopMoving } };
})();
