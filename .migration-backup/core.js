// core.js — Firebase, AI, CRUD, persistence
import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import{getFirestore,collection,addDoc,getDocs,doc,updateDoc,query,where}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const FB={apiKey:"AIzaSyCtG3HMUGdDDht9wliTpl1jKYg7dLk76v0",authDomain:"papaleta-f8ff5.firebaseapp.com",projectId:"papaleta-f8ff5",storageBucket:"papaleta-f8ff5.firebasestorage.app",messagingSenderId:"934397525448",appId:"1:934397525448:web:aa9afabfb01b6b1dfed4fd"};
// IMPORTANTE: En producción, esta key debe estar en una variable de entorno
export const GK=window.GROQ_API_KEY||''; // Configurar en config.local.js
const fbApp=initializeApp(FB);
export const auth=getAuth(fbApp),db=getFirestore(fbApp),provider=new GoogleAuthProvider();
export const $=id=>document.getElementById(id);
export let user=null,ideaId=null,ideas=[];
export function setUser(u){user=u;}
export function setIdeaId(id){ideaId=id;}

export const toast=(m,ms=3000)=>{const t=$('toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(window._tt);window._tt=setTimeout(()=>t.classList.add('hidden'),ms);};

// AI call
export async function ai(prompt,img=null){
  const model=img?'meta-llama/llama-4-scout-17b-16e-instruct':'llama-3.3-70b-versatile';
  const content=img?[{type:'image_url',image_url:{url:`data:image/jpeg;base64,${img}`}},{type:'text',text:prompt}]:prompt;
  const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+GK},body:JSON.stringify({model,messages:[{role:'user',content}],temperature:.7,max_tokens:2048})});
  if(!r.ok){const e=await r.json();throw new Error(e.error?.message||'HTTP '+r.status);}
  return(await r.json()).choices?.[0]?.message?.content||'';
}

// IDEAS CRUD
export async function loadIdeas(){
  const local=JSON.parse(localStorage.getItem('pp_ideas')||'[]');
  ideas=local.filter(i=>!user||i.uid===user.uid||i.uid==='local');
  if(!db||!user)return ideas;
  try{
    const snap=await getDocs(query(collection(db,'ideas'),where('uid','==',user.uid)));
    const fs=snap.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()?.toISOString()||new Date().toISOString()}));
    if(fs.length){fs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));ideas=fs;localStorage.setItem('pp_ideas',JSON.stringify(ideas));}
  }catch(e){console.warn('FS load fail');}
  return ideas;
}

export async function saveIdea(data){
  const payload={uid:user?.uid||'local',title:data.title||'Sin título',tag:data.tag||'Idea',rawText:data.rawText||'',doc:data.doc||'',imgPrompt:data.imgPrompt||'',imgUrl:'',kanban:data.kanban||{todo:[],doing:[],done:[]},timeline:data.timeline||[],progress:0,createdAt:new Date().toISOString()};
  const local=JSON.parse(localStorage.getItem('pp_ideas')||'[]');
  if(ideaId){const ix=local.findIndex(i=>i.id===ideaId);if(ix>=0)local[ix]={...local[ix],...payload};else local.unshift({id:ideaId,...payload});}
  else{ideaId='l_'+Date.now();local.unshift({id:ideaId,...payload});}
  localStorage.setItem('pp_ideas',JSON.stringify(local));
  if(db&&user){try{const fp={...payload,createdAt:new Date()};if(ideaId.startsWith('l_')){const r=await addDoc(collection(db,'ideas'),fp);const ix=local.findIndex(i=>i.id===ideaId);if(ix>=0){local[ix].id=r.id;ideaId=r.id;}localStorage.setItem('pp_ideas',JSON.stringify(local));}else await updateDoc(doc(db,'ideas',ideaId),fp);}catch(e){console.warn('FS save fail');}}
  ideas=JSON.parse(localStorage.getItem('pp_ideas')||'[]');
}

export async function saveField(field,val){
  if(!ideaId)return;
  const local=JSON.parse(localStorage.getItem('pp_ideas')||'[]');
  const ix=local.findIndex(i=>i.id===ideaId);
  if(ix>=0){local[ix][field]=val;localStorage.setItem('pp_ideas',JSON.stringify(local));}
  ideas=local;
  if(db&&ideaId&&!ideaId.startsWith('l_'))try{await updateDoc(doc(db,'ideas',ideaId),{[field]:val});}catch(e){}
}

// HEATMAP
export function logActivity(){
  const today=new Date().toISOString().slice(0,10);
  const hm=JSON.parse(localStorage.getItem('pp_heatmap')||'{}');
  hm[today]=(hm[today]||0)+1;
  localStorage.setItem('pp_heatmap',JSON.stringify(hm));
}

export function getHeatmapData(){
  const hm=JSON.parse(localStorage.getItem('pp_heatmap')||'{}');
  const days=[];const now=new Date();
  for(let i=83;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);days.push({date:k,count:hm[k]||0});}
  return days;
}
