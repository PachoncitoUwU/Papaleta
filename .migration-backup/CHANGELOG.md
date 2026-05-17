# 📝 Changelog - Papaleta

## v3.0 - Liquid Glass Edition (Mayo 2026)

### ✨ Nuevas Características

#### 🎨 Diseño Liquid Glass (Glassmorphism)
- Interfaz con efecto de cristal líquido translúcido
- `backdrop-filter: blur(16px)` en todas las tarjetas
- Bordes semi-transparentes con sombras suaves
- Gradientes sutiles en fondos
- Transiciones fluidas con `cubic-bezier(0.4,0,0.2,1)`

#### 🎨 Nueva Paleta de Colores
- **Primario**: Indigo `#6366f1` (reemplaza naranja)
- **Secundario**: Teal/Cyan `#06B6D4`
- **Fondo Claro**: Gradiente blanco a azul/plata
- **Fondo Oscuro**: Gradiente negro a azul noche
- **Modo Oscuro**: Completamente rediseñado

#### 🔘 Botones con Efecto Líquido/Metal
- Sombras internas complejas (inset shadows)
- Efecto de brillo al hover
- Animaciones de escala y elevación
- Gradientes de luz semi-transparentes
- Feedback táctil en active state

#### 🤖 Asistente IA Mejorado
- **Manipulación directa del DOM**
- Nuevas acciones:
  - `add_task` - Agregar tarea única
  - `add_multiple_tasks` - Agregar múltiples tareas
  - `move_task` - Mover tarea entre columnas
  - `complete_task` - Completar tarea
  - `rewrite` - Reescribir documento completo
  - `set_progress` - Actualizar progreso
- Toasts informativos para cada acción
- Validación de elementos DOM
- Manejo robusto de errores

#### 🖼️ Generación de Imágenes con Keywords Inteligentes
- Función `extractKeywords()` con traducción español → inglés
- Diccionario de términos comunes
- Función `detectCategory()` para categorización automática
- Keywords más precisas para Unsplash
- Logs detallados en consola

### 🔧 Mejoras Técnicas

#### CSS
- Variables CSS para temas (light/dark)
- Transiciones suaves (0.3s cubic-bezier)
- Sombras complejas con múltiples capas
- Efectos de blur y transparencia
- Responsive design mejorado

#### JavaScript
- Código más modular y mantenible
- Validaciones de DOM antes de manipular
- Manejo de errores mejorado
- Logs informativos en consola
- Funciones auxiliares reutilizables

### 🐛 Correcciones

- ✅ Event listeners inicializados después del login
- ✅ Validación de elementos DOM antes de acceder
- ✅ Timeout de imágenes reducido (30s → 15s)
- ✅ Fallback de imágenes más robusto
- ✅ Modo oscuro persistente en localStorage
- ✅ Logo clickeable que regresa al Dashboard
- ✅ Círculo de progreso sin sobreposición de texto

### 📦 Estructura del Proyecto

```
papaleta/
├── index.html          # Estructura HTML
├── app.js              # Lógica de aplicación
├── style.css           # Estilos Liquid Glass
├── core.js             # Firebase y funciones core
├── README.md           # Documentación
├── CHANGELOG.md        # Este archivo
├── papaletaarriba.png  # Logo principal
├── papaletaLogok.png   # Logo móvil
├── vercel.json         # Configuración deploy
├── deploy.bat          # Script de deploy
└── .gitignore          # Archivos ignorados
```

### 🚀 Despliegue

- ✅ Configurado para Vercel
- ✅ Configurado para Netlify
- ✅ Firebase Auth + Firestore
- ✅ PWA ready (móvil)

### 🎯 APIs Utilizadas

#### Texto (Análisis)
- **Groq API** - Llama 3.3 70B
- ✅ Gratis, ya configurada

#### Imágenes (Visualización)
1. **Pollinations AI** (Flux) - Gratis
2. **Unsplash Source** - Gratis (fallback)
3. **Picsum Photos** - Gratis (fallback)
- ✅ Sin API keys necesarias
- ✅ Fallback automático en cascada

---

## v2.0 - Dashboard y Navegación (Mayo 2026)

### ✨ Características
- Dashboard centralizado con estadísticas
- Activity Heatmap estilo GitHub
- Grid de ideas recientes
- Perfil de usuario con foto
- Modo oscuro funcional

---

## v1.0 - Lanzamiento Inicial (Mayo 2026)

### ✨ Características
- Análisis de ideas con IA
- Documento maestro editable
- Kanban interactivo
- Bitácora visual con fotos
- Chat asistente IA
- Firebase Auth + Firestore
- Generación de imágenes

---

**Última actualización:** Mayo 17, 2026
**Versión actual:** v3.0 Liquid Glass Edition
