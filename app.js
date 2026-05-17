import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import{getFirestore,collection,addDoc,getDocs,doc,updateDoc,query,where}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
const FB={apiKey:"AIzaSyCtG3HMUGdDDht9wliTpl1jKYg7dLk76v0",authDomain:"papaleta-f8ff5.firebaseapp.com",projectId:"papaleta-f8ff5",storageBucket:"papaleta-f8ff5.firebasestorage.app",messagingSenderId:"934397525448",appId:"1:934397525448:web:aa9afabfb01b6b1dfed4fd"};
// IMPORTANTE: En producción, esta key debe estar en una variable de entorno
// y las llamadas a la API deben hacerse desde un backend seguro
const GK=window.GROQ_API_KEY||''; // Configurar en variables de entorno
const app2=initializeApp(FB),auth=getAuth(app2),db=getFirestore(app2);
const $=id=>document.getElementById(id);
let user=null,ideaId=null,ideas=[],imgB64=null,recog=null,lastImgPrompt='',qaQ=[],qaA=[],qaText='',qaImg=null,liveVisualTimer=null,liveVisualPrompt='',wired=false,localMode=localStorage.getItem('pp_local_mode')==='1';
const IMG_API_KEY_STORAGE='pp_pollinations_key';
const toast=(m,ms=3000)=>{const t=$('toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(window._tt);window._tt=setTimeout(()=>t.classList.add('hidden'),ms);};

// Actualizar perfil de usuario en el dashboard
function updateUserProfile(u){
  const firstName=u.displayName?.split(' ')[0]||'Usuario';
  const initials=u.displayName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'U';
  
  // Actualizar sidebar
  if($('uname'))$('uname').textContent=firstName;
  if($('uavatar'))$('uavatar').src=u.photoURL||'';
  
  // Actualizar dashboard header
  if($('user-greeting'))$('user-greeting').textContent=`Hola ${firstName}, ¿qué ideas tienes hoy?`;
  
  // Foto de perfil en dashboard
  const profilePic=$('user-profile-pic');
  if(profilePic){
    if(u.photoURL){
      profilePic.innerHTML=`<img src="${u.photoURL}" alt="${firstName}" class="profile-img"/>`;
    }else{
      profilePic.innerHTML=`<div class="profile-initials">${initials}</div>`;
    }
  }
}

async function aiCall(prompt,img=null){
  const model=img?'meta-llama/llama-4-scout-17b-16e-instruct':'llama-3.3-70b-versatile';
  const content=img?[{type:'image_url',image_url:{url:`data:image/jpeg;base64,${img}`}},{type:'text',text:prompt}]:prompt;
  const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+GK},body:JSON.stringify({model,messages:[{role:'user',content}],temperature:.7,max_tokens:2048})});
  if(!r.ok)throw new Error((await r.json()).error?.message||'HTTP '+r.status);
  return(await r.json()).choices?.[0]?.message?.content||'';
}

window.addEventListener('DOMContentLoaded',()=>{
  onAuthStateChanged(auth,async u=>{
    if(u){
      localMode=false;
      localStorage.removeItem('pp_local_mode');
      user=u;
      $('login').classList.add('hidden');
      $('app').classList.remove('hidden');
      
      // Actualizar perfil de usuario
      updateUserProfile(u);
      
      await loadIdeas();
      renderNav();
      showDashboard();
      
      // CRÍTICO: Inicializar event listeners DESPUÉS de mostrar el app
      wire();
    }else{
      if(localMode){await startLocalSession();return;}
      $('login').classList.remove('hidden');
      $('app').classList.add('hidden');
    }
  });
  
  // Solo inicializar el botón de login antes de autenticar
  if($('btn-login'))$('btn-login').onclick=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>toast('Error: '+e.message));
  if($('btn-local'))$('btn-local').onclick=async()=>{localMode=true;localStorage.setItem('pp_local_mode','1');await startLocalSession();};
});

async function startLocalSession(){
  user={uid:'local',displayName:'Creador Local',photoURL:''};
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
  updateUserProfile(user);
  await loadIdeas();
  renderNav();
  showDashboard();
  wire();
  toast('Modo local gratis activado');
}

function showDashboard(){
  if($('dashboard'))$('dashboard').classList.remove('hidden');
  if($('workspace'))$('workspace').classList.add('hidden');
  renderHeatmap();
  const h=JSON.parse(localStorage.getItem('pp_hm')||'{}');
  const total=Object.values(h).reduce((a,b)=>a+b,0);
  const streak=calcStreak(h);
  if($('dhc-total'))$('dhc-total').textContent=total+' acciones';
  
  // Stats
  const completed=ideas.filter(i=>i.progress>=100).length;
  const inProgress=ideas.filter(i=>i.progress>0&&i.progress<100).length;
  if($('stat-total'))$('stat-total').textContent=ideas.length;
  if($('stat-progress'))$('stat-progress').textContent=inProgress;
  if($('stat-completed'))$('stat-completed').textContent=completed;
  if($('stat-streak'))$('stat-streak').textContent=streak;
  
  // Renderizar ideas recientes
  renderIdeasGrid();
}
window.showDashboard=showDashboard;
function calcStreak(h){
  let s=0;const now=new Date();
  for(let i=0;i<365;i++){const d=new Date(now);d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);if(h[k]>0)s++;else break;}
  return s;
}

