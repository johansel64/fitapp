# FitApp — Tu entrenador personal con IA

App web de fitness con login, planes generados por IA, progreso guardado y temporizador de descanso.

## Tecnologías
- **React + Vite** — frontend
- **Supabase** — auth + base de datos (PostgreSQL)
- **Claude API** — generador de planes con IA

---

## Setup en 5 pasos

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com) → New Project
2. Copia la **URL** y la **anon key** (Settings → API)

### 3. Crear el archivo .env
```bash
cp .env.example .env
```
Rellena con tus credenciales de Supabase.

### 4. Crear las tablas en Supabase
Ve a tu proyecto → SQL Editor y pega el SQL que está en:
`src/lib/supabase.js` (sección de comentarios al final del archivo)

### 5. Correr en desarrollo
```bash
npm run dev
```
Abre http://localhost:5173

---

## Estructura del proyecto
```
src/
├── lib/
│   └── supabase.js        ← cliente de Supabase + SQL de tablas
├── hooks/
│   ├── useAuth.jsx        ← login, registro, sesión
│   ├── usePlans.js        ← CRUD de planes
│   └── useProgress.js     ← guardar series y días completados
├── pages/
│   ├── AuthPage.jsx       ← login / registro
│   ├── HomePage.jsx       ← inicio con calendario
│   ├── PlansPage.jsx      ← mis planes + generador IA
│   ├── PlayerPage.jsx     ← reproductor con timer y descanso
│   └── ProfilePage.jsx    ← perfil de usuario
├── App.jsx                ← shell + navegación
├── main.jsx               ← entry point
└── index.css              ← estilos globales
```

## Deploy en Vercel (opcional)
```bash
npm install -g vercel
vercel
```
Añade las variables de entorno en el dashboard de Vercel.

---

## Obtener API key de Gemini (gratis)

1. Ve a **aistudio.google.com/apikey**
2. Haz clic en "Create API key"
3. Cópiala y ponla en tu `.env` como `GEMINI_API_KEY=...`
4. En Vercel: Settings → Environment Variables → agrega `GEMINI_API_KEY`

### Límites gratuitos de Gemini 1.5 Flash
- 1,500 requests por día
- 1,000,000 tokens por minuto
- Sin tarjeta de crédito

---

## Deploy en Vercel (gratis)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy (primera vez)
vercel

# Variables de entorno en Vercel dashboard:
# GEMINI_API_KEY = tu key de Gemini
# VITE_SUPABASE_URL = tu URL de Supabase  
# VITE_SUPABASE_ANON_KEY = tu anon key
```

La función `api/generate-plan.js` se despliega automáticamente como serverless function en Vercel.
