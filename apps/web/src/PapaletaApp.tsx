
import { useEffect } from "react";
import "./papaleta.css";
import { DottedSurface } from "./components/ui/dotted-surface";
import { StarfieldBackground } from "./components/ui/starfield";

declare global {
  interface Window {
    GROQ_API_KEY?: string;
    __ld: (id: string) => void;
    __qn: (i: number) => void;
    __qs: (i: number) => void;
    __regen: () => void;
    __uploadImg: () => void;
    __rmtl: (idx: number) => void;
    addKanbanCard: (col: string) => void;
    showDashboard: () => void;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    _pp_toast_timer?: any;
    _pp_wired?: boolean;
    _pp_live_timer?: any;
  }
}

export default function PapaletaApp() {
  useEffect(() => {
    // Dynamically import Firebase and initialize the app
    const initApp = async () => {
      try {
        const { initializeApp } = await import("firebase/app");
        const {
          getAuth,
          GoogleAuthProvider,
          signInWithPopup,
          signOut,
          onAuthStateChanged,
          setPersistence,
          browserLocalPersistence,
        } = await import("firebase/auth");
        const {
          getFirestore,
          collection,
          addDoc,
          getDocs,
          doc,
          updateDoc,
          query,
          where,
          setDoc,
          getDoc,
        } = await import("firebase/firestore");

        const FB = {
          apiKey: "AIzaSyCtG3HMUGdDDht9wliTpl1jKYg7dLk76v0",
          authDomain: "papaleta-f8ff5.firebaseapp.com",
          projectId: "papaleta-f8ff5",
          storageBucket: "papaleta-f8ff5.firebasestorage.app",
          messagingSenderId: "934397525448",
          appId: "1:934397525448:web:aa9afabfb01b6b1dfed4fd",
        };

        const GK = () =>
          (window as any).GROQ_API_KEY ||
          localStorage.getItem("pp_groq_key") ||
          "";
        const fbApp = initializeApp(FB);
        const auth = getAuth(fbApp);
        const db = getFirestore(fbApp);
        const provider = new GoogleAuthProvider();
        await setPersistence(auth, browserLocalPersistence).catch(() => { });

        async function loadUserSettings(uid: string) {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
              const data = snap.data();
              if (data.groqKey) localStorage.setItem("pp_groq_key", data.groqKey);
            }
          } catch (e) { }
        }

        async function saveUserSettings(uid: string, settings: Record<string, any>) {
          try { await setDoc(doc(db, "users", uid), settings, { merge: true }); }
          catch (e) { }
        }

        const $ = (id: string) => document.getElementById(id);
        let user: any = null,
          ideaId: string | null = null,
          ideas: any[] = [],
          imgB64: string | null = null,
          recog: any = null,
          lastImgPrompt = "",
          qaQ: string[] = [],
          qaA: any[] = [],
          qaText = "",
          qaImg: string | null = null,
          liveVisualTimer: any = null,
          liveVisualPrompt = "",
          wired = false,
          localMode = localStorage.getItem("pp_local_mode") === "1";

        const IMG_API_KEY_STORAGE = "pp_pollinations_key";

        const toast = (m: string, ms = 3000) => {
          let t = document.getElementById("papaleta-toast");
          if (!t) {
            t = document.createElement("div");
            t.id = "papaleta-toast";
            document.body.appendChild(t);
          }
          t.textContent = m;
          t.style.display = "block";
          clearTimeout(window._pp_toast_timer);
          window._pp_toast_timer = setTimeout(() => {
            if (t) t.style.display = "none";
          }, ms);
        };

        async function aiCall(prompt: string, img: string | null = null) {
          const key = GK();
          if (!key) throw new Error("No Groq API key configured");
          const model = img
            ? "meta-llama/llama-4-scout-17b-16e-instruct"
            : "llama-3.3-70b-versatile";
          const content: any = img
            ? [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${img}` },
              },
              { type: "text", text: prompt },
            ]
            : prompt;
          const r = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + key,
              },
              body: JSON.stringify({
                model,
                messages: [{ role: "user", content }],
                temperature: 0.7,
                max_tokens: 2048,
              }),
            }
          );
          if (!r.ok) throw new Error((await r.json()).error?.message || "HTTP " + r.status);
          return (await r.json()).choices?.[0]?.message?.content || "";
        }

        function updateUserProfile(u: any) {
          const firstName = u.displayName?.split(" ")[0] || "Usuario";
          const initials =
            u.displayName
              ?.split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "U";
          if ($("uname")) $("uname")!.textContent = firstName;
          const _uav = $("uavatar");
          if (_uav) {
            if (u.photoURL) {
              _uav.innerHTML = `<img src="${u.photoURL}" alt="${firstName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            } else {
              _uav.innerHTML = `<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--primary);color:#fff;border-radius:50%;font-size:13px;font-weight:700;">${initials}</span>`;
            }
          }
          if ($("user-greeting"))
            $("user-greeting")!.textContent = `Hola ${firstName}, ¿qué ideas tienes hoy?`;
          const profilePic = $("user-profile-pic");
          if (profilePic) {
            if (u.photoURL) {
              profilePic.innerHTML = `<img src="${u.photoURL}" alt="${firstName}" class="profile-img"/>`;
            } else {
              profilePic.innerHTML = `<div class="profile-initials">${initials}</div>`;
            }
          }
        }

        function showDashboard() {
          if ($("dashboard")) $("dashboard")!.classList.remove("hidden");
          if ($("workspace")) $("workspace")!.classList.add("hidden");
          renderHeatmap();
          const h = JSON.parse(localStorage.getItem("pp_hm") || "{}");
          const total = Object.values(h).reduce((a: any, b: any) => a + b, 0) as number;
          const streak = calcStreak(h);
          if ($("dhc-total")) $("dhc-total")!.textContent = total + " acciones";
          const completed = ideas.filter((i) => i.progress >= 100).length;
          const inProgress = ideas.filter((i) => i.progress > 0 && i.progress < 100).length;
          if ($("stat-total")) $("stat-total")!.textContent = String(ideas.length);
          if ($("stat-progress")) $("stat-progress")!.textContent = String(inProgress);
          if ($("stat-completed")) $("stat-completed")!.textContent = String(completed);
          if ($("stat-streak")) $("stat-streak")!.textContent = String(streak);
          renderIdeasGrid();
        }
        window.showDashboard = showDashboard;

        function calcStreak(h: any) {
          let s = 0;
          const now = new Date();
          for (let i = 0; i < 365; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const k = d.toISOString().slice(0, 10);
            if (h[k] > 0) s++;
            else break;
          }
          return s;
        }

        function renderIdeasGrid() {
          const grid = $("ideas-grid");
          if (!grid) return;
          if ($("dis-count"))
            $("dis-count")!.textContent = `${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"}`;
          if (!ideas.length) {
            grid.innerHTML = `<div class="ideas-empty"><div class="ie-icon">✨</div><p class="ie-text">Aún no has creado ninguna idea.<br>¡Empieza ahora y potencia tus proyectos con IA!</p><button class="btn-primary" onclick="document.getElementById('btn-new').click()"><span>+</span> Crear Primera Idea</button></div>`;
            return;
          }
          const sorted = [...ideas].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          grid.innerHTML = sorted.map((idea) => {
            const date = idea.createdAt ? new Date(idea.createdAt).toLocaleDateString("es", { day: "numeric", month: "short" }) : "Hoy";
            const pct = idea.progress || 0;
            const done = pct >= 100;
            const statusHtml = done ? '<span class="ic-status ic-status-done">Completada</span>' : pct > 0 ? '<span class="ic-status ic-status-progress">En progreso</span>' : "";
            let thumbHtml: string;
            if (idea.imgUrl) {
              const safeUrl = idea.imgUrl.replace(/"/g, "&quot;");
              const safeTitle = (idea.title || "Idea").replace(/"/g, "&quot;");
              thumbHtml = `<img src="${safeUrl}" alt="${safeTitle}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=\\'ic-image-placeholder\\'>💡</div>'">`;
            } else {
              thumbHtml = '<div class="ic-image-placeholder">💡</div>';
            }
            const safeId = idea.id.replace(/'/g, "\\'");
            return [
              `<div class="idea-card${done ? ' idea-card-done' : ''}" onclick="window.__ld('${safeId}')">`,
              `<div class="ic-image">${thumbHtml}</div>`,
              `<div class="ic-body">${statusHtml}`,
              `<div class="ic-header"><span class="ic-tag">${idea.tag || "Idea"}</span><span class="ic-progress">${pct}%</span></div>`,
              `<h3 class="ic-title">${idea.title || "Sin título"}</h3>`,
              `<div class="ic-date">${date}</div>`,
              `</div></div>`,
            ].join("");
          }).join("");
        }

        async function loadIdeas() {
          ideas = JSON.parse(localStorage.getItem("pp_ideas") || "[]").filter(
            (i: any) => i.uid === user?.uid || i.uid === "local"
          );
          if (db && user && user.uid !== "local") {
            try {
              const snap = await getDocs(
                query(collection(db, "ideas"), where("uid", "==", user.uid))
              );
              const fs = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                createdAt:
                  (d.data().createdAt as any)?.toDate?.()?.toISOString() ||
                  new Date().toISOString(),
              }));
              if (fs.length) {
                fs.sort(
                  (a: any, b: any) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                ideas = fs;
                localStorage.setItem("pp_ideas", JSON.stringify(ideas));
              }
            } catch (e) { }
          }
        }

        async function sF(field: string, val: any) {
          if (!ideaId) return;
          const local = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
          const ix = local.findIndex((i: any) => i.id === ideaId);
          if (ix >= 0) {
            local[ix][field] = val;
            local[ix].updatedAt = new Date().toISOString();
            localStorage.setItem("pp_ideas", JSON.stringify(local));
          }
          ideas = local;
          renderNav();
          logAct();
          if (db && user?.uid !== "local" && ideaId && !ideaId.startsWith("l_")) {
            try {
              await updateDoc(doc(db, "ideas", ideaId), { [field]: val });
            } catch (e) { }
          }
        }

        async function saveNew(data: any) {
          const p = {
            uid: user?.uid || "local",
            title: data.title || "Sin título",
            tag: data.tag || "Idea",
            rawText: qaText,
            doc: data.doc || "",
            imgPrompt: data.imgPrompt || "",
            imgUrl: data.imgUrl || "",
            kanban: { todo: [], doing: [], done: [] },
            timeline: [],
            progress: 0,
            createdAt: new Date().toISOString(),
          };
          const local = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
          if (ideaId) {
            const ix = local.findIndex((i: any) => i.id === ideaId);
            if (ix >= 0) local[ix] = { ...local[ix], ...p };
            else local.unshift({ id: ideaId, ...p });
          } else {
            ideaId = "l_" + Date.now();
            local.unshift({ id: ideaId, ...p });
          }
          localStorage.setItem("pp_ideas", JSON.stringify(local));
          if (db && user && user.uid !== "local") {
            try {
              const fp = { ...p, createdAt: new Date() };
              if (ideaId!.startsWith("l_")) {
                const r = await addDoc(collection(db, "ideas"), fp);
                const ix = local.findIndex((i: any) => i.id === ideaId);
                if (ix >= 0) {
                  local[ix].id = r.id;
                  ideaId = r.id;
                }
                localStorage.setItem("pp_ideas", JSON.stringify(local));
              } else {
                await updateDoc(doc(db, "ideas", ideaId!), fp as any);
              }
            } catch (e) { }
          }
          ideas = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
          renderNav();
        }

        function renderNav() {
          const list = $("ideas-nav");
          if (!list) return;
          if (!ideas.length) {
            list.innerHTML = '<div class="empty-nav">Crea tu primera idea ✨</div>';
            return;
          }
          list.innerHTML = ideas
            .map(
              (i) =>
                `<div class="idea-nav-item${i.id === ideaId ? " active" : ""}" onclick="window.__ld('${i.id}')"><div class="ini-title">${i.title || "Sin título"}</div><div class="ini-meta"><span class="ini-tag">${i.tag || "Idea"}</span><span class="ini-pct">${i.progress || 0}%</span></div></div>`
            )
            .join("");
        }

        window.__ld = (id: string) => {
          const i = ideas.find((x) => x.id === id);
          if (i) {
            ideaId = id;
            renderNav();
            loadWS(i);
            $("sidebar")?.classList.remove("open");
            $("sb-overlay")?.classList.add("hidden");
          }
        };

        function loadWS(idea: any) {
          $("dashboard")?.classList.add("hidden");
          $("workspace")?.classList.remove("hidden");
          if ($("idea-title")) $("idea-title")!.textContent = idea.title || "Sin título";
          if ($("idea-tag")) $("idea-tag")!.textContent = idea.tag || "Idea";
          if ($("idea-date"))
            $("idea-date")!.textContent = idea.createdAt
              ? new Date(idea.createdAt).toLocaleDateString("es", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
              : "Hoy";
          setPct(idea.progress || 0);
          if (idea.doc) {
            $("input-zone")?.classList.add("hidden");
            $("qa-zone")?.classList.add("hidden");
            $("results")?.classList.remove("hidden");
            if ($("master-doc")) $("master-doc")!.innerHTML = idea.doc;
            if (idea.imgUrl) {
              lastImgPrompt = idea.imgPrompt || "";
              const w = $("hero-wrap");
              if (w) showHeroImg(w, idea.imgUrl);
            } else if (idea.imgPrompt) {
              lastImgPrompt = idea.imgPrompt;
              genImg(idea.imgPrompt);
            } else if ($("hero-wrap")) {
              $("hero-wrap")!.innerHTML =
                '<div class="hero-fallback hero-fallback-empty"><div class="hero-fallback-icon">✨</div><p class="hero-fallback-title">Sin visual aun</p><button type="button" class="hero-fallback-btn" onclick="window.__regen()">🎨 Generar</button><button type="button" class="hero-fallback-btn" onclick="window.__uploadImg()" style="margin-left:8px;background:var(--surface2);color:var(--text);border:1px solid var(--border);">🖼️ Subir</button></div>';
            }
            if (idea.kanban) loadKanban(idea.kanban);
            renderTL(idea.timeline || []);
          } else {
            $("results")?.classList.add("hidden");
            $("input-zone")?.classList.remove("hidden");
            if ($("idea-text")) ($("idea-text") as HTMLTextAreaElement).value = idea.rawText || "";
          }
          resetChat();
          addBubble(
            "ai",
            `Estás en **${idea.title || "tu idea"}**. Puedo editar el documento, agregar tareas o actualizar progreso. 🚀`
          );
        }

        function newIdea() {
          ideaId = null;
          renderNav();
          $("dashboard")?.classList.add("hidden");
          $("workspace")?.classList.remove("hidden");
          if ($("idea-title")) $("idea-title")!.textContent = "Nueva idea";
          if ($("idea-tag")) $("idea-tag")!.textContent = "Idea";
          if ($("idea-date")) $("idea-date")!.textContent = "Ahora";
          if ($("idea-text")) ($("idea-text") as HTMLTextAreaElement).value = "";
          clearImg();
          setPct(0);
          $("results")?.classList.add("hidden");
          $("qa-zone")?.classList.add("hidden");
          $("input-zone")?.classList.remove("hidden");
          ["k-todo", "k-doing", "k-done"].forEach((id) => {
            const el = $(id);
            if (el) el.innerHTML = "";
          });
          if ($("master-doc")) $("master-doc")!.innerHTML = "";
          if ($("timeline")) $("timeline")!.innerHTML = "";
          lastImgPrompt = "";
          resetChat();
          $("sidebar")?.classList.remove("open");
          $("sb-overlay")?.classList.add("hidden");
        }

        // Q&A + Analyze
        async function analyze() {
          const textEl = $("idea-text") as HTMLTextAreaElement;
          const text = textEl?.value.trim();
          if (!text && !imgB64) { toast("Escribe tu idea primero"); return; }
          const btn = $("btn-analyze") as HTMLButtonElement;
          btn.disabled = true;
          if ($("analyze-lbl")) $("analyze-lbl")!.textContent = "Analizando…";
          $("analyze-spin")?.classList.remove("hidden");
          qaText = text;
          qaImg = imgB64;
          qaQ = [];
          qaA = [];
          try {
            const raw = await aiCall(
              `Idea: "${text}"${imgB64 ? "\n[Imagen]" : ""}.\nHaz 4-5 preguntas cortas y específicas (español) sobre mercado, recursos, diferencial.\nSOLO JSON: {"questions":["P1?","P2?"]}`,
              imgB64
            );
            qaQ =
              JSON.parse(
                raw
                  .replace(/```json|```/g, "")
                  .trim()
                  .match(/\{[\s\S]*\}/)![0]
              ).questions || [];
            if (qaQ.length) {
              btn.disabled = false;
              if ($("analyze-lbl")) $("analyze-lbl")!.textContent = "🔍 Analizar con IA";
              $("analyze-spin")?.classList.add("hidden");
              showQA(0);
              return;
            }
          } catch (e) {
            qaQ = buildFreeQuestions(text);
            if (qaQ.length) {
              btn.disabled = false;
              if ($("analyze-lbl")) $("analyze-lbl")!.textContent = "🔍 Analizar con IA";
              $("analyze-spin")?.classList.add("hidden");
              showQA(0);
              toast("Modo gratis local: preguntas generadas sin API");
              return;
            }
          }
          btn.disabled = false;
          if ($("analyze-lbl")) $("analyze-lbl")!.textContent = "🔍 Analizar con IA";
          $("analyze-spin")?.classList.add("hidden");
          runFull(text, imgB64, []);
        }

        function showQA(idx: number) {
          const z = $("qa-zone");
          if (!z) return;
          z.innerHTML = "";
          z.classList.remove("hidden");
          $("input-zone")?.classList.add("hidden");
          if (idx >= qaQ.length) {
            z.classList.add("hidden");
            runFull(qaText, qaImg, qaA);
            return;
          }
          z.innerHTML = `<div class="qa-card"><div class="qa-counter">PREGUNTA ${idx + 1} DE ${qaQ.length}</div><div class="qa-progress"><div class="qa-progress-fill" style="width:${(idx / qaQ.length) * 100}%"></div></div><div class="qa-question">${qaQ[idx]}</div><textarea class="qa-textarea" id="qa-ans" placeholder="Tu respuesta…"></textarea><div class="qa-actions"><button class="qa-skip" onclick="window.__qs(${idx})">Omitir</button><button class="qa-next" onclick="window.__qn(${idx})">Siguiente →</button></div></div>`;
          const qaAns = $("qa-ans") as HTMLTextAreaElement;
          qaAns?.focus();
          if (qaAns) qaAns.onkeydown = (e: KeyboardEvent) => { if (e.key === "Enter" && e.ctrlKey) window.__qn(idx); };
        }

        window.__qn = (i: number) => {
          qaA.push({ q: qaQ[i], a: ($("qa-ans") as HTMLTextAreaElement)?.value.trim() || "(vacío)" });
          showQA(i + 1);
        };
        window.__qs = (i: number) => {
          qaA.push({ q: qaQ[i], a: "(omitido)" });
          showQA(i + 1);
        };

        async function runFull(text: string, img: string | null, ans: any[]) {
          $("qa-zone")?.classList.add("hidden");
          $("input-zone")?.classList.add("hidden");
          $("results")?.classList.remove("hidden");
          if ($("hero-wrap"))
            $("hero-wrap")!.innerHTML = '<div class="hero-loading"><span class="spin"></span> Generando imagen…</div>';
          const ctx = ans.length
            ? `\nCONTEXTO:\n${ans.map((a) => `• ${a.q} → ${a.a}`).join("\n")}`
            : "";
          try {
            const raw = await aiCall(
              `Experto en product design. Analiza y responde SOLO JSON:\n{"title":"Título","tag":"App|Negocio|Proyecto|Otro","doc":"<h3>🎯 Qué es</h3><p>...</p><h3>💡 Solución</h3><p>...</p><h3>🛠️ Materiales</h3><ul><li>...</li></ul><h3>📋 Pasos</h3><ol><li>...</li></ol><h3>💰 Monetización</h3><p>...</p><h3>⚠️ Riesgos</h3><ul><li>...</li></ul>","imgPrompt":"English prompt for photorealistic product mockup","roadmap":["Tarea1","Tarea2","Tarea3","Tarea4","Tarea5"]}\nIDEA: ${text}${ctx}`,
              img
            );
            const d = JSON.parse(raw.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/)![0]);
            if ($("idea-title")) $("idea-title")!.textContent = d.title || "Idea";
            if ($("idea-tag")) $("idea-tag")!.textContent = d.tag || "Idea";
            if ($("master-doc")) $("master-doc")!.innerHTML = d.doc || "";
            d.rawText = text;
            await saveNew(d);
            ["k-todo", "k-doing", "k-done"].forEach((id) => { const el = $(id); if (el) el.innerHTML = ""; });
            (d.roadmap || []).forEach((t: string) => makeCard(t, "k-todo"));
            saveKanban();
            calcPct();
            lastImgPrompt = d.imgPrompt || d.title;
            genImg(lastImgPrompt);
            logAct();
            toast("✅ ¡Idea analizada!");
          } catch (e: any) {
            const d = buildFreeIdea(text, ans);
            if ($("idea-title")) $("idea-title")!.textContent = d.title;
            if ($("idea-tag")) $("idea-tag")!.textContent = d.tag;
            if ($("master-doc")) $("master-doc")!.innerHTML = d.doc;
            d.rawText = text;
            await saveNew(d);
            ["k-todo", "k-doing", "k-done"].forEach((id) => { const el = $(id); if (el) el.innerHTML = ""; });
            d.roadmap.forEach((t: string) => makeCard(t, "k-todo"));
            saveKanban();
            calcPct();
            lastImgPrompt = d.imgPrompt;
            genImg(lastImgPrompt);
            logAct();
            toast("✅ Idea creada en modo gratis local");
          }
        }

        function buildFreeQuestions(text: string) {
          if ((text || "").trim().length < 12) return [];
          return [
            "¿Para quién es esta idea?",
            "¿Qué problema resuelve de forma concreta?",
            "¿Qué materiales, recursos o habilidades tienes ya?",
            "¿Qué la haría diferente a otras opciones?",
            "¿Cuál sería el primer prototipo pequeño que puedes probar?",
          ];
        }

        function escapeHTML(text: string) {
          return String(text || "").replace(
            /[&<>"']/g,
            (c) =>
              ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] || c)
          );
        }

        function buildFreeIdea(text: string, ans: any[] = []) {
          const clean = (text || "Idea nueva").trim();
          const short = clean.split(/[.!?\n]/)[0].slice(0, 70).trim() || "Idea nueva";
          const ctx = ans
            .filter((a) => a.a && !/omitido|vacío/.test(a.a))
            .map((a) => `<li><strong>${escapeHTML(a.q)}</strong> ${escapeHTML(a.a)}</li>`)
            .join("");
          const title = toTitle(short);
          const tag = detectSpanishTag(clean);
          const doc = `<h3>Qué es</h3><p>${escapeHTML(clean)}</p><h3>Enfoque</h3><p>Convierte la idea en un prototipo simple, visible y comprobable antes de gastar dinero.</p>${ctx ? `<h3>Respuestas clave</h3><ul>${ctx}</ul>` : ""}<h3>Primeros pasos</h3><ol><li>Definir el usuario principal.</li><li>Hacer un boceto o maqueta rápida.</li><li>Probarlo con una persona real.</li><li>Anotar qué funcionó y qué hay que ajustar.</li></ol><h3>Riesgos</h3><ul><li>Intentar hacerlo demasiado grande al inicio.</li><li>No validar si alguien realmente lo necesita.</li></ul>`;
          return { title, tag, doc, imgPrompt: buildVisualPrompt(clean), roadmap: ["Definir usuario principal", "Bocetar la solución", "Crear prototipo simple", "Probar con alguien real", "Mejorar con feedback"] };
        }

        function detectSpanishTag(text: string) {
          const lower = (text || "").toLowerCase();
          if (/app|web|software|plataforma|digital|ia|inteligencia/.test(lower)) return "App";
          if (/venta|tienda|cliente|negocio|emprend/.test(lower)) return "Negocio";
          if (/producto|fabric|material|objeto|prototipo/.test(lower)) return "Producto";
          return "Proyecto";
        }

        function toTitle(text: string) {
          return text.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
        }

        function getImageApiKey() {
          return localStorage.getItem(IMG_API_KEY_STORAGE) || "";
        }

        function buildVisualPrompt(text: string, title?: string) {
          const subject = (title || text).slice(0, 120);
          const keywords = extractKeywords(text);
          return `photorealistic product concept mockup: ${subject}. style: clean studio photography, soft natural light, high detail, professional composition, ${keywords}, no text, no watermark`;
        }

        function extractKeywords(text: string) {
          const dict: Record<string, string> = {
            antena: "antenna", casera: "homemade", celular: "phone", movil: "mobile",
            cafeteria: "cafe", moderna: "modern", acogedor: "cozy", ambiente: "atmosphere",
            mochila: "backpack", ecologica: "ecological", reciclado: "recycled", materiales: "materials",
            proyecto: "project", negocio: "business", app: "app", aplicacion: "application",
            tecnologia: "technology", prototipo: "prototype", diseno: "design", producto: "product",
            idea: "idea", innovacion: "innovation", startup: "startup", emprendimiento: "entrepreneurship",
            madera: "wood", tela: "fabric", metal: "metal", plastico: "plastic", carton: "cardboard",
            pintura: "painting", arte: "art", dibujo: "drawing", escultura: "sculpture",
            robot: "robot", drone: "drone", avion: "airplane", barco: "boat", auto: "car",
            comida: "food", restaurante: "restaurant", cocina: "kitchen", receta: "recipe",
            ropa: "clothing", zapato: "shoe", accesorio: "accessory", joyeria: "jewelry",
            planta: "plant", jardin: "garden", salud: "health", deporte: "sport",
          };
          const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3).slice(0, 8);
          const translated = normalized.map((w) => dict[w] || w);
          const category = detectCategory(text);
          if (category) translated.unshift(category);
          return [...new Set(translated)].slice(0, 6).join(", ");
        }

        function detectCategory(text: string) {
          const lower = text.toLowerCase();
          if (/tecnolog|electr|circuit|arduino|raspberry|sensor|iot/i.test(lower)) return "technology";
          if (/negocio|empresa|startup|comercio|tienda|venta/i.test(lower)) return "business";
          if (/app|aplicaci|software|web|digital/i.test(lower)) return "application";
          if (/disen|arte|grafic|visual|creativ|pintur/i.test(lower)) return "design";
          if (/product|manufactur|fabricaci|construcci/i.test(lower)) return "product";
          if (/comida|receta|restaurante|cocina/i.test(lower)) return "food";
          return "";
        }

        function buildPollinationsUrl(prompt: string, width: number, height: number, model: string) {
          const seed = Math.floor(Math.random() * 9999999);
          const enc = encodeURIComponent(prompt.slice(0, 280));
          const params = `?width=${width}&height=${height}&seed=${seed}&nologo=true`;
          const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
          const base = isLocal ? `/pollinations-img/${enc}` : `https://image.pollinations.ai/prompt/${enc}`;
          return base + params;
        }

        function loadImageViaFetch(url: string, timeoutMs: number): Promise<string> {
          return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, timeoutMs);
            fetch(url, { signal: controller.signal, referrerPolicy: "no-referrer" })
              .then(res => {
                clearTimeout(timer);
                console.log(`[Papaleta IMG] ${res.status} — ${url.slice(0, 80)}`);
                if (!res.ok) reject(new Error(`HTTP ${res.status}`));
                else return res.blob();
              })
              .then(blob => {
                if (blob) {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                }
              })
              .catch(err => { clearTimeout(timer); reject(err); });
          });
        }

        function friendlyImageError(err: any) {
          const msg = err?.message || String(err || "");
          console.warn("[Papaleta IMG] Error:", msg);
          if (/timeout/i.test(msg)) return "El generador tardo demasiado. Intenta de nuevo.";
          if (/403/i.test(msg)) return "El servidor bloqueo la peticion (403). Intenta de nuevo.";
          return "No se pudo generar la imagen. Intenta de nuevo.";
        }

        async function loadGeneratedImage(prompt: string, onload: (src: string) => void, onerror: (err: string) => void, width = 1024, height = 576) {
          const attempts = [
            { model: "default", timeout: 45000 },
            { model: "backup", timeout: 45000 },
          ];
          let lastErr: any;
          for (const { model, timeout } of attempts) {
            const url = buildPollinationsUrl(prompt, width, height, model);
            console.log(`[Papaleta IMG] Intentando modelo "${model}"...`);
            try {
              const src = await loadImageViaFetch(url, timeout);
              console.log("[Papaleta IMG] Imagen generada OK");
              onload(src);
              return;
            } catch (e) {
              console.warn(`[Papaleta IMG] Modelo "${model}" fallo:`, (e as any)?.message);
              lastErr = e;
            }
          }
          onerror(friendlyImageError(lastErr));
        }

        let _carouselTimer: any;
        function showHeroImg(w: HTMLElement, src: string | string[]) {
          const idea = ideaId ? ideas.find((i) => i.id === ideaId) : null;
          let urls: string[] = [];
          if (Array.isArray(src)) {
            urls = src;
          } else {
            urls = idea?.imgUrls || (idea?.imgUrl ? [idea.imgUrl] : []);
            if (!urls.includes(src)) urls.unshift(src);
          }

          if (urls.length === 0) return;

          w.innerHTML = "";
          w.style.position = "relative";
          w.style.overflow = "hidden";

          const container = document.createElement("div");
          container.style.cssText = "display:flex;width:100%;height:100%;transition:transform 0.5s ease-in-out;";
          w.appendChild(container);

          urls.forEach(u => {
            const img = document.createElement("img");
            img.className = "hero-img";
            img.src = u;
            img.style.minWidth = "100%";
            img.style.objectFit = "cover";
            container.appendChild(img);
          });

          // Upload Button
          const btnUpload = document.createElement("button");
          btnUpload.className = "hero-btn-upload";
          btnUpload.innerHTML = "🖼️ Añadir foto";
          btnUpload.style.cssText = "position:absolute;bottom:16px;right:16px;padding:8px 16px;background:rgba(0,0,0,0.6);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;backdrop-filter:blur(8px);z-index:10;";
          btnUpload.onclick = () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.multiple = true;
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (!files?.length) return;
              let loaded = 0;
              Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (re) => {
                  urls.push(re.target?.result as string);
                  loaded++;
                  if (loaded === files.length) {
                    showHeroImg(w, urls);
                  }
                };
                reader.readAsDataURL(file);
              });
            };
            input.click();
          };
          w.appendChild(btnUpload);

          // Dots indicator
          if (urls.length > 1) {
            const dots = document.createElement("div");
            dots.style.cssText = "position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:10;";
            urls.forEach((_, i) => {
              const d = document.createElement("div");
              d.style.cssText = `width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,${i === 0 ? 0.9 : 0.4});transition:background 0.3s;`;
              dots.appendChild(d);
            });
            w.appendChild(dots);

            let idx = 0;
            if (_carouselTimer) clearInterval(_carouselTimer);
            _carouselTimer = setInterval(() => {
              idx = (idx + 1) % urls.length;
              container.style.transform = `translateX(-${idx * 100}%)`;
              Array.from(dots.children).forEach((d: any, i) => {
                d.style.background = `rgba(255,255,255,${i === idx ? 0.9 : 0.4})`;
              });
            }, 4000);
          }

          if (ideaId) {
            sF("imgUrl", urls[0]);
            sF("imgUrls", urls);
          }
        }

        function showMinimalPlaceholder(w: HTMLElement, prompt = "", error = "") {
          w.innerHTML = `<div style="width:100%;height:320px;background:linear-gradient(135deg,#F9FAFB,#E5E7EB);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;text-align:center"><div style="font-size:64px;opacity:0.3">🎨</div><div style="font-size:14px;color:var(--text2);font-weight:600">Imagen no disponible</div><div style="font-size:12px;color:var(--text2);max-width:520px;line-height:1.6">${escapeHTML(error || "El generador tardó demasiado. Puedes reintentar.")}</div><button onclick="window.__regen()" style="padding:8px 18px;background:var(--primary);color:white;border:none;border-radius:20px;font-size:13px;cursor:pointer;font-weight:600;">🔄 Reintentar</button></div>`;
        }

        function genImg(prompt: string) {
          const w = $("hero-wrap");
          if (!w) return;
          const visualPrompt = buildVisualPrompt(prompt);
          w.innerHTML = '<div class="hero-loading"><span class="spin"></span> Generando imagen con IA…</div>';
          loadGeneratedImage(visualPrompt, (src) => showHeroImg(w, src), (err) => showMinimalPlaceholder(w, visualPrompt, err), 1024, 576);
        }
        window.__regen = () => lastImgPrompt && genImg(lastImgPrompt);

        function scheduleLiveVisual(text: string) {
          const preview = $("live-visual-preview");
          const title = $("live-visual-title");
          const status = $("live-visual-status");
          if (!preview || !title || !status) return;
          const clean = (text || "").trim();
          clearTimeout(liveVisualTimer);
          if (clean.length < 12) {
            liveVisualPrompt = "";
            title.textContent = "Empieza a hablar para visualizar la idea";
            status.textContent = "Con 2 o 3 palabras más genero una imagen.";
            preview.innerHTML = '<div class="lv-empty">Tu imagen aparecerá aquí mientras dictas la idea.</div>';
            return;
          }
          title.textContent = clean.split(/[.!?\n]/)[0].slice(0, 72);
          liveVisualTimer = setTimeout(() => {
            const prompt = buildVisualPrompt(clean);
            if (prompt === liveVisualPrompt) return;
            liveVisualPrompt = prompt;
            preview.innerHTML = '<div class="hero-loading"><span class="spin"></span> Creando vista…</div>';
            loadGeneratedImage(
              prompt,
              (src) => { preview.innerHTML = `<img src="${src}" alt="Visualización">`; if (status) status.textContent = "Imagen generada. Sigue dictando para actualizar."; },
              () => { preview.innerHTML = '<div class="lv-empty">No pude cargar la imagen ahora.</div>'; },
              640, 360
            );
          }, 900);
        }

        // Progress ring
        function setPct(p: number) {
          const c = 2 * Math.PI * 34;
          const arc = $("ring-arc");
          if (arc) (arc as SVGCircleElement).style.strokeDashoffset = String(c - (p / 100) * c);
          if ($("ring-pct")) $("ring-pct")!.textContent = p + "%";
        }

        function calcPct() {
          const a = document.querySelectorAll(".k-card").length;
          const d = document.querySelectorAll("#k-done .k-card").length;
          const p = a ? Math.round((d / a) * 100) : 0;
          setPct(p);
          sF("progress", p);
        }

        // KANBAN
        function makeCard(t: string, col = "k-todo") {
          const d = document.createElement("div");
          d.className = "k-card";
          d.draggable = true;
          d.textContent = t;
          d.id = "kc_" + Math.random().toString(36).slice(2, 8);
          d.ondragstart = (e) => { e.dataTransfer!.setData("id", d.id); d.classList.add("dragging"); };
          d.ondragend = () => d.classList.remove("dragging");
          d.ondblclick = () => editCard(d);
          $(col)?.appendChild(d);
          return d;
        }

        function editCard(c: HTMLElement) {
          c.contentEditable = "true";
          c.focus();
          c.onblur = () => { c.contentEditable = "false"; saveKanban(); calcPct(); };
        }

        function loadKanban(kb: any) {
          ["todo", "doing", "done"].forEach((c) => {
            const el = $("k-" + c);
            if (el) el.innerHTML = "";
            (kb[c] || []).forEach((t: string) => makeCard(t, "k-" + c));
          });
        }

        function saveKanban() {
          const g = (id: string) => [...($(id)?.querySelectorAll(".k-card") || [])].map((c) => c.textContent || "");
          sF("kanban", { todo: g("k-todo"), doing: g("k-doing"), done: g("k-done") });
        }

        window.addKanbanCard = (col: string) => {
          const d = makeCard("Nueva tarea", "k-" + col);
          editCard(d);
        };

        function setupKanban() {
          ["k-todo", "k-doing", "k-done"].forEach((id) => {
            const el = $(id);
            if (!el) return;
            el.ondragover = (e) => { e.preventDefault(); el.classList.add("drag-over"); };
            el.ondragleave = () => el.classList.remove("drag-over");
            el.ondrop = (e) => {
              e.preventDefault();
              el.classList.remove("drag-over");
              const c = document.getElementById((e as DragEvent).dataTransfer!.getData("id"));
              if (c) el.appendChild(c);
              calcPct();
              saveKanban();
            };
          });
        }

        // TIMELINE
        function renderTL(entries: any[]) {
          const tl = $("timeline");
          if (!tl) return;
          if (!entries?.length) {
            tl.innerHTML = '<div class="tl-empty">Sube fotos de tu proceso 📷</div>';
            return;
          }
          tl.innerHTML = entries
            .map(
              (e, i) =>
                `<div class="tl-entry"><img src="${e.data}" alt=""/><div class="tl-date">${e.date}</div>${e.desc ? `<div class="tl-desc">${e.desc}</div>` : ""}<button class="tl-rm" onclick="window.__rmtl(${i})">✕</button></div>`
            )
            .join("");
        }

        function addTLPhotos(files: FileList) {
          if (!files?.length || !ideaId) return;
          const idea = ideas.find((i) => i.id === ideaId);
          const tl = idea?.timeline || [];
          Array.from(files).forEach((f) => {
            const r = new FileReader();
            r.onload = async (ev) => {
              const b64 = (ev.target!.result as string).split(",")[1];
              toast("🔍 Escaneando imagen con IA...", 4000);
              let desc = "Avance del proyecto";
              try {
                const res = await aiCall("Describe esta imagen de avance de proyecto. Di qué acción o elemento físico se observa en máximo 6 palabras, de forma muy directa. Responde SOLO con esa frase corta, sin explicaciones ni comillas.", b64);
                desc = res.trim().replace(/^["']|["']$/g, "");
              } catch (e) { }
              tl.push({ data: ev.target!.result, date: new Date().toLocaleDateString("es", { day: "numeric", month: "short" }), desc });
              sF("timeline", tl);
              renderTL(tl);
              ideas = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
              toast("📸 ¡Foto agregada con descripción de IA!");
            };
            r.readAsDataURL(f);
          });
        }

        window.__rmtl = (idx: number) => {
          const idea = ideas.find((i) => i.id === ideaId);
          if (!idea) return;
          const tl = idea.timeline || [];
          tl.splice(idx, 1);
          sF("timeline", tl);
          renderTL(tl);
          ideas = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
        };

        // HEATMAP
        function logAct() {
          const d = new Date().toISOString().slice(0, 10);
          const h = JSON.parse(localStorage.getItem("pp_hm") || "{}");
          h[d] = (h[d] || 0) + 1;
          localStorage.setItem("pp_hm", JSON.stringify(h));
        }

        function renderHeatmap() {
          const hm = $("heatmap");
          if (!hm) return;
          const h = JSON.parse(localStorage.getItem("pp_hm") || "{}");
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();
          const monthName = now.toLocaleString("es", { month: "long" });
          const firstDay = new Date(currentYear, currentMonth, 1).getDay();
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          const dayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

          let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><span style="font-size:15px;font-weight:700;text-transform:capitalize;">${monthName} ${currentYear}</span><span style="font-size:11px;color:var(--text3);">Haz clic en un dia</span></div>`;
          html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center;">`;
          dayLabels.forEach(d => { html += `<div style="font-size:10px;font-weight:600;color:var(--text3);padding-bottom:4px;">${d}</div>`; });
          for (let i = 0; i < firstDay; i++) html += `<div></div>`;
          for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(currentYear, currentMonth, d);
            const k = date.toISOString().slice(0, 10);
            const c = h[k] || 0;
            const isToday = date.toDateString() === now.toDateString();
            let bg = "transparent", color = "var(--text2)", border = "1px solid var(--border)";
            if (c > 0) { bg = `color-mix(in srgb, var(--primary) ${Math.min(90, 40 + c * 15)}%, transparent)`; color = "#fff"; border = "none"; }
            if (isToday) border = "2px solid var(--primary)";
            html += `<div title="${k}: ${c} acciones" style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:11px;font-weight:500;background:${bg};color:${color};border:${border};cursor:pointer;transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'" onclick="window.__dayClick('${k}',${c})">${d}</div>`;
          }
          html += `</div>`;
          hm.innerHTML = html;
        }

        (window as any).__dayClick = (dateKey: string, count: number) => {
          const container = document.getElementById("day-activity-content");
          if (!container) return;
          const date = new Date(dateKey + "T12:00:00");
          const dStr = date.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
          const allIdeas: any[] = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
          const acts = allIdeas.filter(i => {
            const created = i.createdAt && new Date(i.createdAt).toDateString() === date.toDateString();
            const updated = i.updatedAt && new Date(i.updatedAt).toDateString() === date.toDateString();
            return created || updated;
          });
          if (acts.length > 0) {
            let inner = `<div style="width:100%;text-align:left;overflow-y:auto;max-height:240px;"><h4 style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;">${dStr}</h4><div style="display:flex;flex-direction:column;gap:8px;">`;
            for (const a of acts) {
              const initial = a.title ? a.title.charAt(0).toUpperCase() : "I";
              inner += `<div onclick="window.__ld('${a.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg2);border-radius:10px;border:1px solid var(--border);cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='var(--primary-l)'" onmouseout="this.style.background='var(--bg2)'">`;
              inner += `<div style="width:36px;height:36px;border-radius:8px;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;">${initial}</div>`;
              inner += `<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.title || "Idea"}</div><div style="font-size:11px;color:var(--text3);margin-top:2px;">${a.tag || "Idea"} &middot; ${a.progress || 0}%</div></div></div>`;
            }
            inner += `</div></div>`;
            container.innerHTML = inner;
          } else if (count > 0) {
            container.innerHTML = `<div style="text-align:center;"><div style="font-size:28px;margin-bottom:10px;">👻</div><p style="font-size:13px;color:var(--text2);">${count} acciones el ${dStr}, pero sin cambios en ideas.</p></div>`;
          } else {
            container.innerHTML = `<div style="text-align:center;"><div style="font-size:28px;margin-bottom:10px;opacity:0.4;">💤</div><p style="font-size:13px;color:var(--text3);">Sin actividad el ${dStr}</p></div>`;
          }
        };

        // DARK MODE
        function toggleDarkMode() {
          const root = $("papaleta-root");
          if (!root) return;
          const isDark = root.getAttribute("data-theme") === "dark";
          const newTheme = isDark ? "light" : "dark";
          root.setAttribute("data-theme", newTheme);
          localStorage.setItem("pp_theme", newTheme);
          toast(isDark ? "Modo claro activado" : "Modo oscuro activado");
        }

        function loadDarkMode() {
          const savedTheme = localStorage.getItem("pp_theme") || "light";
          const root = $("papaleta-root");
          if (root) root.setAttribute("data-theme", savedTheme);
        }

        // VOICE
        function toggleVoice() { recog ? stopVoice() : startVoice(); }

        async function startVoice() {
          const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SR) { toast("Tu navegador no trae transcripción gratis. Usa Chrome o Edge."); return; }
          try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
          catch (e) { toast("Permiso de micrófono denegado"); return; }
          const ta = $("idea-text") as HTMLTextAreaElement;
          recog = new SR();
          recog.lang = navigator.language?.startsWith("es") ? navigator.language : "es-CO";
          recog.continuous = true;
          recog.interimResults = true;
          let finalText = ta.value.trim() ? ta.value.trim() + " " : "";
          recog.onresult = (e: any) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const transcript = e.results[i][0].transcript.trim();
              if (e.results[i].isFinal) { finalText += (finalText.endsWith(" ") ? "" : " ") + transcript + " "; }
              else { interim = transcript; }
            }
            ta.value = (finalText + interim).trimStart();
            const vs = $("voice-status");
            if (vs) vs.textContent = interim ? "Escuchando borrador…" : "Transcripción guardada, sigue hablando…";
            scheduleLiveVisual(ta.value);
          };
          recog.onerror = (e: any) => {
            const msg = e.error === "no-speech" ? "No escuché voz clara. Intenta de nuevo." : "Se pausó la transcripción.";
            toast(msg);
            stopVoice();
          };
          recog.onend = () => { if (recog) { try { recog.start(); } catch (e) { stopVoice(); } } };
          try {
            recog.start();
            const bv = $("btn-voice");
            if (bv) { bv.textContent = "⏹ Detener"; bv.classList.add("recording"); }
            $("voice-bar")?.classList.remove("hidden");
            const vs = $("voice-status");
            if (vs) vs.textContent = "Escuchando y transcribiendo…";
            toast("Habla tu idea: texto e imagen se actualizarán solos");
          } catch (e) { recog = null; toast("No pude iniciar el micrófono"); }
        }

        function stopVoice() {
          const active = recog;
          recog = null;
          if (active) { try { active.stop(); } catch (e) { } }
          const bv = $("btn-voice");
          if (bv) { bv.textContent = "🎤 Voz"; bv.classList.remove("recording"); }
          $("voice-bar")?.classList.add("hidden");
          scheduleLiveVisual(($("idea-text") as HTMLTextAreaElement)?.value || "");
        }

        // IMAGE UPLOAD
        function loadImg(f: File) {
          if (!f) return;
          const r = new FileReader();
          r.onload = (e) => {
            imgB64 = (e.target!.result as string).split(",")[1];
            ($("img-preview") as HTMLImageElement).src = e.target!.result as string;
            $("img-preview-wrap")?.classList.remove("hidden");
          };
          r.readAsDataURL(f);
        }

        function clearImg() {
          imgB64 = null;
          $("img-preview-wrap")?.classList.add("hidden");
          const fi = $("file-img") as HTMLInputElement;
          if (fi) fi.value = "";
        }

        // FLOAT MENU
        function handleSel() {
          const s = window.getSelection();
          const m = $("float-menu");
          if (!s || s.isCollapsed || s.toString().trim().length < 5) { m?.classList.add("hidden"); return; }
          const rr = s.getRangeAt(0).getBoundingClientRect();
          if (m) {
            m.style.top = rr.top + window.scrollY - 48 + "px";
            m.style.left = Math.max(10, rr.left + rr.width / 2 - 120) + "px";
            m.classList.remove("hidden");
          }
        }

        async function floatAI(a: string) {
          const sel = window.getSelection()?.toString().trim();
          if (!sel) return;
          $("float-menu")?.classList.add("hidden");
          toast("✨ Procesando…");
          try {
            const r = await aiCall(
              `${a === "improve" ? "Mejora" : a === "expand" ? "Expande" : a === "simplify" ? "Simplifica" : "Da alternativas para"}:\n"${sel}"\nDevuelve solo el texto resultante.`
            );
            const md = $("master-doc");
            if (md) { md.innerHTML = md.innerHTML.replace(sel, r.trim()); sF("doc", md.innerHTML); }
            toast("✅ Listo");
          } catch (e: any) { toast("❌ " + e.message); }
        }

        // CHAT
        const addBubble = (w: string, t: string) => {
          const d = document.createElement("div");
          d.className = "bubble " + w;
          d.innerHTML = t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
          const msgs = $("chat-msgs");
          if (msgs) { msgs.appendChild(d); msgs.scrollTop = 9999; }
        };

        const resetChat = () => {
          const msgs = $("chat-msgs");
          if (msgs) msgs.innerHTML = '<div class="bubble ai">Puedo editar el documento, agregar tareas, cambiar progreso o responder preguntas. 🚀</div>';
        };

        async function sendChat() {
          const input = $("chat-input") as HTMLTextAreaElement;
          const msg = input?.value.trim();
          if (!msg) return;
          input.value = "";
          addBubble("user", msg);
          const docTxt = $("master-doc")?.innerText?.slice(0, 500) || "";
          const idea = ideas.find((i) => i.id === ideaId);
          const kb = `Todo:${[...($("k-todo")?.querySelectorAll(".k-card") || [])].map((c) => c.textContent).join(",")}|Doing:${[...($("k-doing")?.querySelectorAll(".k-card") || [])].map((c) => c.textContent).join(",")}|Done:${[...($("k-done")?.querySelectorAll(".k-card") || [])].map((c) => c.textContent).join(",")}`;
          try {
            const raw = await aiCall(
              `Asistente Papaleta. Idea:"${idea?.title}". Progreso:${idea?.progress || 0}%.\nDoc:"${docTxt}"\nKanban:${kb}\nUsuario:"${msg}"\nResponde SOLO JSON con UNA acción:\n{"action":"rewrite","doc":"<h3>...</h3><p>HTML nuevo</p>","response":"qué cambié"}\n{"action":"add_task","task":"texto","column":"todo|doing|done","response":"qué agregué"}\n{"action":"add_multiple_tasks","tasks":["tarea1","tarea2"],"response":"qué agregué"}\n{"action":"move_task","task":"nombre","to":"todo|doing|done","response":"qué moví"}\n{"action":"complete_task","task":"nombre","response":"qué completé"}\n{"action":"set_progress","value":50,"response":"razón"}\n{"action":"chat","response":"respuesta"}\nEspañol. Solo JSON.`
            );
            let p: any;
            try { p = JSON.parse(raw.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/)![0]); }
            catch { p = { action: "chat", response: raw }; }
            addBubble("ai", p.response || "✅");
            if (p.action === "rewrite" && p.doc) { const md = $("master-doc"); if (md) { md.innerHTML = p.doc; sF("doc", p.doc); toast("📝 Documento actualizado"); } }
            if (p.action === "add_task" && p.task) { const col = p.column || "todo"; makeCard(p.task, `k-${col}`); saveKanban(); calcPct(); toast(`✅ Tarea agregada`); }
            if (p.action === "add_multiple_tasks" && p.tasks && Array.isArray(p.tasks)) { p.tasks.forEach((t: string) => makeCard(t, "k-todo")); saveKanban(); calcPct(); toast(`✅ ${p.tasks.length} tareas agregadas`); }
            if (p.action === "move_task" && p.task && p.to) {
              const cards = [...(document.querySelectorAll(".k-card") || [])];
              const m = cards.find((c) => c.textContent?.toLowerCase().includes(p.task.toLowerCase()));
              if (m) { $(`k-${p.to}`)?.appendChild(m); saveKanban(); calcPct(); toast(`✅ Tarea movida`); }
            }
            if (p.action === "complete_task" && p.task) {
              const cards = [...(document.querySelectorAll("#k-todo .k-card, #k-doing .k-card") || [])];
              const m = cards.find((c) => c.textContent?.toLowerCase().includes(p.task.toLowerCase()));
              if (m) { $("k-done")?.appendChild(m); saveKanban(); calcPct(); toast("✅ Tarea completada"); }
            }
            if (p.action === "set_progress" && typeof p.value === "number") { setPct(p.value); sF("progress", p.value); toast(`📊 Progreso: ${p.value}%`); }
            ideas = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
            renderNav();
          } catch (e: any) { addBubble("ai", "❌ " + e.message); }
        }

        async function chatImg(f: File) {
          if (!f) return;
          const r = new FileReader();
          r.onload = async (e) => {
            const b = (e.target!.result as string).split(",")[1];
            try { addBubble("ai", "🖼️ " + (await aiCall("Describe esta imagen brevemente. Español.", b))); }
            catch (e: any) { addBubble("ai", "❌ " + e.message); }
          };
          r.readAsDataURL(f);
        }

        async function startLocalSession() {
          user = { uid: "local", displayName: "Creador Local", photoURL: "" };
          $("login")?.classList.add("hidden");
          $("app")?.classList.remove("hidden");
          updateUserProfile(user);
          await loadIdeas();
          renderNav();
          showDashboard();
          wire();
          toast("Modo local gratis activado");
        }

        function wire() {
          if (wired) return;
          wired = true;

          const btnLogin = $("btn-login");
          if (btnLogin) btnLogin.onclick = () => signInWithPopup(auth, provider).catch((e) => toast("Error: " + e.message));
          const btnLogout = $("btn-logout");
          if (btnLogout) btnLogout.onclick = () => { localStorage.removeItem("pp_local_mode"); localMode = false; user = null; signOut(auth).finally(() => location.reload()); };
          const btnNew = $("btn-new");
          if (btnNew) btnNew.onclick = newIdea;
          const btnCollapse = $("btn-collapse");
          if (btnCollapse) btnCollapse.onclick = () => $("sidebar")?.classList.toggle("collapsed");
          const btnHamburger = $("btn-hamburger");
          if (btnHamburger) btnHamburger.onclick = () => { $("sidebar")?.classList.toggle("open"); $("sb-overlay")?.classList.toggle("hidden"); };
          const sbOverlay = $("sb-overlay");
          if (sbOverlay) sbOverlay.onclick = () => { $("sidebar")?.classList.remove("open"); $("sb-overlay")?.classList.add("hidden"); };
          const btnDark = $("btn-dark-mode");
          if (btnDark) btnDark.onclick = toggleDarkMode;
          loadDarkMode();

          const btnAnalyze = $("btn-analyze");
          if (btnAnalyze) btnAnalyze.onclick = analyze;
          const ideaText = $("idea-text");
          if (ideaText) ideaText.addEventListener("input", () => scheduleLiveVisual((ideaText as HTMLTextAreaElement).value));

          // Pollinations key removed from UI — images use free public API

          const fileImg = $("file-img") as HTMLInputElement;
          if (fileImg) fileImg.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) loadImg(f); };
          const btnRmImg = $("btn-rm-img");
          if (btnRmImg) btnRmImg.onclick = clearImg;
          const btnVoice = $("btn-voice");
          if (btnVoice) btnVoice.onclick = toggleVoice;
          const btnStopVoice = $("btn-stop-voice");
          if (btnStopVoice) btnStopVoice.onclick = stopVoice;

          const chatFab = $("chat-fab");
          if (chatFab) chatFab.onclick = () => $("chat-panel")?.classList.toggle("hidden");
          const btnCloseChat = $("btn-close-chat");
          if (btnCloseChat) btnCloseChat.onclick = () => $("chat-panel")?.classList.add("hidden");
          const btnSend = $("btn-send");
          if (btnSend) btnSend.onclick = sendChat;
          const chatInput = $("chat-input");
          if (chatInput) chatInput.onkeydown = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } };
          const chatFile = $("chat-file") as HTMLInputElement;
          if (chatFile) chatFile.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) chatImg(f); };

          const btnRegenImg = $("btn-regen-img");
          if (btnRegenImg) btnRegenImg.onclick = () => lastImgPrompt && genImg(lastImgPrompt);

          window.__uploadImg = () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                  const b64 = re.target?.result as string;
                  const w = $("hero-wrap");
                  if (w) showHeroImg(w, b64);
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
          };

          const ideaTitle = $("idea-title");
          if (ideaTitle) ideaTitle.addEventListener("blur", () => sF("title", ideaTitle.textContent?.trim()));
          const masterDoc = $("master-doc");
          if (masterDoc) masterDoc.addEventListener("blur", () => sF("doc", masterDoc.innerHTML));

          const fileTL = $("file-timeline") as HTMLInputElement;
          if (fileTL) fileTL.onchange = (e) => { const files = (e.target as HTMLInputElement).files; if (files) addTLPhotos(files); };

          document.addEventListener("mouseup", handleSel);
          document.querySelectorAll(".fm-btn").forEach((b) => { (b as HTMLElement).onclick = () => floatAI((b as HTMLElement).dataset.action || ""); });
          document.querySelectorAll(".tb-btn").forEach((b) => {
            (b as HTMLElement).onclick = () => {
              document.execCommand((b as HTMLElement).dataset.cmd || "", false, (b as HTMLElement).dataset.val || undefined);
              $("master-doc")?.focus();
            };
          });
          setupKanban();
        }

        // AUTH
        onAuthStateChanged(auth, async (u) => {
          if (u) {
            localMode = false;
            localStorage.removeItem("pp_local_mode");
            user = u;
            await loadUserSettings(u.uid);
            $("login")?.classList.add("hidden");
            $("app")?.classList.remove("hidden");
            updateUserProfile(u);
            await loadIdeas();
            renderNav();
            showDashboard();
            wire();
            // groq key loaded from localStorage automatically
          } else {
            if (localMode) { await startLocalSession(); return; }
            $("login")?.classList.remove("hidden");
            $("app")?.classList.add("hidden");
          }
        });

        const btnLogin = $("btn-login");
        if (btnLogin) btnLogin.onclick = () => signInWithPopup(auth, provider).catch((e) => toast("Error: " + e.message));
        const btnLocal = $("btn-local");
        if (btnLocal) btnLocal.onclick = async () => { localMode = true; localStorage.setItem("pp_local_mode", "1"); await startLocalSession(); };

        // Image regen modal
        const regenModal = $("regen-modal");
        const regenPromptInput = $("regen-prompt-input") as HTMLTextAreaElement;
        const btnRegenConfirm = $("btn-regen-confirm");
        const btnRegenCancel = $("btn-regen-cancel");
        const btnOpenRegen = $("btn-regen-img");
        if (btnOpenRegen) btnOpenRegen.onclick = () => {
          if (regenPromptInput) regenPromptInput.value = lastImgPrompt || "";
          regenModal?.classList.remove("hidden");
          regenPromptInput?.focus();
        };
        if (btnRegenCancel) btnRegenCancel.onclick = () => regenModal?.classList.add("hidden");
        if (regenModal) regenModal.onclick = (e: MouseEvent) => { if (e.target === regenModal) regenModal.classList.add("hidden"); };
        if (btnRegenConfirm) btnRegenConfirm.onclick = () => {
          const prompt = regenPromptInput?.value.trim();
          if (prompt) { lastImgPrompt = prompt; genImg(prompt); }
          regenModal?.classList.add("hidden");
        };

      } catch (err) {
        console.error("Papaleta init error:", err);
      }
    };

    initApp();
  }, []);

  return (
    <div id="papaleta-root" data-theme="light">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>

      {/* LOGIN */}
      <div id="login" className="login-screen" style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#05050f", overflow: "hidden", position: "relative" }}>
        <StarfieldBackground />

        <div className="login-card" style={{
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 28,
          padding: "40px 28px",
          maxWidth: 440,
          width: "90%",
          zIndex: 2,
          position: "relative",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          alignItems: "center"
        }}>

          {/* Iconos superiores */}
          <div style={{ textAlign: "center", display: "flex", gap: "10px", alignItems: "center", justifyContent: "center" }}>
            {/* Puedes reemplazar estos emojis por tus componentes <img src="..." /> de la piruleta y el sombrero si los tienes */}
            <span style={{ fontSize: "28px" }}>🍭</span>
            <span style={{ fontSize: "28px" }}>🎩</span>
          </div>

          {/* Títulos */}
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <h1 className="lc-title" style={{ fontSize: "36px", color: "#ffffff", margin: "0 0 6px 0", fontWeight: "700", letterSpacing: "-0.5px" }}>Papaleta</h1>
            <p className="lc-sub" style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", margin: 0, fontWeight: "400" }}>Tu laboratorio de ideas con IA</p>
          </div>

          {/* Cuadrícula de características de 2x2 */}
          <div className="lc-features-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%", marginTop: "4px" }}>
            <div className="lcf" style={{ padding: "20px 12px", fontSize: "12px", color: "#ffffff", background: "rgba(255, 255, 255, 0.02)", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "24px" }}>🔍</span>
              <span style={{ opacity: 0.9 }}>Analiza inteligente</span>
            </div>
            <div className="lcf" style={{ padding: "20px 12px", fontSize: "12px", color: "#ffffff", background: "rgba(255, 255, 255, 0.02)", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "24px" }}>✨</span>
              <span style={{ opacity: 0.9 }}>Potencia con IA</span>
            </div>
            <div className="lcf" style={{ padding: "20px 12px", fontSize: "12px", color: "#ffffff", background: "rgba(255, 255, 255, 0.02)", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "24px" }}>📁</span>
              <span style={{ opacity: 0.9 }}>Kanban interactivo</span>
            </div>
            <div className="lcf" style={{ padding: "20px 12px", fontSize: "12px", color: "#ffffff", background: "rgba(255, 255, 255, 0.02)", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "24px" }}>📈</span>
              <span style={{ opacity: 0.9 }}>Visual de avances</span>
            </div>
          </div>

          {/* Botón de Google */}
          <button id="btn-login" className="btn-google" style={{ width: "100%", padding: "12px", fontSize: "13px", fontWeight: "500", background: "rgba(255, 255, 255, 0.03)", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "8px", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.07)"} onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09a6.97 6.97 0 010-4.18V7.07H2.18A11 11 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Continuar con Google
          </button>

          {/* Botón de Login Naranja */}
          <button id="btn-local" className="btn-local" style={{ background: "#f25c05", color: "white", width: "100%", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "600", fontSize: "14px", letterSpacing: "0.5px", cursor: "pointer", transition: "transform 0.15s, background 0.15s", marginTop: "4px", boxShadow: "0 6px 20px rgba(242,92,5,0.25)" }} onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.01)"; e.currentTarget.style.background = "#ff6b12" }} onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "#f25c05" }}>LOGIN</button>

          {/* Nota al pie */}
          <p className="lc-note" style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", margin: 0, marginTop: "6px", letterSpacing: "0.3px" }}>Gratis &middot; Sin tarjeta &middot; Privado</p>
        </div>
      </div>

      {/* APP */}
      <div id="app" className="app hidden">
        <div className="mobile-topbar">
          <button id="btn-hamburger" className="icon-btn">☰</button>
          <span className="mt-logo"><img src="/papaletaLogok.png" alt="Papaleta" className="mt-logo-img" /> Papaleta</span>
          <button className="icon-btn" onClick={() => document.getElementById("btn-new")?.click()}>+</button>
        </div>

        <aside id="sidebar" className="sidebar">
          <div className="sb-header">
            <a href="#" onClick={(e) => { e.preventDefault(); window.showDashboard?.(); }} className="sb-logo-link" style={{ color: 'white', textDecoration: 'none' }}>
              <img src="/papaletaarriba.png" alt="Papaleta" className="sb-logo-img" />
              <span className="sb-logo-text">Papaleta</span>
            </a>
            <button id="btn-collapse" className="icon-btn" title="Colapsar">‹</button>
          </div>
          <button id="btn-new" className="btn-new"><span>+</span> Nueva Idea</button>
          <div className="sb-section-label">MIS IDEAS</div>
          <div id="ideas-nav" className="ideas-nav"><div className="empty-nav">Crea tu primera idea ✨</div></div>
          <div className="sb-footer">
            <button id="btn-dark-mode" className="btn-dark-mode" title="Cambiar tema">
              <svg className="theme-toggle-svg" width="20" height="20" viewBox="0 0 25 25" fill="none">
                <g className="sun-icon">
                  <path className="sun-center" d="M12.4058 17.7625C15.1672 17.7625 17.4058 15.5239 17.4058 12.7625C17.4058 10.0011 15.1672 7.76251 12.4058 7.76251C9.64434 7.76251 7.40576 10.0011 7.40576 12.7625C7.40576 15.5239 9.64434 17.7625 12.4058 17.7625Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path className="sun-ray" d="M12.4058 1.76251V3.76251" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path className="sun-ray" d="M12.4058 21.7625V23.7625" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path className="sun-ray" d="M4.62598 4.98248L6.04598 6.40248" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path className="sun-ray" d="M18.7656 19.1225L20.1856 20.5425" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path className="sun-ray" d="M1.40576 12.7625H3.40576" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path className="sun-ray" d="M21.4058 12.7625H23.4058" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path className="sun-ray" d="M4.62598 20.5425L6.04598 19.1225" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path className="sun-ray" d="M18.7656 6.40248L20.1856 4.98248" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </g>
                <path className="moon-icon" d="M21.1918 13.2013C21.0345 14.9035 20.3957 16.5257 19.35 17.8781C18.3044 19.2305 16.8953 20.2571 15.2875 20.8379C13.6797 21.4186 11.9398 21.5294 10.2713 21.1574C8.60281 20.7854 7.07479 19.9459 5.86602 18.7371C4.65725 17.5283 3.81774 16.0003 3.4457 14.3318C3.07367 12.6633 3.18451 10.9234 3.76526 9.31561C4.346 7.70783 5.37263 6.29868 6.72501 5.25307C8.07739 4.20746 9.69959 3.56862 11.4018 3.41132C10.4052 4.75958 9.92564 6.42077 10.0503 8.09273C10.175 9.76469 10.8957 11.3364 12.0812 12.5219C13.2667 13.7075 14.8384 14.4281 16.5104 14.5528C18.1823 14.6775 19.8435 14.1979 21.1918 13.2013Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div id="uavatar" className="u-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}></div>
            <span id="uname" className="u-name">—</span>
            <button id="btn-logout" className="icon-btn" title="Salir">⇥</button>
          </div>
        </aside>

        <main id="main" className="main">
          {/* DASHBOARD */}
          <div id="dashboard" className="dashboard">
            <div className="dash-profile-header">
              <div id="user-profile-pic" className="user-profile-pic"><div className="profile-initials">U</div></div>
              <div>
                <h1 id="user-greeting" className="user-greeting">Hola Usuario, ¿qué ideas tienes hoy?</h1>
                <p style={{ fontSize: 15, color: "var(--text2)", marginTop: 4 }}>Tu Laboratorio de Ideas</p>
              </div>
            </div>
            <div className="dash-stats-grid">
              <div className="stat-card"><div className="stat-icon">💡</div><div className="stat-value" id="stat-total">0</div><div className="stat-label">Ideas Creadas</div></div>
              <div className="stat-card"><div className="stat-icon">⚡</div><div className="stat-value" id="stat-progress">0</div><div className="stat-label">En Progreso</div></div>
              <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-value" id="stat-completed">0</div><div className="stat-label">Completadas</div></div>
              <div className="stat-card"><div className="stat-icon">🔥</div><div className="stat-value" id="stat-streak">0</div><div className="stat-label">Dias Seguidos</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 28 }}>
              <div className="dash-heatmap-card">
                <div className="dhc-header">
                  <div className="dhc-title"><span className="dhc-icon">📅</span><span>Tu Actividad</span></div>
                  <span id="dhc-total" className="dhc-total">0 acciones</span>
                </div>
                <div id="heatmap" style={{ width: '100%' }}></div>
              </div>
              <div className="dash-heatmap-card">
                <div className="dhc-header">
                  <div className="dhc-title"><span className="dhc-icon">📊</span><span>Detalle del Dia</span></div>
                </div>
                <div id="day-activity-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, color: 'var(--text3)', fontSize: 14, textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📆</div>
                  <p>Toca un dia en el calendario para ver tu actividad</p>
                </div>
              </div>
            </div>
            <div className="dash-ideas-section">
              <div className="dis-header">
                <h2 className="dis-title">💡 Ideas Potenciadas</h2>
                <span id="dis-count" className="dis-count">0 ideas</span>
              </div>
              <div id="ideas-grid" className="ideas-grid"></div>
            </div>
            <div className="dash-cta">
              <button className="btn-primary btn-large" onClick={() => document.getElementById("btn-new")?.click()}><span>✨</span> Crear Nueva Idea</button>
            </div>
          </div>

          {/* WORKSPACE */}
          <div id="workspace" className="workspace hidden">
            <div className="idea-header-card">
              <div className="ihc-left">
                <div className="ihc-meta">
                  <span id="idea-tag" className="tag-pill">Idea</span>
                  <span id="idea-date" className="date-label">Hoy</span>
                </div>
                <h1 id="idea-title" contentEditable suppressContentEditableWarning className="idea-title">Nueva idea</h1>
              </div>
              <div className="ihc-right">
                <div className="progress-ring">
                  <svg width="80" height="80" className="ring-svg">
                    <circle cx="40" cy="40" r="34" className="ring-bg" />
                    <circle id="ring-arc" cx="40" cy="40" r="34" className="ring-fg" />
                  </svg>
                  <div className="ring-content">
                    <span id="ring-pct" className="ring-label">0%</span>
                  </div>
                </div>
                <span className="ring-sublabel-bottom">Progreso</span>
              </div>
            </div>

            {/* INPUT */}
            <div id="input-zone" className="input-zone">
              <div className="iz-header">
                <span className="iz-label">💡 Describe tu idea</span>
                <div className="iz-actions">
                  <button id="btn-voice" className="chip-btn">🎤 Voz</button>
                  <label htmlFor="file-img" className="chip-btn">🖼️ Imagen</label>
                  <input type="file" id="file-img" accept="image/*" className="hidden" />
                </div>
              </div>
              <textarea id="idea-text" className="iz-textarea" placeholder="Habla o escribe tu idea. Papaleta la transcribe y crea una imagen gratis con IA."></textarea>
              <div id="live-visual" className="live-visual">
                <div className="lv-preview" id="live-visual-preview">
                  <div className="lv-empty">Tu imagen aparecerá aquí mientras dictas la idea.</div>
                </div>
                <div className="lv-copy">
                  <div className="lv-kicker">Voz → texto → imagen</div>
                  <div id="live-visual-title" className="lv-title">Empieza a hablar para visualizar la idea</div>
                  <div id="live-visual-status" className="lv-status">En local pega tu key para generar. Sin key uso un respaldo viejo que puede fallar.</div>
                </div>
              </div>
              <details className="api-settings">
                <summary>Configurar generación de imágenes</summary>
                <div className="api-row">
                  <input id="pollinations-key" className="api-input" type="password" placeholder="Pollinations API key: sk_... o pk_..." />
                  <button id="btn-save-img-api" className="chip-btn" type="button">Guardar key</button>
                </div>
                <p className="api-help">Modo local: puedes pegar tu <strong>sk_</strong> para probar. No publiques la app así; en producción esa key va en backend o variable de entorno.</p>
              </details>
              <div id="img-preview-wrap" className="img-preview-wrap hidden">
                <img id="img-preview" className="img-preview-thumb" alt="" /><button id="btn-rm-img" className="img-rm">✕</button>
              </div>
              <div id="voice-bar" className="voice-bar hidden">
                <span className="vdot"></span><span id="voice-status">Escuchando y transcribiendo…</span><button id="btn-stop-voice" className="chip-btn-sm">■ Detener</button>
              </div>
              <div className="iz-footer">
                <button id="btn-analyze" className="btn-primary"><span id="analyze-lbl">🔍 Analizar con IA</span><span id="analyze-spin" className="spin hidden"></span></button>
              </div>
            </div>

            {/* Q&A */}
            <div id="qa-zone" className="hidden"></div>

            {/* RESULTS */}
            <div id="results" className="results hidden">
              <div className="hero-section">
                <div className="hero-header"><span className="block-label">🎨 Visualización del Concepto</span><button id="btn-regen-img" className="chip-btn">🔄 Regenerar</button></div>
                <div id="hero-wrap" className="hero-wrap"><div className="hero-loading"><span className="spin"></span> Generando imagen…</div></div>
              </div>
              <div className="doc-section">
                <div className="doc-header"><span className="block-label">📄 Documento Maestro</span><span className="doc-hint">✏️ Edita libremente · Selecciona texto → menú IA</span></div>
                <div className="doc-toolbar">
                  <button className="tb-btn" data-cmd="bold"><b>B</b></button>
                  <button className="tb-btn" data-cmd="italic"><i>I</i></button>
                  <button className="tb-btn" data-cmd="underline"><u>U</u></button>
                  <span className="tb-sep"></span>
                  <button className="tb-btn" data-cmd="insertUnorderedList">≡</button>
                  <button className="tb-btn" data-cmd="formatBlock" data-val="h3">H</button>
                </div>
                <div id="master-doc" className="master-doc" contentEditable suppressContentEditableWarning></div>
                <div id="float-menu" className="float-menu hidden">
                  <button className="fm-btn" data-action="improve">✨ Mejorar</button>
                  <button className="fm-btn" data-action="expand">📖 Expandir</button>
                  <button className="fm-btn" data-action="simplify">✂️ Simplificar</button>
                  <button className="fm-btn" data-action="alternatives">💡 Alternativas</button>
                </div>
              </div>
              <div className="timeline-section">
                <div className="tl-header">
                  <span className="block-label">📸 Bitácora de Avances</span>
                  <label htmlFor="file-timeline" className="chip-btn">📷 Subir foto</label>
                  <input type="file" id="file-timeline" accept="image/*" multiple className="hidden" />
                </div>
                <div id="timeline" className="timeline">
                  <div className="tl-empty">Sube fotos de tu proceso para documentar el avance 📷</div>
                </div>
              </div>
              <div className="kanban-section">
                <div className="block-label" style={{ marginBottom: 14 }}>🗂️ Plan de Acción</div>
                <div className="kanban-board" id="kanban-board">
                  <div className="k-col" data-col="todo">
                    <div className="k-col-head todo-head">📋 Por Hacer<button className="k-add-btn" onClick={() => window.addKanbanCard("todo")}>+</button></div>
                    <div className="k-col-body" id="k-todo"></div>
                  </div>
                  <div className="k-col" data-col="doing">
                    <div className="k-col-head doing-head">⚡ En Progreso<button className="k-add-btn" onClick={() => window.addKanbanCard("doing")}>+</button></div>
                    <div className="k-col-body" id="k-doing"></div>
                  </div>
                  <div className="k-col" data-col="done">
                    <div className="k-col-head done-head">✅ Completado<button className="k-add-btn" onClick={() => window.addKanbanCard("done")}>+</button></div>
                    <div className="k-col-body" id="k-done"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* REGEN IMAGE MODAL */}
        <div id="regen-modal" className="regen-modal-backdrop hidden">
          <div className="regen-modal-card">
            <h3 className="regen-modal-title">🎨 Regenerar imagen</h3>
            <p className="regen-modal-sub">Describe mejor lo que quieres visualizar. Sé específico para mejores resultados.</p>
            <textarea id="regen-prompt-input" className="regen-modal-input" rows={4} placeholder="Ej: A modern mobile app interface showing a coffee shop, warm lighting, flat design, no text…"></textarea>
            <div className="regen-modal-actions">
              <button id="btn-regen-cancel" className="regen-btn-cancel">Cancelar</button>
              <button id="btn-regen-confirm" className="regen-btn-confirm">🎨 Generar imagen</button>
            </div>
          </div>
        </div>

        {/* CHAT */}
        <button id="chat-fab" className="chat-fab">💬</button>
        <div id="chat-panel" className="chat-panel hidden">
          <div className="cp-header"><span>💬 Asistente IA</span><button id="btn-close-chat" className="icon-btn cp-close">✕</button></div>
          <div id="chat-msgs" className="chat-msgs"><div className="bubble ai">¡Hola! Puedo editar tu documento, agregar tareas al plan, actualizar tu progreso o responder preguntas. 🚀</div></div>
          <div className="cp-footer">
            <label htmlFor="chat-file" className="icon-btn cp-attach">📎</label>
            <input type="file" id="chat-file" accept="image/*" className="hidden" />
            <textarea id="chat-input" className="cp-input" rows={1} placeholder="Escribe aquí…"></textarea>
            <button id="btn-send" className="btn-send">↑</button>
          </div>
        </div>
      </div>
    </div>
  );
}