// Renderizar grid de ideas recientes
function renderIdeasGrid(){
  const grid=$('ideas-grid');
  if(!grid)return;
  
  if($('dis-count'))$('dis-count').textContent=`${ideas.length} ${ideas.length===1?'idea':'ideas'}`;
  
  if(!ideas.length){
    grid.innerHTML=`
      <div class="ideas-empty">
        <div class="ie-icon">✨</div>
        <p class="ie-text">Aún no has creado ninguna idea.<br>¡Empieza ahora y potencia tus proyectos con IA!</p>
        <button class="btn-primary" onclick="document.getElementById('btn-new').click()">
          <span>+</span> Crear Primera Idea
        </button>
      </div>
    `;
    return;
  }
  
  // Mostrar las 10 ideas más recientes
  const recentIdeas=ideas.slice(0,10);
  grid.innerHTML=recentIdeas.map(idea=>{
    const date=idea.createdAt?new Date(idea.createdAt).toLocaleDateString('es',{day:'numeric',month:'short'}):'Hoy';
    const hasImage=idea.imgPrompt||idea.imgUrl;
    
    return `
      <div class="idea-card" onclick="window.__ld('${idea.id}')">
        <div class="ic-image">
          ${hasImage?`<img src="${idea.imgUrl||'https://picsum.photos/seed/'+idea.id+'/280/160'}" alt="${idea.title||'Idea'}"/>`:`<div class="ic-image-placeholder">💡</div>`}
        </div>
        <div class="ic-body">
          <div class="ic-header">
            <span class="ic-tag">${idea.tag||'Idea'}</span>
            <span class="ic-progress">${idea.progress||0}%</span>
          </div>
          <h3 class="ic-title">${idea.title||'Sin título'}</h3>
          <div class="ic-date">${date}</div>
        </div>
      </div>
    `;
  }).join('');
}

function wire(){
  if(wired)return;
  wired=true;
  $('btn-login').onclick=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>toast('Error: '+e.message));
  $('btn-logout').onclick=()=>{localStorage.removeItem('pp_local_mode');localMode=false;user=null;signOut(auth).finally(()=>location.reload());};
  $('btn-new').onclick=newIdea;
  $('btn-collapse').onclick=()=>$('sidebar').classList.toggle('collapsed');
  $('btn-hamburger').onclick=()=>{$('sidebar').classList.toggle('open');$('sb-overlay').classList.toggle('hidden');};
  $('sb-overlay').onclick=()=>{$('sidebar').classList.remove('open');$('sb-overlay').classList.add('hidden');};
  
  // Dark Mode Toggle
  $('btn-dark-mode').onclick=toggleDarkMode;
  loadDarkMode();
  
  $('btn-analyze').onclick=analyze;
  $('idea-text').addEventListener('input',()=>scheduleLiveVisual($('idea-text').value));
  setupImageApiSettings();
  $('file-img').onchange=e=>loadImg(e.target.files[0]);
  $('btn-rm-img').onclick=clearImg;
  $('btn-voice').onclick=toggleVoice;
  $('btn-stop-voice').onclick=stopVoice;
  $('chat-fab').onclick=()=>$('chat-panel').classList.toggle('hidden');
  $('btn-close-chat').onclick=()=>$('chat-panel').classList.add('hidden');
  $('btn-send').onclick=sendChat;
  $('chat-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}};
  $('chat-file').onchange=e=>chatImg(e.target.files[0]);
  $('btn-regen-img').onclick=()=>lastImgPrompt&&genImg(lastImgPrompt);
  $('idea-title').addEventListener('blur',()=>sF('title',$('idea-title').textContent.trim()));
  $('master-doc').addEventListener('blur',()=>sF('doc',$('master-doc').innerHTML));
  $('file-timeline').onchange=e=>addTLPhotos(e.target.files);
  document.addEventListener('mouseup',handleSel);
  document.querySelectorAll('.fm-btn').forEach(b=>b.onclick=()=>floatAI(b.dataset.action));
  document.querySelectorAll('.tb-btn').forEach(b=>b.onclick=()=>{document.execCommand(b.dataset.cmd,'false',b.dataset.val||null);$('master-doc').focus();});
  setupKanban();
}

// CRUD
async function loadIdeas(){
  ideas=JSON.parse(localStorage.getItem('pp_ideas')||'[]').filter(i=>i.uid===user?.uid||i.uid==='local');
  if(db&&user&&user.uid!=='local')try{const snap=await getDocs(query(collection(db,'ideas'),where('uid','==',user.uid)));const fs=snap.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()?.toISOString()||new Date().toISOString()}));if(fs.length){fs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));ideas=fs;localStorage.setItem('pp_ideas',JSON.stringify(ideas));}}catch(e){}
}
async function sF(field,val){
  if(!ideaId)return;const local=JSON.parse(localStorage.getItem('pp_ideas')||'[]');const ix=local.findIndex(i=>i.id===ideaId);
  if(ix>=0){local[ix][field]=val;localStorage.setItem('pp_ideas',JSON.stringify(local));}ideas=local;renderNav();logAct();
  if(db&&user?.uid!=='local'&&ideaId&&!ideaId.startsWith('l_'))try{await updateDoc(doc(db,'ideas',ideaId),{[field]:val});}catch(e){}
}
async function saveNew(data){
  const p={uid:user?.uid||'local',title:data.title||'Sin título',tag:data.tag||'Idea',rawText:qaText,doc:data.doc||'',imgPrompt:data.imgPrompt||'',imgUrl:data.imgUrl||'',kanban:{todo:[],doing:[],done:[]},timeline:[],progress:0,createdAt:new Date().toISOString()};
  const local=JSON.parse(localStorage.getItem('pp_ideas')||'[]');
  if(ideaId){const ix=local.findIndex(i=>i.id===ideaId);if(ix>=0)local[ix]={...local[ix],...p};else local.unshift({id:ideaId,...p});}
  else{ideaId='l_'+Date.now();local.unshift({id:ideaId,...p});}
  localStorage.setItem('pp_ideas',JSON.stringify(local));
  if(db&&user&&user.uid!=='local')try{const fp={...p,createdAt:new Date()};if(ideaId.startsWith('l_')){const r=await addDoc(collection(db,'ideas'),fp);const ix=local.findIndex(i=>i.id===ideaId);if(ix>=0){local[ix].id=r.id;ideaId=r.id;}localStorage.setItem('pp_ideas',JSON.stringify(local));}else await updateDoc(doc(db,'ideas',ideaId),fp);}catch(e){}
  ideas=JSON.parse(localStorage.getItem('pp_ideas')||'[]');renderNav();
}

function renderNav(){
  const list=$('ideas-nav');
  if(!ideas.length){list.innerHTML='<div class="empty-nav">Crea tu primera idea ✨</div>';return;}
  list.innerHTML=ideas.map(i=>`<div class="idea-nav-item${i.id===ideaId?' active':''}" onclick="window.__ld('${i.id}')"><div class="ini-title">${i.title||'Sin título'}</div><div class="ini-meta"><span class="ini-tag">${i.tag||'Idea'}</span><span class="ini-pct">${i.progress||0}%</span></div></div>`).join('');
}
window.__ld=id=>{const i=ideas.find(x=>x.id===id);if(i){ideaId=id;renderNav();loadWS(i);$('sidebar').classList.remove('open');$('sb-overlay').classList.add('hidden');}};

