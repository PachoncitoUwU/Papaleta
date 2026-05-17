# 📱 Comparación: Papaleta iOS vs Web

## 🤖 Inteligencia Artificial

### iOS (Swift)
**Proveedor:** Vercel AI Toolkit (Proxy)

**Texto/Chat:**
- **Modelo:** `anthropic/claude-haiku-4.5`
- **API:** Claude (Anthropic)
- **Características:**
  - ✅ Preguntas inteligentes sobre ideas
  - ✅ Generación de título
  - ✅ Resumen automático
  - ✅ Documentación estructurada
  - ✅ Pitch de negocio
  - ✅ Análisis de fotos con visión
  - ✅ OCR (extracción de texto de imágenes)
  - ✅ Sugerencia de tareas
  - ✅ Business Model Canvas
  - ✅ Chat asistente contextual

**Imágenes:**
- **Modelo:** `openai/gpt-image-2`
- **API:** GPT Image 2 (OpenAI)
- **Tamaño:** 1024x1024
- **Timeout:** 120 segundos
- **Formato:** Base64 → Data

**Configuración:**
```swift
private var baseURL: String {
    let toolkitURL = Config.EXPO_PUBLIC_TOOLKIT_URL
    return "\(toolkitURL)/v2/vercel"
}

private var secretKey: String {
    Config.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY
}
```

---

### Web (JavaScript)
**Proveedor:** Groq API (Directo)

**Texto/Chat:**
- **Modelo:** `llama-3.3-70b-versatile`
- **API:** Groq (Llama 3.3 70B)
- **Características:**
  - ✅ Preguntas inteligentes (4-5 preguntas)
  - ✅ Análisis completo de ideas
  - ✅ Generación de documento maestro HTML
  - ✅ Roadmap de tareas
  - ✅ Chat asistente con manipulación DOM
  - ✅ Análisis de imágenes con visión
  - ✅ Descripción de fotos de timeline

**Imágenes:**
- **Modelo:** Pollinations AI (Flux)
- **API:** Pollinations (Gratis)
- **Fallbacks:**
  1. Pollinations API (con key opcional)
  2. Backend proxy (si existe)
  3. Pollinations URL pública
  4. Pollinations legacy URL
  5. Unsplash Source (keywords en inglés)
  6. Picsum Photos (seed)
- **Timeout:** 65 segundos
- **Formato:** URL o Base64

**Configuración:**
```javascript
const GK = window.GROQ_API_KEY || ''; // config.local.js
const IMG_API_KEY_STORAGE = 'pp_pollinations_key';
```

---

## 📊 Comparación de Características

| Característica | iOS | Web |
|---|---|---|
| **Modelo de Texto** | Claude Haiku 4.5 | Llama 3.3 70B |
| **Proveedor Texto** | Anthropic (vía Vercel) | Groq (directo) |
| **Modelo de Imagen** | GPT Image 2 | Pollinations Flux |
| **Proveedor Imagen** | OpenAI (vía Vercel) | Pollinations (gratis) |
| **Costo Texto** | Pago (Vercel Toolkit) | Gratis (Groq) |
| **Costo Imagen** | Pago (OpenAI) | Gratis (Pollinations) |
| **Visión (Análisis Fotos)** | ✅ Claude Haiku | ✅ Llama 4 Scout |
| **OCR** | ✅ Sí | ❌ No |
| **Business Model Canvas** | ✅ Sí | ❌ No |
| **Pitch Generator** | ✅ Sí | ❌ No |
| **Manipulación DOM** | N/A | ✅ Sí |
| **Fallback de Imágenes** | ❌ No | ✅ 6 niveles |
| **Timeout Imagen** | 120s | 65s |

---

## 🎨 Diseño y UI

### iOS (SwiftUI)
```swift
// Glass Card Modifier
.glassCard()

// Colores
AppColor.paletteOrange
AppColor.paletteBlue
AppColor.paletteGreen

// Animaciones
withAnimation {
    selectedCategory = category
}

// Navegación
NavigationStack {
    NavigationLink(value: idea) {
        IdeaCard(idea: idea)
    }
}
```

**Características:**
- ✅ SwiftUI nativo
- ✅ Modificadores personalizados
- ✅ Animaciones fluidas
- ✅ NavigationStack
- ✅ TabView con 5 tabs
- ✅ Filtros por categoría y estado
- ✅ Búsqueda integrada
- ✅ Tags con colores
- ✅ Progreso visual

---

### Web (HTML/CSS/JS)
```css
/* Liquid Glass */
backdrop-filter: blur(16px);
background: rgba(255,255,255,0.4);
box-shadow: inset 2px 2px 1px 0 rgba(255,255,255,0.5);

/* Animaciones */
transition: all .3s cubic-bezier(0.4,0,0.2,1);
transform: translateY(-6px) scale(1.02);
```

**Características:**
- ✅ Glassmorphism CSS
- ✅ Wave background animado
- ✅ Toggle animado (SVG)
- ✅ Liquid glass con capas
- ✅ Modo oscuro/claro
- ✅ Responsive mobile
- ✅ Heatmap de actividad
- ✅ Kanban drag & drop
- ✅ Chat flotante

