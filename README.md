# 🌪️ Vórtice Health - Local-First

Vórtice es un asistente de entrenamiento y nutrición avanzado, diseñado para ser **privado, rápido y autónomo**. Utiliza una arquitectura **Local-First**, donde tú eres el dueño de tus datos en tu propio servidor (Mini PC, Raspberry Pi o tu PC personal).

## 🏗️ Arquitectura
- **Frontend**: React + Vite (Desplegado en Vercel o local).
- **Backend**: FastAPI (Python) + SQLite + Vectorial Memory.
- **Base de Datos**: `vortice_elite.db` (SQLite) localizada en `backend/data/`.

## 🚀 Cómo empezar

### 1. El Servidor (Backend)
Desde la carpeta raíz:
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
*El servidor se iniciará en `http://localhost:8000` con Auto-Reload activado.*

### 2. La Interfaz (Frontend)
Desde una nueva terminal en la carpeta raíz:
```bash
cd frontend
npm install
npm run dev
```

## 🛠️ Herramientas de Administración
Vórtice incluye un panel de control interno para auditar los ejercicios:
👉 **URL**: `http://localhost:8000/view/exercises`

Desde aquí puedes filtrar por músculo, ordenar por dificultad y verificar que todos los GIFs de los ejercicios carguen correctamente.

## 🐳 Despliegue con Docker
Para llevar Vórtice a tu Mini PC de forma profesional:
```bash
docker-compose up --build
```

## 🧹 Limpieza Reciente
Se ha realizado una limpieza profunda del repositorio:
- Eliminada carpeta `backend/app` (legado).
- Eliminados scripts de importación redundantes.
- Unificada la base de datos en `vortice_elite.db`.
- Configurado `vercel.json` para rutas relativas.

---
*Desarrollado con ❤️ para Vórtice Elite.*