function loadWS(idea){
  if($('dashboard'))$('dashboard').classList.add('hidden');
  if($('workspace'))$('workspace').classList.remove('hidden');
  if($('idea-title'))$('idea-title').textContent=idea.title||'Sin título';
  if($('idea-tag'))$('idea-tag').textContent=idea.tag||'Idea';
  if($('idea-date'))$('idea-date').textContent=idea.createdAt?new Date(idea.createdAt).toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'}):'Hoy';
  setPct(idea.progress||0);
  if(idea.doc){
    if($('input-zone'))$('input-zone').classList.add('hidden');
    if($('qa-zone'))$('qa-zone').classList.add('hidden');
    if($('results'))$('results').classList.remove('hidden');
    if($('master-doc'))$('master-doc').innerHTML=idea.doc;
    if(idea.imgPrompt){
      lastImgPrompt=idea.imgPrompt;
      genImg(idea.imgPrompt);
    }else if($('hero-wrap'))$('hero-wrap').innerHTML='<div class="hero-no-img">Sin imagen<br><button onclick="window.__regen()">🎨 Generar</button></div>';
    if(idea.kanban)loadKanban(idea.kanban);
    renderTL(idea.timeline||[]);
  }else{
    if($('results'))$('results').classList.add('hidden');
    if($('input-zone'))$('input-zone').classList.remove('hidden');
    if($('idea-text'))$('idea-text').value=idea.rawText||'';
  }
  resetChat();
  addBubble('ai',`Estás en **${idea.title||'tu idea'}**. Puedo editar el documento, agregar tareas o actualizar progreso. 🚀`);
}

function newIdea(){
  ideaId=null;
  renderNav();
  
  // Validar que los elementos existan antes de usarlos
  if($('dashboard'))$('dashboard').classList.add('hidden');
  if($('workspace'))$('workspace').classList.remove('hidden');
  if($('idea-title'))$('idea-title').textContent='Nueva idea';
  if($('idea-tag'))$('idea-tag').textContent='Idea';
  if($('idea-date'))$('idea-date').textContent='Ahora';
  if($('idea-text'))$('idea-text').value='';
  
  clearImg();
  setPct(0);
  
  if($('results'))$('results').classList.add('hidden');
  if($('qa-zone'))$('qa-zone').classList.add('hidden');
  if($('input-zone'))$('input-zone').classList.remove('hidden');
  
  ['k-todo','k-doing','k-done'].forEach(id=>{if($(id))$(id).innerHTML='';});
  if($('master-doc'))$('master-doc').innerHTML='';
  if($('timeline'))$('timeline').innerHTML='';
  
  lastImgPrompt='';
  resetChat();
  
  if($('sidebar'))$('sidebar').classList.remove('open');
  if($('sb-overlay'))$('sb-overlay').classList.add('hidden');
}

// Q&A + ANALYZE
async function analyze(){
  const text=$('idea-text').value.trim();if(!text&&!imgB64){toast('Escribe tu idea primero');return;}
  $('btn-analyze').disabled=true;$('analyze-lbl').textContent='Analizando…';$('analyze-spin').classList.remove('hidden');
  qaText=text;qaImg=imgB64;qaQ=[];qaA=[];
  try{const raw=await aiCall(`Idea: "${text}"${imgB64?'\n[Imagen]':''}.\nHaz 4-5 preguntas cortas y específicas (español) sobre mercado, recursos, diferencial.\nSOLO JSON: {"questions":["P1?","P2?"]}`,imgB64);
    qaQ=JSON.parse(raw.replace(/```json|```/g,'').trim().match(/\{[\s\S]*\}/)[0]).questions||[];
    if(qaQ.length){$('btn-analyze').disabled=false;$('analyze-lbl').textContent='🔍 Analizar con IA';$('analyze-spin').classList.add('hidden');showQA(0);return;}
  }catch(e){
    qaQ=buildFreeQuestions(text);
    if(qaQ.length){$('btn-analyze').disabled=false;$('analyze-lbl').textContent='🔍 Analizar con IA';$('analyze-spin').classList.add('hidden');showQA(0);toast('Modo gratis local: preguntas generadas sin API');return;}
  }
  $('btn-analyze').disabled=false;$('analyze-lbl').textContent='🔍 Analizar con IA';$('analyze-spin').classList.add('hidden');
  runFull(text,imgB64,[]);
}

function showQA(idx){
  const z=$('qa-zone');z.innerHTML='';z.classList.remove('hidden');$('input-zone').classList.add('hidden');
  if(idx>=qaQ.length){z.classList.add('hidden');runFull(qaText,qaImg,qaA);return;}
  z.innerHTML=`<div class="qa-card"><div class="qa-counter">PREGUNTA ${idx+1} DE ${qaQ.length}</div><div class="qa-progress"><div class="qa-progress-fill" style="width:${(idx/qaQ.length)*100}%"></div></div><div class="qa-question">${qaQ[idx]}</div><textarea class="qa-textarea" id="qa-ans" placeholder="Tu respuesta…"></textarea><div class="qa-actions"><button class="qa-skip" onclick="window.__qs(${idx})">Omitir</button><button class="qa-next" onclick="window.__qn(${idx})">Siguiente →</button></div></div>`;
  $('qa-ans').focus();$('qa-ans').onkeydown=e=>{if(e.key==='Enter'&&e.ctrlKey)window.__qn(idx);};
}
window.__qn=i=>{qaA.push({q:qaQ[i],a:$('qa-ans')?.value.trim()||'(vacío)'});showQA(i+1);};
window.__qs=i=>{qaA.push({q:qaQ[i],a:'(omitido)'});showQA(i+1);};

