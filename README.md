# ⚡ Vórtice Elite — Entrenador Personal con IA

> **Proyecto desarrollado íntegramente con asistencia de IA (Windsurf Cascade / Claude).**

Vórtice es una app de entrenamiento y nutrición **local-first** — tu PC es el servidor, tus datos son tuyos.

---

## 🎯 Funcionalidades

| Feature | Descripción |
|---------|------------|
| 🏋️ **Gym** | +1324 ejercicios con GIFs, creación de rutinas, workout tracker en vivo |
| 🥗 **Nutrición** | Registro de comidas por texto/foto (IA), ayuno intermitente, alacena |
| 🧠 **Coach IA** | Entrenador virtual con Google Gemini + fallback local |
| 📊 **Estadísticas** | Gráficos de progreso, récords personales, streaks |
| 🏃 **Deportes** | Tracking de natación, fútbol, running, etc. con calendario |
| 👥 **Comunidad** | Feed social, seguidores, compartir rutinas públicas |
| 🔐 **Auth** | Registro + login con JWT |
| 🌍 **i18n** | Español e Inglés |
| 📱 **Mobile** | PWA optimizada para iPhone y Android |

---

## 🚀 Setup Rápido

### Requisitos previos
- **Python 3.10+**
- **Node.js 18+**
- **cloudflared** (`npm install -g cloudflared`)

### Opción 1: Un solo comando (recomendado)
```bash
python actualizar_tunel.py
```
Esto levanta el backend, crea el túnel de Cloudflare, actualiza la URL en Vercel, y hace push automáticamente.

### Opción 2: Manual
```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python main.py
# → http://localhost:8000
# → Swagger: http://localhost:8000/docs

# Terminal 2 — Frontend (dev local)
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Terminal 3 — Túnel (para acceso remoto)
cloudflared tunnel --url http://localhost:8000
```

---

## 🏗️ Arquitectura

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Vercel CDN  │────▶│ Cloudflare Tunnel │────▶│ Tu PC (local) │
│  (frontend)  │     │  (proxy HTTPS)   │     │  FastAPI:8000  │
└──────────────┘     └──────────────────┘     │  SQLite DB     │
                                               │  GIFs (local)  │
                                               └───────────────┘
```

### Stack
- **Backend**: Python · FastAPI · SQLite · Google Gemini AI · JWT
- **Frontend**: React 19 · Vite 8 · Framer Motion · Lucide Icons · Recharts
- **Deploy**: Vercel (static frontend) · Cloudflare Quick Tunnels (backend proxy)

---

## 📁 Estructura del Proyecto

```
entrenador-ia/
├── actualizar_tunel.py     # Script unificado: backend + tunnel + auto-deploy
├── backend/
│   ├── main.py             # FastAPI app + Swagger docs
│   ├── core/
│   │   ├── ai.py           # Motor IA (Gemini + fallback)
│   │   ├── auth.py         # JWT auth
│   │   ├── config.py       # Configuración
│   │   ├── database.py     # Abstracción DB
│   │   ├── database_sqlite.py  # Queries SQLite
│   │   └── intelligence.py # Búsqueda semántica de ejercicios
│   ├── routers/
│   │   ├── auth.py         # /api/auth/*
│   │   ├── perfiles.py     # /api/perfil/*
│   │   ├── gym.py          # /api/gym/*
│   │   ├── nutricion.py    # /api/nutricion/*
│   │   ├── chat.py         # /api/chat
│   │   └── general.py      # /api/* (deportes, comunidad, etc.)
│   ├── personality/        # Prompt builder para el coach IA
│   ├── scripts/
│   │   └── init_final_db.py  # Inicialización de tablas
│   └── data/
│       ├── vortice_elite.db  # Base de datos SQLite
│       └── exercises/gifs/   # +1324 GIFs de ejercicios
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Router principal + tabs
│   │   ├── config.js         # API URL + authFetch helper
│   │   ├── LanguageContext.jsx  # i18n (ES/EN)
│   │   └── components/
│   │       ├── GymView.jsx       # Rutinas, ejercicios, historial
│   │       ├── NutricionView.jsx # Comidas, ayuno, alacena
│   │       ├── SportsView.jsx    # Deportes complementarios
│   │       ├── ComunidadView.jsx # Feed social
│   │       ├── GraficosView.jsx  # Charts y estadísticas
│   │       ├── PerfilView.jsx    # Config física, body heatmap
│   │       ├── WorkoutTracker.jsx # Tracker en vivo
│   │       └── ...
│   └── vercel.json           # Rewrites → Cloudflare tunnel
└── README.md
```

---

## 🔑 Variables de Entorno

Crear `backend/.env`:
```env
GEMINI_API_KEY=tu_key_de_google_gemini
JWT_SECRET=tu_secret_jwt_aleatorio
```

---

## 📖 API Docs

Con el backend corriendo, abrir:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🤖 Nota sobre IA

Este proyecto fue desarrollado en su totalidad con asistencia de **Windsurf Cascade (Claude)**. Incluye diseño UI, lógica backend, animaciones, y arquitectura de deployment.

---

*Desarrollado con ⚡ por Vórtice Elite.*