---

## 💾 Persistencia de Datos

### iOS
```swift
// SwiftData
@Query(sort: \Idea.createdAt, order: .reverse) 
private var ideas: [Idea]

// Modelos
Schema([
    Idea.self,
    TaskItem.self,
    TimelineEntry.self,
    ChatMessage.self,
    Tag.self,
    QuickNote.self,
])
```

**Características:**
- ✅ SwiftData (Core Data moderno)
- ✅ Persistencia local automática
- ✅ Queries reactivas
- ✅ Relaciones entre modelos
- ✅ Sincronización iCloud (opcional)

---

### Web
```javascript
// localStorage + Firebase
localStorage.setItem('pp_ideas', JSON.stringify(ideas));

// Firebase Firestore
await addDoc(collection(db, 'ideas'), data);
await getDocs(query(collection(db, 'ideas'), where('uid', '==', user.uid)));
```

**Características:**
- ✅ localStorage (local)
- ✅ Firebase Firestore (nube)
- ✅ Sincronización automática
- ✅ Modo offline
- ✅ Auth con Google

---

## 🚀 Ventajas y Desventajas

### iOS

**✅ Ventajas:**
- Modelo de IA más avanzado (Claude Haiku 4.5)
- OCR integrado
- Business Model Canvas
- Pitch generator
- SwiftData nativo
- Mejor rendimiento
- Animaciones nativas fluidas
- Integración con sistema iOS

**❌ Desventajas:**
- Requiere pago (Vercel Toolkit)
- Sin fallback de imágenes
- Solo iOS (no multiplataforma)
- Requiere Xcode para desarrollo
- Sin manipulación DOM (no aplica)

---

### Web

**✅ Ventajas:**
- 100% gratis (Groq + Pollinations)
- 6 niveles de fallback para imágenes
- Multiplataforma (cualquier navegador)
- Wave background animado
- Manipulación DOM por IA
- Modo oscuro/claro
- Heatmap de actividad
- Fácil de desplegar (Vercel/Netlify)
- No requiere instalación

**❌ Desventajas:**
- Modelo de IA menos avanzado (Llama 3.3 vs Claude)
- Sin OCR
- Sin Business Model Canvas
- Sin Pitch generator
- Dependencia de localStorage
- Rendimiento menor que nativo

---

## 🎯 Recomendaciones

### Para iOS:
1. **Agregar fallback de imágenes** similar a la web
2. **Considerar Groq** como alternativa gratuita
3. **Implementar heatmap** de actividad
4. **Agregar modo oscuro** completo

### Para Web:
1. **Agregar OCR** con Llama Vision
2. **Implementar Business Model Canvas**
3. **Agregar Pitch generator**
4. **Mejorar modelo de IA** (considerar Claude si hay presupuesto)
5. **Agregar PWA** para instalación móvil

---

## 📱 Sincronización iOS ↔ Web

### Opción 1: Firebase como Backend Común
```javascript
// Web
const db = getFirestore(app);
await addDoc(collection(db, 'ideas'), ideaData);

// iOS
// Implementar Firebase SDK para iOS
```

### Opción 2: API REST Compartida
```javascript
// Backend (Node.js/Express)
app.post('/api/ideas', async (req, res) => {
    const idea = await db.ideas.create(req.body);
    res.json(idea);
});

// iOS + Web consumen la misma API
```

### Opción 3: Vercel AI Toolkit en Web
```javascript
// Usar el mismo proxy que iOS
const response = await fetch('https://toolkit.vercel.app/v2/vercel/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + TOOLKIT_KEY,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        messages: messages
    })
});
```

---

## 💰 Costos Estimados

### iOS (Actual)
- **Vercel AI Toolkit:** ~$20-50/mes (según uso)
- **Claude Haiku 4.5:** $0.25 / 1M tokens input, $1.25 / 1M tokens output
- **GPT Image 2:** ~$0.02 por imagen

**Costo mensual estimado (100 usuarios activos):** $30-80

---

### Web (Actual)
- **Groq:** Gratis (con límites)
- **Pollinations:** Gratis
- **Firebase:** Gratis hasta 50K lecturas/día
- **Vercel/Netlify:** Gratis

**Costo mensual estimado (100 usuarios activos):** $0

---

## 🔄 Migración Sugerida

### Para reducir costos en iOS:
1. Cambiar de Claude a Groq (Llama 3.3)
2. Cambiar de GPT Image a Pollinations
3. Mantener Vercel Toolkit solo para features premium

### Para mejorar calidad en Web:
1. Agregar opción de Claude (premium)
2. Mantener Groq como opción gratuita
3. Implementar features faltantes (OCR, Business Model)

---

**Conclusión:** La versión iOS tiene mejor IA pero cuesta dinero. La versión Web es 100% gratis pero con IA menos avanzada. Lo ideal sería unificar usando Groq + Pollinations (gratis) con opción premium de Claude.