async function runFull(text,img,ans){
  if($('qa-zone'))$('qa-zone').classList.add('hidden');
  if($('input-zone'))$('input-zone').classList.add('hidden');
  if($('results'))$('results').classList.remove('hidden');
  if($('hero-wrap'))$('hero-wrap').innerHTML='<div class="hero-loading"><span class="spin"></span> Generando imagen…</div>';
  const ctx=ans.length?`\nCONTEXTO:\n${ans.map(a=>`• ${a.q} → ${a.a}`).join('\n')}`:'';
  try{
    const raw=await aiCall(`Experto en product design. Analiza y responde SOLO JSON:\n{"title":"Título","tag":"App|Negocio|Proyecto|Otro","doc":"<h3>🎯 Qué es</h3><p>...</p><h3>💡 Solución</h3><p>...</p><h3>🛠️ Materiales</h3><ul><li>...</li></ul><h3>📋 Pasos</h3><ol><li>...</li></ol><h3>💰 Monetización</h3><p>...</p><h3>⚠️ Riesgos</h3><ul><li>...</li></ul>","imgPrompt":"English prompt for photorealistic product mockup","roadmap":["Tarea1","Tarea2","Tarea3","Tarea4","Tarea5"]}\nIDEA: ${text}${ctx}`,img);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim().match(/\{[\s\S]*\}/)[0]);
    if($('idea-title'))$('idea-title').textContent=d.title||'Idea';
    if($('idea-tag'))$('idea-tag').textContent=d.tag||'Idea';
    if($('master-doc'))$('master-doc').innerHTML=d.doc||'';
    ['k-todo','k-doing','k-done'].forEach(id=>{if($(id))$(id).innerHTML='';});
    (d.roadmap||[]).forEach(t=>makeCard(t,'k-todo'));
    lastImgPrompt=d.imgPrompt||d.title;
    genImg(lastImgPrompt);
    d.rawText=text;
    await saveNew(d);
    logAct();
    toast('✅ ¡Idea analizada!');
  }catch(e){
    const d=buildFreeIdea(text,ans);
    if($('idea-title'))$('idea-title').textContent=d.title;
    if($('idea-tag'))$('idea-tag').textContent=d.tag;
    if($('master-doc'))$('master-doc').innerHTML=d.doc;
    ['k-todo','k-doing','k-done'].forEach(id=>{if($(id))$(id).innerHTML='';});
    d.roadmap.forEach(t=>makeCard(t,'k-todo'));
    lastImgPrompt=d.imgPrompt;
    genImg(lastImgPrompt);
    d.rawText=text;
    await saveNew(d);
    logAct();
    toast('✅ Idea creada en modo gratis local');
  }
}

function buildFreeQuestions(text){
  if((text||'').trim().length<12)return[];
  return[
    '¿Para quién es esta idea?',
    '¿Qué problema resuelve de forma concreta?',
    '¿Qué materiales, recursos o habilidades tienes ya?',
    '¿Qué la haría diferente a otras opciones?',
    '¿Cuál sería el primer prototipo pequeño que puedes probar?'
  ];
}

function buildFreeIdea(text,ans=[]){
  const clean=(text||'Idea nueva').trim();
  const short=clean.split(/[.!?\n]/)[0].slice(0,70).trim()||'Idea nueva';
  const ctx=ans.filter(a=>a.a&&!/omitido|vacío/.test(a.a)).map(a=>`<li><strong>${escapeHTML(a.q)}</strong> ${escapeHTML(a.a)}</li>`).join('');
  const title=toTitle(short);
  const tag=detectSpanishTag(clean);
  const doc=`<h3>Qué es</h3><p>${escapeHTML(clean)}</p><h3>Enfoque</h3><p>Convierte la idea en un prototipo simple, visible y comprobable antes de gastar dinero.</p>${ctx?`<h3>Respuestas clave</h3><ul>${ctx}</ul>`:''}<h3>Primeros pasos</h3><ol><li>Definir el usuario principal.</li><li>Hacer un boceto o maqueta rápida.</li><li>Probarlo con una persona real.</li><li>Anotar qué funcionó y qué hay que ajustar.</li></ol><h3>Riesgos</h3><ul><li>Intentar hacerlo demasiado grande al inicio.</li><li>No validar si alguien realmente lo necesita.</li></ul>`;
  return{
    title,
    tag,
    doc,
    imgPrompt:buildVisualPrompt(clean),
    roadmap:['Definir usuario principal','Bocetar la solución','Crear prototipo simple','Probar con alguien real','Mejorar con feedback']
  };
}

function detectSpanishTag(text){
  const lower=(text||'').toLowerCase();
  if(/app|web|software|plataforma|digital|ia|inteligencia/.test(lower))return'App';
  if(/venta|tienda|cliente|negocio|emprend/.test(lower))return'Negocio';
  if(/producto|fabric|material|objeto|prototipo/.test(lower))return'Producto';
  return'Proyecto';
}

function toTitle(text){
  return text.toLowerCase().replace(/(^|\s)\S/g,l=>l.toUpperCase());
}

