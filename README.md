# 🎨 Papaleta

**Tu laboratorio de ideas con IA** — Captura, analiza y potencia tus proyectos con inteligencia artificial.

Monorepo con tres aplicaciones: web (React + Vite), móvil (Expo / React Native) y API backend (Express).

---

## 📦 Estructura del proyecto

```
papaleta/
├── apps/
│   ├── web/          # App web — React + Vite + Tailwind
│   ├── mobile/       # App móvil — Expo / React Native
│   └── api/          # Backend — Express 5 + TypeScript
├── lib/
│   ├── db/           # Drizzle ORM (PostgreSQL)
│   ├── api-zod/      # Esquemas Zod compartidos
│   ├── api-spec/     # Especificación de la API
│   └── api-client-react/  # Cliente React Query
└── package.json      # Workspace raíz (pnpm)
```

---

## ✨ Características

- 🤖 **Análisis con IA** — Groq API (Llama 3.3 70B) analiza y hace preguntas sobre tu idea
- 🖼️ **Imágenes automáticas** — Pollinations AI genera una imagen por cada idea
- 🔐 **Autenticación** — Firebase Auth con Google OAuth o modo invitado anónimo
- ☁️ **Sincronización** — Firestore para usuarios registrados, AsyncStorage/localStorage para invitados
- 📱 **Multiplataforma** — Web y móvil (iOS / Android) desde el mismo código base
- 🌙 **Modo oscuro** — Interfaz Liquid Glass adaptable

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|-----------|
| Web frontend | React 19, Vite, TypeScript, Tailwind CSS, Radix UI |
| Mobile | Expo 54, React Native 0.81, Expo Router |
| Backend | Express 5, TypeScript, Pino |
| Base de datos | Firebase Firestore + Drizzle ORM (PostgreSQL) |
| IA texto | Groq API — `llama-3.3-70b-versatile` |
| IA imágenes | Pollinations AI — modelo Flux |
| Auth | Firebase Auth (Google + anónimo) |
| Monorepo | pnpm workspaces |

---

## ⚙️ Requisitos previos

- **Node.js** 20 o superior
- **pnpm** 9.6 o superior — `npm install -g pnpm`
- **Groq API key** gratuita — [console.groq.com/keys](https://console.groq.com/keys)
- (Opcional) **Google OAuth Client ID** para login con Google en móvil

---

## 🚀 Ejecución paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/PachoncitoUwU/Papaleta.git
cd Papaleta
```

### 2. Instalar dependencias

```bash
pnpm install
```

> Esto instala las dependencias de todos los workspaces (`apps/web`, `apps/mobile`, `apps/api` y `lib/`).

### 3. Configurar variables de entorno

#### App web (`apps/web`)

Crea el archivo `apps/web/.env.local`:

```env
# Groq API key para IA
VITE_GROQ_API_KEY=gsk_tu_key_aqui

# Opcional: clave Pollinations para imágenes (si falla el generador público)
# VITE_POLLINATIONS_API_KEY=
```

#### App móvil (`apps/mobile`)

Crea el archivo `apps/mobile/.env`:

```env
# Groq API key — se guarda también desde la pantalla de Perfil en la app
EXPO_PUBLIC_GROQ_API_KEY=gsk_tu_key_aqui

# Google OAuth (opcional — necesario para login con Google)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=tu_client_id.apps.googleusercontent.com
```

#### API backend (`apps/api`)

La API solo necesita la variable `PORT` (ya configurada por defecto en los scripts).

---

### 4. Ejecutar cada aplicación

#### 🌐 App Web

```bash
pnpm --filter @workspace/web run dev
```

Abre: [http://localhost:5173](http://localhost:5173)  
(o el puerto definido en la variable `PORT`)

#### 📱 App Móvil

```bash
pnpm --filter @workspace/mobile run dev
```

Esto inicia el servidor de Expo en el puerto **8099**.  
Escanea el QR con la app **Expo Go** en tu teléfono, o presiona:
- `w` para abrir en el navegador
- `a` para abrir en emulador Android
- `i` para abrir en simulador iOS (solo macOS)

> **Nota:** La Groq API key también se puede ingresar directamente desde la pantalla de **Perfil** dentro de la app, sin necesidad de archivo `.env`.

#### 🔌 API Backend

```bash
pnpm --filter @workspace/api run dev
```

Servidor disponible en: [http://localhost:8081](http://localhost:8081)  
Health check: `GET http://localhost:8081/api/healthz` → `{ "status": "ok" }`

---

### 5. Build para producción

```bash
# Build de todos los paquetes
pnpm run build

# Build individual
pnpm --filter @workspace/web run build      # → apps/web/dist/public/
pnpm --filter @workspace/mobile run build   # → bundle Expo
pnpm --filter @workspace/api run build      # → apps/api/dist/index.mjs
```

---

## 🔑 Obtener la Groq API Key (gratis)

1. Ve a [https://console.groq.com/keys](https://console.groq.com/keys)
2. Crea una cuenta gratuita (con Google o email)
3. Haz clic en **"Create API Key"**
4. Copia la key que empieza con `gsk_...`

> ⚠️ **Seguridad:** Nunca subas tu API key a GitHub. Usa siempre archivos `.env` (incluidos en `.gitignore`) o variables de entorno del servidor en producción.

---

## 🌐 Despliegue

### Web — Netlify

```bash
# Desde la raíz del proyecto
pnpm --filter @workspace/web run build

# Luego arrastra apps/web/dist/public/ a Netlify Drop
# o conecta el repositorio en netlify.com
```

Variables de entorno en Netlify:
- `GROQ_API_KEY` — tu key de Groq (si la usas server-side)

### API — cualquier servidor Node.js

```bash
pnpm --filter @workspace/api run build
PORT=8080 node apps/api/dist/index.mjs
```

### Móvil — Expo EAS Build

```bash
npx eas build --platform android
npx eas build --platform ios
```

---

## 🐛 Solución de problemas

| Problema | Solución |
|----------|----------|
| `Use pnpm instead` al instalar | Usa `pnpm install`, no `npm install` |
| La IA no responde | Verifica que configuraste la Groq API key en Perfil o en `.env` |
| Las imágenes no cargan | Desactiva bloqueadores de anuncios y recarga con `Ctrl+F5` |
| Error 401 en Groq | La key expiró o es inválida — genera una nueva en [console.groq.com](https://console.groq.com) |
| Expo no conecta al teléfono | Asegúrate de que el teléfono y la PC estén en la misma red Wi-Fi |
| Puerto ocupado | Cambia el puerto con la variable de entorno `PORT=XXXX` |

---

## 📄 Licencia

MIT — libre para usar y modificar.
