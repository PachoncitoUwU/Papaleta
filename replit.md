# Papaleta

AI-powered idea lab that helps users analyze, structure, and track their ideas using Groq AI and optional Firebase auth.

## Run & Operate

- `pnpm --filter @workspace/papaleta run dev` — run the Papaleta web app (port 22734)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `DATABASE_URL` — Postgres connection string (for API server)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifact: `artifacts/papaleta`)
- AI: Groq API (llama-3.3-70b-versatile + llama-4-scout-17b for vision)
- Auth: Firebase (Google OAuth) or local guest mode
- Images: Pollinations AI (free) or Pollinations API key
- DB: Firebase Firestore (cloud sync) + localStorage (offline fallback)
- API: Express 5 (separate artifact: `artifacts/api-server`)

## Where things live

- `artifacts/papaleta/src/PapaletaApp.tsx` — entire React app (monolithic component with useEffect-mounted JS)
- `artifacts/papaleta/src/papaleta.css` — all app styles (scoped to `#papaleta-root`)
- `artifacts/papaleta/public/` — logo images (papaletaarriba.png, papaletaLogok.png)
- `.migration-backup/` — original vanilla JS source files

## Architecture decisions

- The app was ported from vanilla HTML/CSS/JS to React by embedding the original logic in a `useEffect` hook, using Firebase as a dynamic import to avoid SSR issues
- All CSS is scoped to `#papaleta-root` to avoid conflicts with Replit scaffold CSS
- Dark mode is driven by `data-theme` attribute on `#papaleta-root` (not `document.documentElement`)
- Animation keyframe names are prefixed with `pp-` to avoid collisions
- Groq API key is stored in `localStorage` (`pp_groq_key`); Pollinations key in `pp_pollinations_key`
- Ideas stored in `localStorage` (`pp_ideas`) with optional sync to Firebase Firestore

## Product

- **Login**: Google OAuth via Firebase or guest mode (no account required)
- **Dashboard**: Stats (total ideas, in-progress, completed, streak), GitHub-style activity heatmap, recent ideas grid
- **Idea Workspace**: Voice transcription → live image preview → AI-powered Q&A → full document generation
- **Kanban Board**: Drag-and-drop task tracking with AI chat integration
- **Photo Timeline**: Upload progress photos with AI-generated descriptions
- **AI Chat**: Context-aware assistant that can rewrite documents, add/move tasks, set progress

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Firebase imports are dynamic (`await import("firebase/app")`) to ensure they run only on the client side
- The `window.__ld`, `window.__qn`, `window.__qs`, `window.__regen`, `window.__rmtl`, `window.addKanbanCard`, `window.showDashboard` globals are set inside `useEffect` and used by inline HTML event handlers rendered via `innerHTML`
- Always run `pnpm --filter @workspace/papaleta run dev` to start the workflow before testing

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