function escapeHTML(text){
  return String(text||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function setupImageApiSettings(){
  const input=$('pollinations-key');
  const btn=$('btn-save-img-api');
  if(!input||!btn)return;
  input.value=localStorage.getItem(IMG_API_KEY_STORAGE)||'';
  btn.onclick=()=>{
    const key=input.value.trim();
    if(key)localStorage.setItem(IMG_API_KEY_STORAGE,key);
    else localStorage.removeItem(IMG_API_KEY_STORAGE);
    toast(key?.startsWith('sk_')?'Key sk_ guardada solo para prueba local':'Key de imagen guardada');
  };
}

function getImageApiKey(){
  return localStorage.getItem(IMG_API_KEY_STORAGE)||'';
}

// IMAGE — Pollinations via current API, with old free URL as backup
function genImg(prompt){
  const w=$('hero-wrap');
  if(!w)return;
  const visualPrompt=buildVisualPrompt(prompt);
  w.innerHTML='<div class="hero-loading"><span class="spin"></span> Generando imagen con IA…</div>';
  loadGeneratedImage(visualPrompt,src=>showHeroImg(w,src),err=>showMinimalPlaceholder(w,visualPrompt,err),1024,576);
}

function scheduleLiveVisual(text){
  const preview=$('live-visual-preview');
  const title=$('live-visual-title');
  const status=$('live-visual-status');
  if(!preview||!title||!status)return;
  const clean=(text||'').trim();
  clearTimeout(liveVisualTimer);
  if(clean.length<12){
    liveVisualPrompt='';
    title.textContent='Empieza a hablar para visualizar la idea';
    status.textContent='Con 2 o 3 palabras más genero una imagen.';
    preview.innerHTML='<div class="lv-empty">Tu imagen aparecerá aquí mientras dictas la idea.</div>';
    return;
  }
  title.textContent=clean.split(/[.!?\n]/)[0].slice(0,72);
  status.textContent=getImageApiKey()?'Generando con tu key de Pollinations…':'Sin key: intentando respaldo gratuito viejo.';
  liveVisualTimer=setTimeout(()=>updateLiveVisual(clean),900);
}

function updateLiveVisual(text){
  const preview=$('live-visual-preview');
  const status=$('live-visual-status');
  if(!preview||!status)return;
  const prompt=buildVisualPrompt(text);
  if(prompt===liveVisualPrompt)return;
  liveVisualPrompt=prompt;
  preview.innerHTML='<div class="hero-loading"><span class="spin"></span> Creando vista…</div>';
  loadGeneratedImage(prompt,src=>{
    preview.innerHTML=`<img src="${src}" alt="Visualización generada de la idea">`;
    status.textContent='Imagen generada. Puedes seguir dictando y se actualizará.';
  },err=>{
    preview.innerHTML='<div class="lv-empty">No pude cargar la imagen ahora. Reintenta o sigue escribiendo.</div>';
    status.textContent=err||'El generador no respondió en este intento.';
  },640,360);
}

async function loadGeneratedImage(prompt,onload,onerror,width=1024,height=576){
  const key=getImageApiKey();
  try{
    if(key){
      const src=await generateWithPollinationsApi(prompt,width,height,key);
      onload(src);
      return;
    }
    const proxySrc=await generateWithBackendProxy(prompt,width,height);
    if(proxySrc){
      onload(proxySrc);
      return;
    }
    const src=await loadImageUrlWithTimeout(pollinationsPublicUrl(prompt,width,height),65000);
    onload(src);
  }catch(e){
    try{
      const src=await loadImageUrlWithTimeout(pollinationsLegacyUrl(prompt,width,height),65000);
      onload(src);
    }catch(e2){
      onerror?.(friendlyImageError(e2||e));
    }
  }
}

async function generateWithPollinationsApi(prompt,width,height,key){
  const r=await fetch('https://gen.pollinations.ai/v1/images/generations',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+key
    },
    body:JSON.stringify({
      model:'flux',
      prompt,
      n:1,
      size:`${width}x${height}`,
      quality:'medium',
      response_format:'b64_json',
      safe:'true'
    })
  });
  if(!r.ok){
    let msg='HTTP '+r.status;
    try{msg=(await r.json()).error?.message||msg;}catch(e){}
    throw new Error(msg);
  }
  const data=await r.json();
  const item=data?.data?.[0]||{};
  if(item.b64_json)return`data:image/png;base64,${item.b64_json}`;
  if(item.url)return await loadImageUrlWithTimeout(item.url,65000);
  throw new Error('La API no devolvió imagen');
}

async function generateWithBackendProxy(prompt,width,height){
  try{
    const r=await fetch('/api/generate-image',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prompt,width,height})
    });
    if(r.status===404)return null;
    if(!r.ok){
      let msg='HTTP '+r.status;
      try{msg=(await r.json()).error||msg;}catch(e){}
      throw new Error(msg);
    }
    const data=await r.json();
    return data.image||null;
  }catch(e){
    if(/Failed to fetch|404|Unexpected token/i.test(e?.message||''))return null;
    throw e;
  }
}

function loadImageUrlWithTimeout(url,ms){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    let finished=false;
    const timeout=setTimeout(()=>{
      if(finished)return;
      finished=true;
      reject(new Error('timeout'));
    },ms);
    img.onload=()=>{
      if(finished)return;
      finished=true;
      clearTimeout(timeout);
      resolve(url);
    };
    img.onerror=()=>{
      if(finished)return;
      finished=true;
      clearTimeout(timeout);
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src=url;
  });
}

function pollinationsPublicUrl(prompt,width,height){
  const seed=Math.abs(String(prompt).split('').reduce((a,c)=>((a*31)+c.charCodeAt(0))|0,7));
  const enc=encodeURIComponent(prompt.slice(0,420));
  return`https://gen.pollinations.ai/image/${enc}?model=flux&width=${width}&height=${height}&nologo=true&private=true&enhance=true&safe=true&seed=${seed}`;
}

function pollinationsLegacyUrl(prompt,width,height){
  const seed=Math.abs(String(prompt).split('').reduce((a,c)=>((a*31)+c.charCodeAt(0))|0,11));
  const enc=encodeURIComponent(prompt.slice(0,420));
  return`https://image.pollinations.ai/prompt/${enc}?model=flux&width=${width}&height=${height}&nologo=true&private=true&enhance=true&seed=${seed}`;
}

function friendlyImageError(err){
  const msg=err?.message||String(err||'');
  if(/401|invalid|unauthorized/i.test(msg))return'La key de Pollinations no es válida o no tiene permisos.';
  if(/402|balance|payment/i.test(msg))return'La key no tiene saldo/pollen disponible.';
  if(/429|rate/i.test(msg))return'Se alcanzó el límite de generación. Espera o usa una key.';
  if(/timeout/i.test(msg))return'El respaldo gratuito tardó demasiado. Pega tu key de Pollinations para generar en local.';
  return msg||'No se pudo generar la imagen.';
}

function buildVisualPrompt(text){
  const keywords=extractKeywords(text);
  return`High quality realistic concept image, useful prototype visualization, ${keywords}, clean composition, natural light, detailed, no text, no watermark`;
}

