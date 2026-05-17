# 🎨 Papaleta

**Tu laboratorio de ideas con IA** - Captura, analiza y potencia tus proyectos con inteligencia artificial.

![Papaleta](papaletaarriba.png)

## ✨ Características

- 🔍 **Análisis Inteligente** - La IA hace preguntas para entender tu idea
- 📄 **Documento Maestro** - Editor estilo Notion con asistente IA
- 🗂️ **Kanban Interactivo** - Organiza tareas con drag & drop
- 📸 **Bitácora Visual** - Documenta tu progreso con fotos
- 📊 **Dashboard** - Estadísticas y heatmap de actividad
- 🌙 **Modo Oscuro** - Interfaz Liquid Glass adaptable
- ☁️ **Sincronización** - Firebase para guardar en la nube

## 🚀 Inicio Rápido

### 1. Clonar el Repositorio
```bash
git clone https://github.com/PachoncitoUwU/Papaleta.git
cd Papaleta
```

### 2. Configurar API Key (Obligatorio)

**Obtén tu key gratis:**
1. Ve a [https://console.groq.com/keys](https://console.groq.com/keys)
2. Crea una cuenta gratis
3. Genera una API key

**Configura la key:**
```bash
# Copiar archivo de configuración
cp config.js config.local.js

# Editar config.local.js y pegar tu key
# window.GROQ_API_KEY = 'gsk_tu_key_aqui';
```

📖 **Guía completa:** Ver [SETUP.md](SETUP.md)

### 3. Iniciar Servidor Local
```bash
python -m http.server 8000
```

### 4. Abrir en el Navegador
```
http://localhost:8000
```

**⚠️ IMPORTANTE:** Sin la API key configurada, la IA no funcionará. Ver [SETUP.md](SETUP.md) para más detalles.

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3 (Glassmorphism), JavaScript ES6+
- **IA**: Groq API (Llama 3.3 70B) para análisis de texto
- **Imágenes**: Pollinations AI, Unsplash, Picsum (fallback automático)
- **Backend**: Firebase (Auth + Firestore)
- **Almacenamiento**: localStorage + Firebase sync

## 🎨 Diseño Liquid Glass

Interfaz con efecto de cristal líquido (glassmorphism):
- Fondos translúcidos con `backdrop-filter: blur(16px)`
- Bordes semi-transparentes
- Sombras suaves
- Gradientes sutiles
- Modo claro y oscuro

## 📱 Uso en Móvil

### Android (Chrome)
1. Abre la app en Chrome
2. Menú (⋮) → "Agregar a pantalla de inicio"

### iPhone (Safari)
1. Abre la app en Safari
2. Botón compartir (□↑) → "Agregar a pantalla de inicio"

## 🚀 Despliegue

### Vercel (Recomendado)
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Netlify
Arrastra la carpeta a [Netlify Drop](https://app.netlify.com/drop)

## 🤖 Asistente IA

El asistente puede:
- ✏️ Reescribir el documento maestro
- ➕ Agregar tareas al kanban
- ✅ Completar tareas
- 📊 Actualizar el progreso
- 💬 Responder preguntas

**Ejemplos de comandos:**
- "Agrega 3 tareas para empezar"
- "Reescribe el documento en tono profesional"
- "Completa la tarea de investigación"
- "Actualiza el progreso al 50%"

## 📂 Estructura

```
papaleta/
├── index.html          # Estructura HTML
├── app.js              # Lógica de aplicación
├── style.css           # Estilos Liquid Glass
├── core.js             # Firebase y funciones core
├── papaletaarriba.png  # Logo principal
├── papaletaLogok.png   # Logo móvil
└── vercel.json         # Configuración deploy
```

## 🔑 APIs Utilizadas

### Texto (Análisis de Ideas)
- **Groq API** con Llama 3.3 70B
- 🔒 Requiere API key (gratis)
- 📝 Obtén tu key en: https://console.groq.com/keys
- ⚠️ **Seguridad:** Configura tu key en `config.local.js` (nunca en el código público)

### Imágenes (Visualización)
- **Pollinations AI** (Flux) - Gratis
- **Unsplash Source** - Gratis (fallback)
- **Picsum Photos** - Gratis (fallback)
- ✅ Sin API keys necesarias
- ✅ Fallback automático

## 🐛 Solución de Problemas

### Las imágenes no cargan
- Desactiva bloqueadores de anuncios
- Recarga con `Ctrl + F5`
- Verifica consola (F12) para logs

### Los botones no funcionan
- Recarga con `Ctrl + F5`
- Verifica que JavaScript esté habilitado

### El modo oscuro no se guarda
- Verifica que localStorage esté habilitado
- Prueba en modo incógnito

### La IA no responde
- Verifica que hayas configurado tu Groq API key en `config.local.js`
- Revisa la consola (F12) para errores
- Obtén una nueva key en https://console.groq.com/keys

## 🔒 Seguridad

**⚠️ NUNCA subas API keys a GitHub:**
- Usa `config.local.js` para desarrollo local (está en `.gitignore`)
- Para producción, usa variables de entorno del servidor
- GitHub bloqueará automáticamente pushes con secrets expuestos

**Producción segura:**
```bash
# Vercel
vercel env add GROQ_API_KEY

# Netlify
netlify env:set GROQ_API_KEY gsk_tu_key_aqui
```

## 📄 Licencia

MIT License - Código abierto y libre para usar.

## 👨‍💻 Autor

Creado con ❤️ para makers y emprendedores.

---

**¿Preguntas?** Abre un issue en GitHub.

**¡Disfruta creando! 🚀**
