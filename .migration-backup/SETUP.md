# 🚀 Configuración de Papaleta

## Configuración Rápida (5 minutos)

### 1. Obtener API Key de Groq (Gratis)

1. Ve a [https://console.groq.com/keys](https://console.groq.com/keys)
2. Crea una cuenta gratis (con Google o email)
3. Haz clic en "Create API Key"
4. Copia la key que empieza con `gsk_...`

### 2. Configurar la Key Localmente

**Opción A: Archivo de configuración (Recomendado)**

```bash
# Copiar el archivo de configuración
cp config.js config.local.js
```

Edita `config.local.js` y pega tu key:

```javascript
window.GROQ_API_KEY = 'gsk_tu_key_aqui';
```

**Opción B: Consola del navegador**

Abre la consola (F12) y ejecuta:

```javascript
localStorage.setItem('groq_api_key', 'gsk_tu_key_aqui');
```

### 3. Iniciar la App

```bash
# Python 3
python -m http.server 8000

# O con Node.js
npx http-server -p 8000
```

Abre: [http://localhost:8000](http://localhost:8000)

---

## 🔒 Seguridad

### ⚠️ NUNCA hagas esto:

- ❌ Subir `config.local.js` a GitHub
- ❌ Compartir tu API key en público
- ❌ Poner la key directamente en el código

### ✅ Buenas prácticas:

- ✅ Usa `config.local.js` (está en `.gitignore`)
- ✅ Regenera tu key si la expones accidentalmente
- ✅ En producción, usa variables de entorno del servidor

---

## 🌐 Despliegue en Producción

### Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Configurar variable de entorno
vercel env add GROQ_API_KEY

# Desplegar
vercel --prod
```

### Netlify

```bash
# Configurar variable de entorno
netlify env:set GROQ_API_KEY gsk_tu_key_aqui

# Desplegar
netlify deploy --prod
```

### Variables de entorno necesarias:

- `GROQ_API_KEY` - Tu key de Groq API

---

## 🐛 Problemas Comunes

### "La IA no responde"

1. Verifica que configuraste la API key
2. Abre la consola (F12) y busca errores
3. Verifica que la key sea válida en [console.groq.com](https://console.groq.com)

### "Las imágenes no cargan"

- Las imágenes usan APIs gratuitas sin autenticación
- Si falla, prueba desactivar bloqueadores de anuncios
- Recarga con `Ctrl + F5`

### "Error 401 Unauthorized"

- Tu API key no es válida o expiró
- Genera una nueva en [console.groq.com/keys](https://console.groq.com/keys)

---

## 📚 Más Información

- [Documentación de Groq](https://console.groq.com/docs)
- [Pollinations AI](https://pollinations.ai)
- [Firebase Setup](https://firebase.google.com/docs/web/setup)

---

**¿Necesitas ayuda?** Abre un issue en GitHub.