// Extraer keywords relevantes y traducir al inglés
function extractKeywords(text){
  // Diccionario español -> inglés para términos comunes
  const dict={
    'antena':'antenna','casera':'homemade','celular':'cellular','móvil':'mobile',
    'cafetería':'coffee','moderna':'modern','acogedor':'cozy','ambiente':'atmosphere',
    'mochila':'backpack','ecológica':'ecological','reciclado':'recycled','materiales':'materials',
    'proyecto':'project','negocio':'business','app':'app','aplicación':'application',
    'tecnología':'technology','prototipo':'prototype','diseño':'design','producto':'product',
    'idea':'idea','innovación':'innovation','startup':'startup','emprendimiento':'entrepreneurship'
  };
  
  // Extraer palabras relevantes (más de 3 letras)
  const words=text.toLowerCase()
    .replace(/[^\wáéíóúñü\s]/g,'')
    .split(/\s+/)
    .filter(w=>w.length>3)
    .slice(0,6);
  
  // Traducir al inglés si existe en diccionario
  const translated=words.map(w=>dict[w]||w);
  
  // Agregar categoría general si es muy específico
  const category=detectCategory(text);
  if(category)translated.unshift(category);
  
  return translated.join(',');
}

// Detectar categoría general del proyecto
function detectCategory(text){
  const lower=text.toLowerCase();
  if(/tecnolog|electr|circuit|arduino|raspberry|sensor|iot/i.test(lower))return'technology';
  if(/negocio|empresa|startup|comercio|tienda|venta/i.test(lower))return'business';
  if(/app|aplicaci|software|web|móvil|digital/i.test(lower))return'application';
  if(/diseño|arte|gráfico|visual|creativ/i.test(lower))return'design';
  if(/product|manufactur|fabricaci|construcci/i.test(lower))return'product';
  return'';
}
function showHeroImg(w,src){
  const img=document.createElement('img');
  img.className='hero-img';
  img.src=src;
  w.innerHTML='';
  w.appendChild(img);
  
  // Guardar URL de la imagen en la idea actual
  if(ideaId){
    sF('imgUrl',src);
  }
}
function showMinimalPlaceholder(w,prompt='',error=''){
  w.innerHTML=`<div style="width:100%;height:320px;background:linear-gradient(135deg,#F9FAFB,#E5E7EB);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;text-align:center">
    <div style="font-size:64px;opacity:0.3">🎨</div>
    <div style="font-size:14px;color:var(--text2);font-weight:600">Imagen no disponible</div>
    <div style="font-size:12px;color:var(--text2);font-weight:600;max-width:520px;line-height:1.6">${escapeHTML(error||'El generador tardó demasiado. Puedes reintentar sin perder tu idea.')}</div>
    <div style="font-size:12px;color:var(--text3);font-weight:500;max-width:520px;line-height:1.6">Abre “Configurar generación de imágenes” y pega tu key de Pollinations para probar en local.</div>
    ${prompt?`<div style="font-size:11px;color:var(--text3);max-width:520px;line-height:1.5">Prompt: ${escapeHTML(prompt.slice(0,180))}</div>`:''}
    <div style="display:flex;gap:10px;margin-top:8px">
      <button onclick="window.__regen()" style="padding:8px 18px;background:#6366f1;color:white;border:none;border-radius:20px;font-size:13px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(99,102,241,.3)">🔄 Reintentar</button>
    </div>
  </div>`;
}
window.__regen=()=>lastImgPrompt&&genImg(lastImgPrompt);

// PROGRESS — r=34, circumference=213.6
function setPct(p){
  const c=2*Math.PI*34;
  if($('ring-arc'))$('ring-arc').style.strokeDashoffset=c-(p/100)*c;
  if($('ring-pct'))$('ring-pct').textContent=p+'%';
}
function calcPct(){const a=document.querySelectorAll('.k-card').length,d=document.querySelectorAll('#k-done .k-card').length;const p=a?Math.round(d/a*100):0;setPct(p);sF('progress',p);}

// KANBAN
function makeCard(t,col='k-todo'){const d=document.createElement('div');d.className='k-card';d.draggable=true;d.textContent=t;d.id='kc_'+Math.random().toString(36).slice(2,8);d.ondragstart=e=>{e.dataTransfer.setData('id',d.id);d.classList.add('dragging');};d.ondragend=()=>d.classList.remove('dragging');d.ondblclick=()=>editCard(d);$(col).appendChild(d);return d;}
function editCard(c){c.contentEditable='true';c.focus();c.onblur=()=>{c.contentEditable='false';saveKanban();calcPct();};}
function loadKanban(kb){['todo','doing','done'].forEach(c=>{$('k-'+c).innerHTML='';(kb[c]||[]).forEach(t=>makeCard(t,'k-'+c));});}
function saveKanban(){const g=id=>[...$(id).querySelectorAll('.k-card')].map(c=>c.textContent);sF('kanban',{todo:g('k-todo'),doing:g('k-doing'),done:g('k-done')});}
window.addKanbanCard=col=>{const d=makeCard('Nueva tarea','k-'+col);editCard(d);};
function setupKanban(){['k-todo','k-doing','k-done'].forEach(id=>{const el=$(id);el.ondragover=e=>{e.preventDefault();el.classList.add('drag-over');};el.ondragleave=()=>el.classList.remove('drag-over');el.ondrop=e=>{e.preventDefault();el.classList.remove('drag-over');const c=document.getElementById(e.dataTransfer.getData('id'));if(c)el.appendChild(c);calcPct();saveKanban();};});}

