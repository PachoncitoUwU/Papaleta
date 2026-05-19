import { useEffect, useState } from "react";
import "./papaleta.css";
import { DottedSurface } from "./components/ui/dotted-surface";
import { ThemeToggle } from "./components/ThemeToggle";
import { BGPattern } from "./components/bg-pattern";

declare global {
  interface Window {
    GROQ_API_KEY?: string;
    __ld: (id: string) => void;
    __qn: (i: number) => void;
    __qs: (i: number) => void;
    __regen: () => void;
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
  const [isDarkTheme, setIsDarkTheme] = useState(false);

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
          (import.meta as any).env?.VITE_GROQ_API_KEY ||
          (window as any).GROQ_API_KEY ||
          localStorage.getItem("pp_groq_key") ||
          "";
        const useGroqProxy = () => {
          if (typeof location === "undefined") return false;
          if (
            location.hostname.includes("netlify.app") ||
            location.hostname.includes("netlify.live")
          )
            return true;
          if (
            import.meta.env.DEV &&
            (location.hostname === "localhost" || location.hostname === "127.0.0.1")
          )
            return true;
          return false;
        };
        let chatHistory: { role: string; content: string }[] = [];
        const fbApp = initializeApp(FB);
        const auth = getAuth(fbApp);
        const db = getFirestore(fbApp);
        const provider = new GoogleAuthProvider();
        await setPersistence(auth, browserLocalPersistence).catch(() => {});

        async function loadUserSettings(uid: string) {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
              const data = snap.data();
              if (data.groqKey) localStorage.setItem("pp_groq_key", data.groqKey);
            }
          } catch (e) {}
        }

        async function saveUserSettings(uid: string, settings: Record<string, any>) {
          try { await setDoc(doc(db, "users", uid), settings, { merge: true }); }
          catch (e) {}
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

        const PAPALETA_AVANCE_PROMPT = `Eres el Asistente de IA de "Papaleta", un laboratorio y gestor de ideas donde los usuarios registran proyectos, avances y bitácoras. Actúa como copiloto de innovación y documentación técnica.

Cuando el usuario proporcione texto de avance, bitácora o estado del proyecto, responde SIEMPRE con esta estructura en Markdown:

### 📝 Mini-Resumen de Avance
[Resumen de máximo 2 o 3 líneas: logro principal y estado actual].

### 🎯 Estado de la Idea
* **Progreso estimado:** [0-100%]
* **Enfoque actual:** [una frase corta]

### 🚀 Próximos Pasos Sugeridos
1. [Acción inmediata]
2. [Validación o prueba]

### ⚠️ Riesgos u Obstáculos detectados
* [Riesgo o "Ninguno relevante por ahora"]

REGLAS: directo, técnico, motivador, minimalista. Sin introducciones largas. Viñetas y negritas para escaneo rápido.`;

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
          const payload = { model, messages: [{ role: "user", content }], temperature: 0.7, max_tokens: 2048 };
          let r: Response;
          if (key) {
            r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
              body: JSON.stringify(payload),
            });
          } else if (useGroqProxy()) {
            r = await fetch("/.netlify/functions/groq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          } else {
            throw new Error(
              "IA no disponible. Crea apps/web/.env.local con VITE_GROQ_API_KEY=tu_clave (https://console.groq.com). En Netlify usa GROQ_API_KEY."
            );
          }
          if (!r.ok) {
            let err = "HTTP " + r.status;
            try { err = (await r.json()).error?.message || err; } catch (e) {}
            throw new Error(err);
          }
          return (await r.json()).choices?.[0]?.message?.content || "";
        }

        async function webSearch(query: string) {
          try {
            const r = await fetch(`/.netlify/functions/web-search?q=${encodeURIComponent(query)}`);
            if (!r.ok) return "";
            const data = await r.json();
            return (data.results || []).map((x: any, i: number) => `${i + 1}. ${x.title}: ${x.text}`).join("\n");
          } catch (e) { return ""; }
        }
        function getKanbanState() {
          const g = (id: string) => [...($(id)?.querySelectorAll(".k-card") || [])].map((c) => (c.textContent || "").trim()).filter(Boolean);
          return { todo: g("k-todo"), doing: g("k-doing"), done: g("k-done") };
        }
        function normalizeRoadmap(roadmap: unknown): string[] {
          if (!Array.isArray(roadmap)) return [];
          return roadmap.map((t) => String(t || "").trim()).filter((t) => t.length > 2).slice(0, 12);
        }
        function parseMiniResumen(md: string) {
          const m = md.match(/### 📝 Mini-Resumen de Avance\s*\n+([\s\S]*?)(?=\n###|$)/i);
          return (m ? m[1] : md).trim().slice(0, 600);
        }
        function buildSummarySource(idea: any) {
          const tl = (idea.timeline || [])
            .map((e: any) => `${e.date || ""}: ${e.desc || "Avance visual"}`)
            .join("\n");
          const doc = String(idea.doc || "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 2800);
          return `Título: ${idea.title || "Idea"}\nProgreso: ${idea.progress || 0}%\nEtiqueta: ${idea.tag || ""}\n\nDocumento:\n${doc}\n\nBitácora:\n${tl || "(sin entradas aún)"}`;
        }
        async function generateAiSummary(sourceText: string) {
          const raw = await aiCall(`${PAPALETA_AVANCE_PROMPT}\n\n---\nCONTENIDO DEL PROYECTO:\n${sourceText}`);
          return { mini: parseMiniResumen(raw), full: raw };
        }
        function renderAiSummary(idea: any) {
          const sec = $("ai-summary-section");
          const view = $("ai-summary-view");
          const edit = $("ai-summary-edit") as HTMLTextAreaElement;
          if (!sec || !view || !edit) return;
          if (!idea?.doc) {
            sec.classList.add("hidden");
            return;
          }
          sec.classList.remove("hidden");
          const mini =
            idea.aiSummary ||
            "Aún no hay resumen. Pulsa «Regenerar resumen» o añade avances en la bitácora.";
          view.textContent = mini;
          view.classList.remove("hidden");
          edit.classList.add("hidden");
          edit.value = mini;
          $("btn-save-summary")?.classList.add("hidden");
        }
        async function refreshIdeaSummary(opts?: { silent?: boolean }) {
          if (!ideaId) return;
          const idea = ideas.find((i) => i.id === ideaId);
          if (!idea?.doc) return;
          const source = buildSummarySource(idea);
          if (source.length < 50) return;
          try {
            if (!opts?.silent) toast("🤖 Generando resumen de IA…", 5000);
            const { mini, full } = await generateAiSummary(source);
            await sF("aiSummary", mini);
            await sF("aiSummaryFull", full);
            ideas = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
            renderAiSummary(ideas.find((i) => i.id === ideaId));
            if (!opts?.silent) toast("✅ Resumen guardado");
          } catch (e: any) {
            if (!opts?.silent) toast("❌ " + e.message);
          }
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
          if ($("uavatar")) ($("uavatar") as HTMLImageElement).src = u.photoURL || "";
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
          const badge = $("sb-session-badge");
          if (badge) badge.textContent = u.uid === "local" ? "● Sesión local" : "● Sesión activa";
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
          grid.innerHTML = sorted
            .map((idea) => {
              const date = idea.createdAt
                ? new Date(idea.createdAt).toLocaleDateString("es", {
                    day: "numeric",
                    month: "short",
                  })
                : "Hoy";
              const pct = idea.progress || 0;
              const done = pct >= 100;
              const status = done
                ? '<span class="ic-status ic-status-done">Completada</span>'
                : pct > 0
                  ? '<span class="ic-status ic-status-progress">En progreso</span>'
                  : "";
              const hasImage = idea.imgPrompt || idea.imgUrl;
              return `<div class="idea-card${done ? " idea-card-done" : ""}" onclick="window.__ld('${idea.id}')"><div class="ic-image">${hasImage || idea.imgUrl ? `<img src="${idea.imgUrl || "https://picsum.photos/seed/" + idea.id + "/400/192"}" alt="${idea.title || "Idea"}" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML='<div class="ic-image-placeholder">💡</div>'"/>` : `<div class="ic-image-placeholder">💡</div>`}</div><div class="ic-body">${status}<div class="ic-header"><span class="ic-tag">${idea.tag || "Idea"}</span><span class="ic-progress">${pct}%</span></div><h3 class="ic-title">${idea.title || "Sin título"}</h3><div class="ic-date">${date}</div></div></div>`;
            })
            .join("");
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
            } catch (e) {}
          }
        }

        async function sF(field: string, val: any) {
          if (!ideaId) return;
          const local = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
          const ix = local.findIndex((i: any) => i.id === ideaId);
          if (ix >= 0) {
            local[ix][field] = val;
            localStorage.setItem("pp_ideas", JSON.stringify(local));
          }
          ideas = local;
          renderNav();
          logAct();
          if (db && user?.uid !== "local" && ideaId && !ideaId.startsWith("l_")) {
            try {
              await updateDoc(doc(db, "ideas", ideaId), { [field]: val });
            } catch (e) {}
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
            kanban: data.kanban || getKanbanState(),
            timeline: data.timeline || [],
            progress: typeof data.progress === "number" ? data.progress : 0,
            aiSummary: data.aiSummary || "",
            aiSummaryFull: data.aiSummaryFull || "",
            createdAt: new Date().toISOString(),
          };
          const local = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
          if (ideaId) {
            const ix = local.findIndex((i: any) => i.id === ideaId);
            if (ix >= 0) local[ix] = { ...local[ix], ...p, createdAt: local[ix].createdAt || p.createdAt };
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
            } catch (e) {}
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
            if (idea.imgPrompt) {
              lastImgPrompt = idea.imgPrompt;
              genImg(idea.imgPrompt);
            } else if ($("hero-wrap")) {
              $("hero-wrap")!.innerHTML =
                '<div class="hero-fallback hero-fallback-empty"><div class="hero-fallback-icon">✦</div><p class="hero-fallback-title">Sin visual aún</p><button type="button" class="hero-fallback-btn" onclick="window.__regen()">🎨 Generar</button></div>';
            }
            if (idea.kanban) loadKanban(idea.kanban);
            renderTL(idea.timeline || []);
            renderAiSummary(idea);
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
              `Eres un experto en diseño de producto y negocios. Vas a analizar la idea del usuario y responder ESTRICTAMENTE con un solo objeto JSON válido.
REGLAS PARA EL CAMPO "doc": DEBE estar formateado en HTML (usa etiquetas <br>, <h3>, <p>, <ul>, <li>, <strong>). PROHIBIDO usar Markdown (* o ** o #). Haz que el documento sea extenso, detallado, motivador y coherente.
Formato esperado:
{"title":"Título llamativo","tag":"App|Negocio|Proyecto|Otro","doc":"<h3>🎯 Qué es</h3><p>...</p><h3>💡 Solución</h3><p>...</p><h3>🛠️ Materiales</h3><ul><li>...</li></ul><h3>📋 Pasos</h3><ol><li>...</li></ol><h3>💰 Monetización</h3><p>...</p><h3>⚠️ Riesgos</h3><ul><li>...</li></ul>","imgPrompt":"English prompt for photorealistic product mockup","roadmap":["Tarea 1","Tarea 2","Tarea 3","Tarea 4","Tarea 5"]}
IDEA DEL USUARIO: ${text}${ctx}`,
              img
            );
            const d = JSON.parse(raw.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/)![0]);
            if ($("idea-title")) $("idea-title")!.textContent = d.title || "Idea";
            if ($("idea-tag")) $("idea-tag")!.textContent = d.tag || "Idea";
            if ($("master-doc")) $("master-doc")!.innerHTML = d.doc || "";
            ["k-todo", "k-doing", "k-done"].forEach((id) => { const el = $(id); if (el) el.innerHTML = ""; });
            let tasks = normalizeRoadmap(d.roadmap); if (!tasks.length) tasks = ["Definir objetivo","Investigar mercado","Crear prototipo","Probar con usuarios","Iterar"]; tasks.forEach((t: string) => makeCard(t, "k-todo"));
            lastImgPrompt = d.imgPrompt || d.title;
            genImg(lastImgPrompt);
            d.rawText = text;
            await saveNew({ ...d, kanban: getKanbanState() });
            logAct();
            toast("✅ ¡Idea analizada!");
            refreshIdeaSummary({ silent: true });
          } catch (e: any) {
            const d = buildFreeIdea(text, ans);
            if ($("idea-title")) $("idea-title")!.textContent = d.title;
            if ($("idea-tag")) $("idea-tag")!.textContent = d.tag;
            if ($("master-doc")) $("master-doc")!.innerHTML = d.doc;
            ["k-todo", "k-doing", "k-done"].forEach((id) => { const el = $(id); if (el) el.innerHTML = ""; });
            normalizeRoadmap(d.roadmap).forEach((t: string) => makeCard(t, "k-todo"));
            lastImgPrompt = d.imgPrompt;
            genImg(lastImgPrompt);
            d.rawText = text;
            await saveNew({ ...d, kanban: getKanbanState() });
            logAct();
            toast("✅ Idea creada en modo gratis local");
            refreshIdeaSummary({ silent: true });
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

        function buildVisualPrompt(text: string) {
          const keywords = extractKeywords(text);
          return `High quality realistic concept image, useful prototype visualization, ${keywords}, clean composition, natural light, detailed, no text, no watermark`;
        }

        function extractKeywords(text: string) {
          const dict: Record<string, string> = {
            antena: "antenna", casera: "homemade", celular: "cellular", móvil: "mobile",
            cafetería: "coffee", moderna: "modern", acogedor: "cozy", ambiente: "atmosphere",
            mochila: "backpack", ecológica: "ecological", reciclado: "recycled", materiales: "materials",
            proyecto: "project", negocio: "business", app: "app", aplicación: "application",
            tecnología: "technology", prototipo: "prototype", diseño: "design", producto: "product",
            idea: "idea", innovación: "innovation", startup: "startup", emprendimiento: "entrepreneurship",
          };
          const words = text.toLowerCase().replace(/[^\wáéíóúñü\s]/g, "").split(/\s+/).filter((w) => w.length > 3).slice(0, 6);
          const translated = words.map((w) => dict[w] || w);
          const category = detectCategory(text);
          if (category) translated.unshift(category);
          return translated.join(",");
        }

        function detectCategory(text: string) {
          const lower = text.toLowerCase();
          if (/tecnolog|electr|circuit|arduino|raspberry|sensor|iot/i.test(lower)) return "technology";
          if (/negocio|empresa|startup|comercio|tienda|venta/i.test(lower)) return "business";
          if (/app|aplicaci|software|web|móvil|digital/i.test(lower)) return "application";
          if (/diseño|arte|gráfico|visual|creativ/i.test(lower)) return "design";
          if (/product|manufactur|fabricaci|construcci/i.test(lower)) return "product";
          return "";
        }

        function pollinationsPublicUrl(prompt: string, width: number, height: number) {
          const seed = Math.floor(Math.random() * 9999999);
          const enc = encodeURIComponent(prompt.slice(0, 300));
          return `https://image.pollinations.ai/prompt/${enc}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
        }

        function pollinationsLegacyUrl(prompt: string, width: number, height: number) {
          const enc = encodeURIComponent(prompt.slice(0, 300));
          return `https://image.pollinations.ai/prompt/${enc}?width=${width}&height=${height}&nologo=true&model=turbo`;
        }

        function loadImageUrlWithTimeout(url: string, ms: number) {
          return new Promise<string>((resolve, reject) => {
            const img = new Image();
            let finished = false;
            const timeout = setTimeout(() => { if (finished) return; finished = true; reject(new Error("timeout")); }, ms);
            img.onload = () => { if (finished) return; finished = true; clearTimeout(timeout); resolve(url); };
            img.onerror = () => { if (finished) return; finished = true; clearTimeout(timeout); reject(new Error("No se pudo cargar la imagen")); };
            img.src = url;
          });
        }

        function friendlyImageError(err: any) {
          const msg = err?.message || String(err || "");
          if (/401|invalid|unauthorized/i.test(msg)) return "La key de Pollinations no es válida.";
          if (/402|balance|payment/i.test(msg)) return "La key no tiene saldo disponible.";
          if (/timeout/i.test(msg)) return "El generador tardó demasiado. Puedes reintentar.";
          return "No se pudo generar la imagen.";
        }

        async function loadGeneratedImage(prompt: string, onload: (src: string) => void, onerror: (err: string) => void, width = 1024, height = 576) {
          const key = getImageApiKey();
          try {
            // Intentar con URL pública flux primero (120s timeout)
            const src = await loadImageUrlWithTimeout(pollinationsPublicUrl(prompt, width, height), 120000);
            onload(src);
          } catch (e) {
            try {
              // Fallback a modelo turbo (60s timeout)
              const src = await loadImageUrlWithTimeout(pollinationsLegacyUrl(prompt, width, height), 60000);
              onload(src);
            } catch (e2) {
              onerror(friendlyImageError(e2 || e));
            }
          }
        }

        function showHeroImg(w: HTMLElement, src: string) {
          const img = document.createElement("img");
          img.className = "hero-img";
          img.src = src;
          w.innerHTML = "";
          w.appendChild(img);
          if (ideaId) sF("imgUrl", src);
        }

        function showMinimalPlaceholder(w: HTMLElement, _prompt = "", error = "") {
          w.innerHTML = `<div class="hero-fallback"><div class="hero-fallback-icon">✦</div><p class="hero-fallback-title">Visual en preparación</p><p class="hero-fallback-msg">${escapeHTML(error || "El generador tardó. Puedes reintentar.")}</p><button type="button" class="hero-fallback-btn" onclick="window.__regen()">🔄 Reintentar</button></div>`;
        }

        function genImg(prompt: string) {
          const w = $("hero-wrap");
          if (!w) return;
          const visualPrompt = buildVisualPrompt(prompt);
          w.innerHTML = '<div class="hero-loading"><span class="spin"></span> Generando imagen…<br><small style="font-size:11px;opacity:0.7;margin-top:8px;display:block;">Puede tardar 20-45 segundos</small></div>';
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
              (src) => { preview.innerHTML = `<img src="${src}" alt="Visualización">`;  if (status) status.textContent = "Imagen generada. Sigue dictando para actualizar."; },
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
              } catch (e) {}
              tl.push({ data: ev.target!.result, date: new Date().toLocaleDateString("es", { day: "numeric", month: "short" }), desc });
              sF("timeline", tl);
              renderTL(tl);
              ideas = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
              toast("📸 ¡Foto agregada con descripción de IA!");
              refreshIdeaSummary({ silent: true });
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
          
          const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
          const firstDayOfWeek = firstDayOfMonth.getDay(); 
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          
          const dayNames = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
          
          let html = `<div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="font-size:14px; font-weight:600; text-transform:capitalize;">${monthName}, ${currentYear}</div>
            <div style="font-size:11px; color:var(--text3); display:flex; align-items:center; gap:6px;">
               <div style="width:8px;height:8px;border-radius:4px;background:var(--primary);"></div> Días activos
            </div>
          </div>`;
          
          html += `<div style="display:grid; grid-template-columns: repeat(7, 1fr); gap: 6px; text-align: center; max-width: 400px; margin: 0 auto;">`;
          
          // Header
          dayNames.forEach(day => {
            html += `<div style="font-size: 10px; font-weight: 600; color: var(--text3); margin-bottom: 4px;">${day}</div>`;
          });
          
          // Empty days at start
          for(let i = 0; i < firstDayOfWeek; i++) {
            html += `<div></div>`;
          }
          
          // Days
          for(let d = 1; d <= daysInMonth; d++) {
            const date = new Date(currentYear, currentMonth, d);
            const k = date.toISOString().slice(0, 10);
            const c = h[k] || 0;
            const isToday = date.toDateString() === now.toDateString();
            
            let bg = "transparent";
            let color = "var(--text2)";
            let border = "1px solid var(--border)";
            let shadow = "none";
            
            if (c > 0) {
              const intensity = Math.min(1, 0.4 + (c * 0.15));
              bg = `color-mix(in srgb, var(--primary) ${Math.round(intensity*100)}%, transparent)`;
              color = "white";
              border = "none";
              if (c > 3) shadow = "0 2px 8px rgba(99, 102, 241, 0.3)";
            }
            
            if (isToday) border = "2px solid var(--primary)";
            
            const clickHandler = `
              const dStr = '${date.toLocaleDateString("es", {day:"numeric", month:"long", year:"numeric"})}';
              const idz = JSON.parse(localStorage.getItem('pp_ideas') || '[]');
              const acts = idz.filter(i => new Date(i.updatedAt).toDateString() === '${date.toDateString()}');
              
              const container = document.getElementById('day-activity-content');
              if (!container) return;
              
              if (acts.length > 0) {
                let html = '<div style="width:100%; text-align:left; overflow-y:auto; max-height:200px; padding-right:8px;">';
                html += '<h4 style="font-size:13px; color:var(--text3); margin-bottom:12px; font-weight:600; text-transform:uppercase;">' + dStr + '</h4>';
                html += '<div style="display:flex; flex-direction:column; gap:8px;">';
                acts.forEach(a => {
                  html += '<div style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg2); border-radius:8px; border:1px solid var(--border); cursor:pointer;" onclick="window.__loadIdea(\\'' + a.id + '\\')">';
                  if (a.heroImg) {
                    html += '<img src="' + a.heroImg + '" style="width:40px; height:40px; border-radius:6px; object-fit:cover;" />';
                  } else {
                    html += '<div style="width:40px; height:40px; border-radius:6px; background:var(--primary-l); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px;">' + (a.title ? a.title.charAt(0).toUpperCase() : 'I') + '</div>';
                  }
                  html += '<div style="flex:1; min-width:0; text-align:left;">';
                  html += '<div style="font-size:14px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (a.title || 'Idea') + '</div>';
                  html += '<div style="font-size:12px; color:var(--text3); margin-top:2px;">' + (a.tag || 'Idea') + ' • ' + (a.progress || 0) + '% completado</div>';
                  html += '</div></div>';
                });
                html += '</div></div>';
                container.innerHTML = html;
              } else if (${c} > 0) {
                container.innerHTML = '<div style="font-size:32px; margin-bottom:16px; opacity:0.8;">👻</div><p style="font-size:15px; font-weight:500; color:var(--text);">Registraste ' + ${c} + ' acciones el ' + dStr + ', pero no hubo modificaciones en ideas.</p>';
              } else {
                container.innerHTML = '<div style="font-size:32px; margin-bottom:16px; opacity:0.5; filter:grayscale(1);">💤</div><p style="font-size:15px; font-weight:500; color:var(--text3);">No hay actividad registrada para el ' + dStr + '.</p>';
              }
            `.replace(/\n/g, "").replace(/\s+/g, " ");

            html += `<div style="
              aspect-ratio: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 500;
              background: ${bg};
              color: ${color};
              border: ${border};
              box-shadow: ${shadow};
              cursor: pointer;
              transition: transform 0.2s;
            " title="${c} acciones" onclick="${clickHandler}" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              ${d}
            </div>`;
          }
          
          html += `</div>`;
          hm.innerHTML = html;
          
          const ml = document.querySelectorAll(".dhc-months, .dhc-days, .dhc-range, .dhc-legend");
          ml.forEach(el => (el as HTMLElement).style.display = "none");
        }


        // DARK MODE
        function toggleDarkMode() {
          const root = $("papaleta-root");
          if (!root) return;
          const isDark = root.getAttribute("data-theme") === "dark";
          const newTheme = isDark ? "light" : "dark";
          root.setAttribute("data-theme", newTheme);
          localStorage.setItem("pp_theme", newTheme);
          setIsDarkTheme(newTheme === "dark");
          toast(isDark ? "Modo claro activado" : "Modo oscuro activado");
        }
        (window as any).__toggleDarkMode = toggleDarkMode;

        function loadDarkMode() {
          const savedTheme = localStorage.getItem("pp_theme") || "light";
          const root = $("papaleta-root");
          if (root) root.setAttribute("data-theme", savedTheme);
          setIsDarkTheme(savedTheme === "dark");
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
          if (active) { try { active.stop(); } catch (e) {} }
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
          chatHistory = [];
          const msgs = $("chat-msgs");
          if (msgs) msgs.innerHTML = '<div class="bubble ai">Puedo editar el documento, agregar tareas, buscar en internet, generar imágenes o responder preguntas. 🚀</div>';
        };

        async function sendChat() {
          const input = $("chat-input") as HTMLTextAreaElement;
          const msg = input?.value.trim();
          if (!msg) return;
          input.value = "";
          addBubble("user", msg);
          chatHistory.push({ role: "user", content: msg });
          const docTxt = $("master-doc")?.innerText?.slice(0, 800) || "";
          const idea = ideas.find((i) => i.id === ideaId);
          const kb = `Todo:${[...($("k-todo")?.querySelectorAll(".k-card") || [])].map((c) => c.textContent).join(",")}|Doing:${[...($("k-doing")?.querySelectorAll(".k-card") || [])].map((c) => c.textContent).join(",")}|Done:${[...($("k-done")?.querySelectorAll(".k-card") || [])].map((c) => c.textContent).join(",")}`;
          const hist = chatHistory.slice(-8).map((m) => `${m.role}: ${m.content}`).join("\n");
          const wantsSearch = /\b(busca|investiga|internet|actualidad|noticias|mercado|competencia)\b/i.test(msg);
          let webCtx = "";
          if (wantsSearch) {
            addBubble("ai", "🔍 Buscando información en internet…");
            webCtx = await webSearch(`${idea?.title || ""} ${msg}`.slice(0, 120));
          }
          const wantsImage = /\b(imagen|visualiza|dibuja|genera.*img|mockup|ilustraci)\b/i.test(msg);
          const wantsAvance =
            /\b(resumen|avance|bit[aá]cora|analiza|estado del proyecto|pr[oó]ximos pasos)\b/i.test(msg);
          if (wantsAvance && idea?.doc) {
            try {
              const source = buildSummarySource(idea) + `\n\nPregunta del usuario: ${msg}`;
              const raw = await aiCall(`${PAPALETA_AVANCE_PROMPT}\n\n---\n${source}`);
              addBubble("ai", raw.replace(/\n/g, "<br>"));
              chatHistory.push({ role: "assistant", content: raw.slice(0, 500) });
              const mini = parseMiniResumen(raw);
              if (mini.length > 20) {
                await sF("aiSummary", mini);
                await sF("aiSummaryFull", raw);
                ideas = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
                renderAiSummary(ideas.find((i) => i.id === ideaId));
              }
              return;
            } catch (e: any) {
              addBubble("ai", "❌ " + e.message);
              return;
            }
          }
          try {
            const raw = await aiCall(
              `Asistente Papaleta. Idea:"${idea?.title}". Progreso:${idea?.progress || 0}%.\nDoc:"${docTxt}"\nKanban:${kb}\n${webCtx ? "Web:\\n" + webCtx + "\\n" : ""}Historial:\\n${hist}\nUsuario:"${msg}"\nResponde SOLO JSON con UNA acción. IMPORTANTE: Cuando uses "rewrite", el campo "doc" DEBE ser HTML puro (<h3>, <p>, <ul>), nunca uses Markdown.\n{"action":"rewrite","doc":"<h3>...</h3><p>HTML</p>","response":"qué cambié"}\n{"action":"add_task","task":"texto","column":"todo|doing|done","response":"qué agregué"}\n{"action":"add_multiple_tasks","tasks":["t1","t2"],"response":"qué agregué"}\n{"action":"move_task","task":"nombre","to":"todo|doing|done","response":"qué moví"}\n{"action":"complete_task","task":"nombre","response":"qué completé"}\n{"action":"set_progress","value":50,"response":"razón"}\n{"action":"generate_image","prompt":"English visual prompt","response":"generando imagen"}\n{"action":"web_search","query":"términos","response":"buscaré"}\n{"action":"chat","response":"respuesta"}\nEspañol. Estrictamente JSON.`
            );
            let p: any;
            try { p = JSON.parse(raw.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/)![0]); }
            catch { p = { action: "chat", response: raw }; }
            addBubble("ai", p.response || "✅");
            chatHistory.push({ role: "assistant", content: p.response || "" });
            if (p.action === "web_search" && p.query) {
              const extra = await webSearch(p.query);
              if (extra) addBubble("ai", "📎 Resultados:\n" + extra.slice(0, 1200));
            }
            if ((p.action === "generate_image" && p.prompt) || (wantsImage && !p.action)) {
              const prompt = p.prompt || buildVisualPrompt(msg);
              lastImgPrompt = prompt;
              sF("imgPrompt", prompt);
              genImg(prompt);
              toast("🎨 Generando imagen…");
            }
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
          console.log("🔧 Iniciando sesión local...");
          user = { uid: "local", displayName: "Creador Local", photoURL: "" };
          console.log("👤 Usuario creado:", user);
          $("login")?.classList.add("hidden");
          $("app")?.classList.remove("hidden");
          console.log("🎨 UI actualizada");
          updateUserProfile(user);
          await loadIdeas();
          renderNav();
          showDashboard();
          wire();
          toast("Modo local gratis activado");
          console.log("✅ Sesión local iniciada correctamente");
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

          const pollinationsKey = $("pollinations-key") as HTMLInputElement;
          const btnSaveImgApi = $("btn-save-img-api");
          if (pollinationsKey) pollinationsKey.value = localStorage.getItem(IMG_API_KEY_STORAGE) || "";
          if (btnSaveImgApi) btnSaveImgApi.onclick = () => {
            const key = pollinationsKey?.value.trim();
            if (key) localStorage.setItem(IMG_API_KEY_STORAGE, key);
            else localStorage.removeItem(IMG_API_KEY_STORAGE);
            toast("Key guardada");
          };

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

          const btnEditSummary = $("btn-edit-summary");
          const btnSaveSummary = $("btn-save-summary");
          const btnRegenSummary = $("btn-regen-summary");
          const summaryView = $("ai-summary-view");
          const summaryEdit = $("ai-summary-edit") as HTMLTextAreaElement;
          if (btnEditSummary) btnEditSummary.onclick = () => {
            summaryView?.classList.add("hidden");
            summaryEdit?.classList.remove("hidden");
            btnSaveSummary?.classList.remove("hidden");
            if (summaryEdit) summaryEdit.value = summaryView?.textContent || "";
          };
          if (btnSaveSummary) btnSaveSummary.onclick = async () => {
            const v = summaryEdit?.value.trim() || "";
            await sF("aiSummary", v);
            ideas = JSON.parse(localStorage.getItem("pp_ideas") || "[]");
            renderAiSummary(ideas.find((i) => i.id === ideaId));
            toast("✅ Resumen guardado");
          };
          if (btnRegenSummary) btnRegenSummary.onclick = () => refreshIdeaSummary();
        }

        // AUTH
        onAuthStateChanged(auth, async (u) => {
          $("login")?.classList.remove("auth-checking");
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
          } else {
            if (localMode || localStorage.getItem("pp_local_mode") === "1") {
              localMode = true;
              await startLocalSession();
              return;
            }
            $("login")?.classList.remove("hidden");
            $("app")?.classList.add("hidden");
          }
        });

        // Setup login buttons - wait for DOM to be ready
        const setupLoginButtons = () => {
          const btnLogin = $("btn-login");
          const btnLocal = $("btn-local");
          
          console.log("🔍 Buscando botones...");
          console.log("btnLogin:", btnLogin);
          console.log("btnLocal:", btnLocal);
          
          if (btnLogin) {
            console.log("✅ Botón Google encontrado");
            btnLogin.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("🚀 Click en botón Google");
              signInWithPopup(auth, provider).catch((e) => toast("Error: " + e.message));
            };
          } else {
            console.log("❌ Botón Google NO encontrado");
          }
          
          if (btnLocal) {
            console.log("✅ Botón Local encontrado");
            btnLocal.onclick = async (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("🚀 Click en botón local");
              localMode = true;
              localStorage.setItem("pp_local_mode", "1");
              await startLocalSession();
            };
          } else {
            console.log("❌ Botón Local NO encontrado");
          }
        };

        // Try multiple times to setup buttons
        setTimeout(setupLoginButtons, 0);
        setTimeout(setupLoginButtons, 100);
        setTimeout(setupLoginButtons, 500);
        setTimeout(setupLoginButtons, 1000);

        // Expose functions globally for direct button access
        (window as any).__startLocalSession = async () => {
          console.log("🌍 Global startLocalSession llamado");
          localMode = true;
          localStorage.setItem("pp_local_mode", "1");
          await startLocalSession();
        };

        (window as any).__startGoogleLogin = () => {
          console.log("🌍 Global startGoogleLogin llamado");
          signInWithPopup(auth, provider).catch((e) => toast("Error: " + e.message));
        };

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
      {/* SVG Defs for gradient */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves={1} seed={17} result="turbulence" />
            <feComponentTransfer in="turbulence" result="mapped">
              <feFuncR type="gamma" amplitude={1} exponent={10} offset={0.5} />
              <feFuncG type="gamma" amplitude={0} exponent={1} offset={0} />
              <feFuncB type="gamma" amplitude={0} exponent={1} offset={0.5} />
            </feComponentTransfer>
            <feGaussianBlur in="turbulence" stdDeviation={3} result="softMap" />
            <feSpecularLighting in="softMap" surfaceScale={5} specularConstant={1} specularExponent={100} lightingColor="white" result="specLight">
              <fePointLight x={-200} y={-200} z={300} />
            </feSpecularLighting>
            <feComposite in="specLight" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="litImage" />
            <feDisplacementMap in="SourceGraphic" in2="softMap" scale={200} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* LOGIN */}
      <div id="login" className="login-screen auth-checking">
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <DottedSurface />
        </div>
        <div className="login-layout">
          <div className="login-panel login-panel-brand">
            <img src="/papaletaarriba.png" alt="Papaleta" className="lc-logo-img" />
            <h1 className="lc-title">Papaleta</h1>
            <p className="lc-sub">Tu laboratorio de ideas con IA</p>
            <div className="lc-features">
              <div className="lcf">🔍 Analiza con preguntas inteligentes</div>
              <div className="lcf">✨ Potencia y estructura con IA</div>
              <div className="lcf">🗂️ Kanban interactivo</div>
              <div className="lcf">📸 Bitácora visual de avances</div>
            </div>
          </div>
          <div className="login-card glass login-panel-auth">
            <h2 className="lc-auth-title">Comienza ahora</h2>
            <p className="lc-session-hint">Empieza a crear ideas en segundos</p>
            <button 
              id="btn-local" 
              className="btn-local" 
              style={{ fontSize: '16px', padding: '16px' }}
              onClick={(e) => {
                e.preventDefault();
                console.log("⚡ React onClick - botón local");
                if ((window as any).__startLocalSession) {
                  (window as any).__startLocalSession();
                } else {
                  console.error("❌ __startLocalSession no está disponible");
                }
              }}
            >
              🚀 Entrar gratis sin cuenta
            </button>
            <p className="lc-note" style={{ marginTop: '12px', marginBottom: '16px' }}>Gratis · Sin registro · Datos privados</p>
            <div style={{ margin: "16px 0", textAlign: "center", color: "rgba(245,245,247,0.3)", fontSize: "11px", display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(245,245,247,0.1)' }}></div>
              <span>o si prefieres</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(245,245,247,0.1)' }}></div>
            </div>
            <button 
              id="btn-login" 
              className="btn-google" 
              style={{ opacity: 0.7 }}
              onClick={(e) => {
                e.preventDefault();
                console.log("⚡ React onClick - botón Google");
                if ((window as any).__startGoogleLogin) {
                  (window as any).__startGoogleLogin();
                } else {
                  console.error("❌ __startGoogleLogin no está disponible");
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09a6.97 6.97 0 010-4.18V7.07H2.18A11 11 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </button>
            <p className="lc-note" style={{ fontSize: '10px', opacity: 0.5, marginTop: '8px' }}>
              (El login con Google puede tener problemas de CORS en desarrollo)
            </p>
          </div>
        </div>
      </div>

      {/* APP */}
      <div id="app" className="app hidden">
        {/* MOBILE TOPBAR */}
        <div className="mobile-topbar">
          <button id="btn-hamburger" className="icon-btn">☰</button>
          <span className="mt-logo">
            <img src="/papaletaLogok.png" alt="Papaleta" className="mt-logo-img" /> Papaleta
          </span>
          <button className="icon-btn" onClick={() => document.getElementById("btn-new")?.click()}>+</button>
        </div>

        {/* SIDEBAR */}
        <div id="sb-overlay" className="sb-overlay hidden"></div>
        <aside id="sidebar" className="sidebar">
          <div className="sb-header">
            <a href="#" onClick={(e) => { e.preventDefault(); window.showDashboard?.(); }} className="sb-logo-link">
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
            <img id="uavatar" className="u-avatar" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" />
            <span id="uname" className="u-name">—</span>
            <button id="btn-logout" className="chip-btn" title="Cerrar sesión" style={{ padding: '6px 12px', fontSize: '12px', marginLeft: 'auto' }}>Salir</button>
          </div>
        </aside>

        {/* MAIN */}
        <main id="main" className="main">
          {/* DASHBOARD */}
          <div id="dashboard" className="dashboard">
            <div className="dash-profile-header">
              <div id="user-profile-pic" className="user-profile-pic">
                <div className="profile-initials">U</div>
              </div>
              <div>
                <h1 id="user-greeting" className="user-greeting">Hola Usuario, ¿qué ideas tienes hoy?</h1>
                <p style={{ fontSize: 15, color: "var(--text2)", marginTop: 4 }}>Tu Laboratorio de Ideas</p>
              </div>
            </div>
            <div className="dash-stats-grid">
              <div className="stat-card"><div className="stat-icon">💡</div><div className="stat-value" id="stat-total">0</div><div className="stat-label">Ideas Creadas</div></div>
              <div className="stat-card"><div className="stat-icon">⚡</div><div className="stat-value" id="stat-progress">0</div><div className="stat-label">En Progreso</div></div>
              <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-value" id="stat-completed">0</div><div className="stat-label">Completadas</div></div>
              <div className="stat-card"><div className="stat-icon">🔥</div><div className="stat-value" id="stat-streak">0</div><div className="stat-label">Días Seguidos</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <div className="dash-heatmap-card" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="dhc-header" style={{ marginBottom: '0' }}>
                  <div className="dhc-title"><span className="dhc-icon">📅</span><span>Tu Actividad</span></div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
                  <div id="heatmap" className="dhc-heatmap-new" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div className="dash-heatmap-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="dhc-header" style={{ marginBottom: '0', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                  <div className="dhc-title"><span className="dhc-icon">⚡</span><span>Detalle del Día</span></div>
                </div>
                <div id="day-activity-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', color: 'var(--text3)', textAlign: 'center' }}>
                  <div style={{ fontSize: '42px', marginBottom: '16px', opacity: 0.5, filter: 'grayscale(1)' }}>👆</div>
                  <p style={{ fontSize: '15px', lineHeight: 1.5, fontWeight: 500 }}>Selecciona un día en el calendario<br/>para ver en qué ideas trabajaste.</p>
                </div>
              </div>
            </div>
            <div className="dash-ideas-section">
              <div className="dis-header">
                <h2 className="dis-title">💡 Ideas Potenciadas</h2>
                <span id="dis-count" className="dis-count">0 ideas</span>
              </div>
              <div id="ideas-grid" className="ideas-grid">
                <div className="ideas-empty">
                  <div className="ie-icon">✨</div>
                  <p className="ie-text">Aún no has creado ninguna idea.<br />¡Empieza ahora y potencia tus proyectos con IA!</p>
                  <button className="btn-primary" onClick={() => document.getElementById("btn-new")?.click()}><span>+</span> Crear Primera Idea</button>
                </div>
              </div>
            </div>
            <div className="dash-cta">
              <button className="btn-primary btn-large" onClick={() => document.getElementById("btn-new")?.click()}><span>✨</span> Crear Nueva Idea</button>
            </div>
          </div>

          {/* WORKSPACE */}
          <div id="workspace" className="workspace hidden relative">
            <BGPattern variant="grid" mask="fade-edges" />
            <div className="idea-header-card relative z-10">
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
              <div id="ai-summary-section" className="ai-summary-section glass-panel hidden">
                <div className="ai-summary-header">
                  <span className="block-label">💡 Resumen de IA</span>
                  <div className="ai-summary-actions">
                    <button type="button" id="btn-regen-summary" className="chip-btn">↻ Regenerar</button>
                    <button type="button" id="btn-edit-summary" className="chip-btn">✏️ Editar</button>
                  </div>
                </div>
                <div id="ai-summary-view" className="ai-summary-view"></div>
                <textarea id="ai-summary-edit" className="ai-summary-edit hidden" rows={4} placeholder="Edita el resumen generado por IA…" />
                <button type="button" id="btn-save-summary" className="btn-primary ai-summary-save hidden">Guardar resumen</button>
              </div>
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
