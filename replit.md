# Papaleta

Laboratorio de ideas con IA — escribe una idea, la IA te hace preguntas, genera una imagen visual y un documento estructurado completo. Todo gratis.

## Cómo ejecutarlo

```bash
# Iniciar la app web
pnpm --filter @workspace/papaleta run dev
```

La app queda disponible en el panel de Preview a la derecha.

## Lo único que necesitas para que funcione

### Groq API Key (GRATIS, 2 minutos)
1. Entra a **https://console.groq.com/keys**
2. Crea cuenta con Google (gratis)
3. Clic en **"Create API Key"**
4. Copia la key (empieza con `gsk_...`)
5. Pégala en la app en el campo de login y dale "Guardar"

Eso es todo. Sin tarjeta. Sin pagar nada.

### Pollinations (imágenes — ya es gratis sin key)
Las imágenes se generan automáticamente sin ninguna key. Si quieres imágenes de mayor calidad y velocidad, puedes agregar una key de Pollinations en la sección de configuración dentro del workspace — pero no es obligatorio.

## Qué hace la app

1. **Entras** con Google o sin cuenta (modo local)
2. **Escribes tu idea** — puede ser cualquier cosa (negocio, app, proyecto, invento)
3. **La IA te hace 4-5 preguntas** para entenderla mejor (puedes omitirlas)
4. **Genera automáticamente:**
   - Una imagen visual de tu idea
   - Un documento estructurado (qué es, pasos, materiales, riesgos)
   - Un tablero Kanban con las tareas del roadmap
5. **Chat con IA** — puedes decirle "agrega una tarea", "reescribe la sección de monetización", "ponme al 60% de progreso"
6. **Bitácora de fotos** — sube fotos de tu avance y la IA las describe automáticamente

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/papaleta/`)
- IA texto: Groq API (llama-3.3-70b-versatile) — GRATIS con cuenta
- IA imágenes: Pollinations AI (flux) — completamente gratis
- Auth: Firebase (Google OAuth) o modo local sin cuenta
- DB: Firebase Firestore (si usas Google) + localStorage (modo local)

## Donde vive el código

- `artifacts/papaleta/src/PapaletaApp.tsx` — toda la lógica React
- `artifacts/papaleta/src/papaleta.css` — todos los estilos
- `artifacts/papaleta/public/` — imágenes del logo

## Diseño

Estilo Apple/Google — minimalista, limpio, profesional.
- Modo claro: fondo blanco puro, texto negro, acento índigo (#6366f1)
- Modo oscuro: fondo negro puro, texto blanco, acento naranja (#ff6a3d)
- Toggle de modo claro/oscuro en la barra lateral (ícono sol/luna)

## User preferences

- Diseño minimalista y limpio, estilo Apple/Google
- Modo claro (blanco) y oscuro (negro) puros
- Todo gratis — sin servicios de pago
- Idioma: español