// TIMELINE
function renderTL(entries){
  const tl=$('timeline');
  if(!entries?.length){tl.innerHTML='<div class="tl-empty">Sube fotos de tu proceso 📷</div>';return;}
  tl.innerHTML=entries.map((e,i)=>`
    <div class="tl-entry">
      <img src="${e.data}" alt=""/>
      <div class="tl-date">${e.date}</div>
      ${e.desc ? `<div class="tl-desc">${e.desc}</div>` : ''}
      <button class="tl-rm" onclick="window.__rmtl(${i})">✕</button>
    </div>
  `).join('');
}
function addTLPhotos(files){
  if(!files?.length||!ideaId)return;
  const idea=ideas.find(i=>i.id===ideaId);
  const tl=idea?.timeline||[];
  Array.from(files).forEach(f=>{
    const r=new FileReader();
    r.onload=async ev=>{
      const b64 = ev.target.result.split(',')[1];
      toast('🔍 Escaneando imagen con IA...', 4000);
      let desc = 'Avance del proyecto';
      try {
        const res = await aiCall("Describe esta imagen de avance de proyecto. Di qué acción o elemento físico se observa en máximo 6 palabras, de forma muy directa (ej: 'Soldando componentes' o 'Armando la base de madera'). Responde SOLO con esa frase corta, sin explicaciones ni comillas.", b64);
        desc = res.trim().replace(/^["']|["']$/g, '');
      } catch(e) {
        console.error("Error al escanear avance:", e);
      }
      tl.push({
        data: ev.target.result,
        date: new Date().toLocaleDateString('es',{day:'numeric',month:'short'}),
        desc: desc
      });
      sF('timeline',tl);
      renderTL(tl);
      ideas=JSON.parse(localStorage.getItem('pp_ideas')||'[]');
      toast('📸 ¡Foto agregada con descripción de IA!');
    };
    r.readAsDataURL(f);
  });
}
window.__rmtl=idx=>{const idea=ideas.find(i=>i.id===ideaId);if(!idea)return;const tl=idea.timeline||[];tl.splice(idx,1);sF('timeline',tl);renderTL(tl);ideas=JSON.parse(localStorage.getItem('pp_ideas')||'[]');};

// HEATMAP — GitHub style with month labels
function logAct(){const d=new Date().toISOString().slice(0,10);const h=JSON.parse(localStorage.getItem('pp_hm')||'{}');h[d]=(h[d]||0)+1;localStorage.setItem('pp_hm',JSON.stringify(h));}

// DARK MODE
function toggleDarkMode(){
  const html=document.documentElement;
  const isDark=html.getAttribute('data-theme')==='dark';
  const newTheme=isDark?'light':'dark';
  html.setAttribute('data-theme',newTheme);
  localStorage.setItem('pp_theme',newTheme);
  
  // Cambiar icono
  const icon=$('btn-dark-mode')?.querySelector('.dm-icon');
  if(icon)icon.textContent=isDark?'🌙':'☀️';
  
  toast(isDark?'Modo claro activado':'Modo oscuro activado');
}

function loadDarkMode(){
  const savedTheme=localStorage.getItem('pp_theme')||'light';
  document.documentElement.setAttribute('data-theme',savedTheme);
  
  // Actualizar icono
  const icon=$('btn-dark-mode')?.querySelector('.dm-icon');
  if(icon)icon.textContent=savedTheme==='dark'?'☀️':'🌙';
}

function renderHeatmap(){
  const hm=$('heatmap');if(!hm)return;
  const h=JSON.parse(localStorage.getItem('pp_hm')||'{}');
  const WEEKS=12;const now=new Date();
  // Align to start of week (Monday)
  const startDate=new Date(now);startDate.setDate(startDate.getDate()-(WEEKS*7-1));
  // Build 84 days (12 weeks × 7)
  let cells='';
  for(let w=0;w<WEEKS;w++){
    for(let d=0;d<7;d++){
      const date=new Date(startDate);date.setDate(startDate.getDate()+w*7+d);
      const k=date.toISOString().slice(0,10);const c=h[k]||0;
      const l=c===0?'':c<=2?'l1':c<=4?'l2':c<=7?'l3':'l4';
      const dateStr=date.toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'});
      cells+=`<div class="hm-cell ${l}" title="${dateStr}: ${c} ${c===1?'acción':'acciones'}"></div>`;
    }
  }
  hm.innerHTML=cells;
  // Month labels
  const ml=$('dhc-months');if(!ml)return;
  const monthNames=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  let labelsHTML='';let lastMonth=-1;
  for(let w=0;w<WEEKS;w++){
    const d=new Date(startDate);d.setDate(startDate.getDate()+w*7);
    const m=d.getMonth();
    labelsHTML+=`<div class="dhc-month-label">${m!==lastMonth?monthNames[m]:''}</div>`;
    lastMonth=m;
  }
  ml.innerHTML=labelsHTML;
}

// VOICE
function toggleVoice(){recog?stopVoice():startVoice();}
async function startVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Tu navegador no trae transcripción gratis. Usa Chrome o Edge.');return;}
  try{await navigator.mediaDevices.getUserMedia({audio:true});}
  catch(e){toast('Permiso de micrófono denegado');return;}
  const ta=$('idea-text');
  recog=new SR();
  recog.lang=navigator.language?.startsWith('es')?navigator.language:'es-CO';
  recog.continuous=true;
  recog.interimResults=true;
  let finalText=(ta.value.trim()?ta.value.trim()+' ':'');
  recog.onresult=e=>{
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const transcript=e.results[i][0].transcript.trim();
      if(e.results[i].isFinal){
        finalText+=(finalText.endsWith(' ')?'':' ')+transcript+' ';
      }else{
        interim=transcript;
      }
    }
    ta.value=(finalText+interim).trimStart();
    $('voice-status').textContent=interim?'Escuchando borrador…':'Transcripción guardada, sigue hablando…';
    scheduleLiveVisual(ta.value);
  };
  recog.onerror=e=>{
    const msg=e.error==='no-speech'?'No escuché voz clara. Intenta de nuevo.':'Se pausó la transcripción.';
    toast(msg);
    stopVoice();
  };
  recog.onend=()=>{if(recog){try{recog.start();}catch(e){stopVoice();}}};
  try{
    recog.start();
    $('btn-voice').textContent='⏹ Detener';
    $('btn-voice').classList.add('recording');
    $('voice-bar').classList.remove('hidden');
    $('voice-status').textContent='Escuchando y transcribiendo…';
    toast('Habla tu idea: texto e imagen se actualizarán solos');
  }catch(e){recog=null;toast('No pude iniciar el micrófono');}
}
function stopVoice(){
  const active=recog;
  recog=null;
  if(active){try{active.stop();}catch(e){}}
  $('btn-voice').textContent='🎤 Voz';
  $('btn-voice').classList.remove('recording');
  $('voice-bar').classList.add('hidden');
  scheduleLiveVisual($('idea-text')?.value||'');
}

// IMG UPLOAD
function loadImg(f){if(!f)return;const r=new FileReader();r.onload=e=>{imgB64=e.target.result.split(',')[1];$('img-preview').src=e.target.result;$('img-preview-wrap').classList.remove('hidden');};r.readAsDataURL(f);}
function clearImg(){imgB64=null;$('img-preview-wrap').classList.add('hidden');$('file-img').value='';}

// FLOAT MENU
function handleSel(){const s=window.getSelection(),m=$('float-menu');if(!s||s.isCollapsed||s.toString().trim().length<5){m.classList.add('hidden');return;}const r=s.getRangeAt(0).getBoundingClientRect();m.style.top=(r.top+window.scrollY-48)+'px';m.style.left=Math.max(10,(r.left+r.width/2-120))+'px';m.classList.remove('hidden');}
async function floatAI(a){const sel=window.getSelection()?.toString().trim();if(!sel)return;$('float-menu').classList.add('hidden');toast('✨ Procesando…');try{const r=await aiCall(`${a==='improve'?'Mejora':a==='expand'?'Expande':a==='simplify'?'Simplifica':'Da alternativas para'}:\n"${sel}"\nDevuelve solo el texto resultante.`);$('master-doc').innerHTML=$('master-doc').innerHTML.replace(sel,r.trim());sF('doc',$('master-doc').innerHTML);toast('✅ Listo');}catch(e){toast('❌ '+e.message);}}

// CHAT
const addBubble=(w,t)=>{const d=document.createElement('div');d.className='bubble '+w;d.innerHTML=t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');$('chat-msgs').appendChild(d);$('chat-msgs').scrollTop=9999;};
const resetChat=()=>{$('chat-msgs').innerHTML='<div class="bubble ai">Puedo editar el documento, agregar tareas, cambiar progreso o responder preguntas. 🚀</div>';};
async function sendChat(){
  const msg=$('chat-input').value.trim();
  if(!msg)return;
  $('chat-input').value='';
  addBubble('user',msg);
  
  const docTxt=$('master-doc')?.innerText?.slice(0,500)||'';
  const idea=ideas.find(i=>i.id===ideaId);
  const kb=`Todo:${[...$('k-todo').querySelectorAll('.k-card')].map(c=>c.textContent).join(',')}|Doing:${[...$('k-doing').querySelectorAll('.k-card')].map(c=>c.textContent).join(',')}|Done:${[...$('k-done').querySelectorAll('.k-card')].map(c=>c.textContent).join(',')}`;
  
  try{
    const raw=await aiCall(`Asistente Papaleta. Idea:"${idea?.title}". Progreso:${idea?.progress||0}%.\nDoc:"${docTxt}"\nKanban:${kb}\nUsuario:"${msg}"\nResponde SOLO JSON con UNA acción:\n{"action":"rewrite","doc":"<h3>...</h3><p>HTML nuevo</p>","response":"qué cambié"}\n{"action":"add_task","task":"texto","column":"todo|doing|done","response":"qué agregué"}\n{"action":"add_multiple_tasks","tasks":["tarea1","tarea2"],"response":"qué agregué"}\n{"action":"move_task","task":"nombre","to":"todo|doing|done","response":"qué moví"}\n{"action":"complete_task","task":"nombre","response":"qué completé"}\n{"action":"set_progress","value":50,"response":"razón"}\n{"action":"chat","response":"respuesta"}\nEspañol. Solo JSON.`);
    
    let p;
    try{
      p=JSON.parse(raw.replace(/```json|```/g,'').trim().match(/\{[\s\S]*\}/)[0]);
    }catch{
      p={action:'chat',response:raw};
    }
    
    addBubble('ai',p.response||'✅');
    
    // REESCRIBIR DOCUMENTO
    if(p.action==='rewrite'&&p.doc){
      const doc=$('master-doc');
      if(doc){
        doc.innerHTML=p.doc;
        sF('doc',p.doc);
        toast('📝 Documento actualizado');
      }
    }
    
    // AGREGAR TAREA ÚNICA
    if(p.action==='add_task'&&p.task){
      const col=p.column||'todo';
      const card=makeCard(p.task,`k-${col}`);
      if(card){
        saveKanban();
        calcPct();
        toast(`✅ Tarea agregada a ${col==='todo'?'Por Hacer':col==='doing'?'En Progreso':'Completado'}`);
      }
    }
    
    // AGREGAR MÚLTIPLES TAREAS
    if(p.action==='add_multiple_tasks'&&p.tasks&&Array.isArray(p.tasks)){
      p.tasks.forEach(task=>{
        makeCard(task,'k-todo');
      });
      saveKanban();
      calcPct();
      toast(`✅ ${p.tasks.length} tareas agregadas`);
    }
    
    // MOVER TAREA
    if(p.action==='move_task'&&p.task&&p.to){
      const cards=[...$('k-todo').querySelectorAll('.k-card'),...$('k-doing').querySelectorAll('.k-card'),...$('k-done').querySelectorAll('.k-card')];
      const m=cards.find(c=>c.textContent.toLowerCase().includes(p.task.toLowerCase()));
      if(m){
        $(`k-${p.to}`).appendChild(m);
        saveKanban();
        calcPct();
        toast(`✅ Tarea movida a ${p.to==='todo'?'Por Hacer':p.to==='doing'?'En Progreso':'Completado'}`);
      }
    }
    
    // COMPLETAR TAREA
    if(p.action==='complete_task'&&p.task){
      const cards=[...$('k-todo').querySelectorAll('.k-card'),...$('k-doing').querySelectorAll('.k-card')];
      const m=cards.find(c=>c.textContent.toLowerCase().includes(p.task.toLowerCase()));
      if(m){
        $('k-done').appendChild(m);
        saveKanban();
        calcPct();
        toast('✅ Tarea completada');
      }
    }
    
    // ACTUALIZAR PROGRESO
    if(p.action==='set_progress'&&typeof p.value==='number'){
      setPct(p.value);
      sF('progress',p.value);
      toast(`📊 Progreso actualizado: ${p.value}%`);
    }
    
    ideas=JSON.parse(localStorage.getItem('pp_ideas')||'[]');
    renderNav();
  }catch(e){
    addBubble('ai','❌ '+e.message);
  }
}
async function chatImg(f){if(!f)return;const r=new FileReader();r.onload=async e=>{const b=e.target.result.split(',')[1];try{addBubble('ai','🖼️ '+(await aiCall('Describe esta imagen brevemente. Español.',b)));}catch(e){addBubble('ai','❌ '+e.message);}};r.readAsDataURL(f);}
