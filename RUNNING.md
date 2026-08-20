# REALIS — Running the Project

## Quick Start (Windows)

### Option A: One-click setup

```bat
setup.bat
```

This installs Python dependencies and starts the backend server.

### Option B: Manual

**Terminal 1 — Backend (port 8000)**

```bat
cd /d "D:\WORK AND STUDY\REALIS"
pip install -r requirements.txt
python start_server.py
```

**Terminal 2 — Frontend (port 3000)**

```bat
cd web
npm install
npm run dev
```

## Check It Works

| URL | What you should see |
| --- | --- |
| http://localhost:8000/health | `{"status":"ok","engine":"Python physics engine (v0.2)"}` |
| http://localhost:8000/docs | Swagger UI with all API routes |
| http://localhost:3000 | REALIS web app (3D viewport) |
| http://localhost:8000/api/sketch/status | Sketch pipeline status |

## Common Problems

- **`pip install` fails** — use `python -m pip install -r requirements.txt` if `pip` is not on PATH.
- **Port 8000 already in use** — another server may be running; stop it, or change the port in `start_server.py`.
- **Port 3000 already in use** — Vite uses `strictPort: true`; free the port or change it in `web/vite.config.js`.
- **CORS / API not reachable from frontend** — the frontend reads `VITE_API_BASE` (default `http://localhost:8000`). Copy `web/.env.example` to `web/.env` if present, or set the variable in your shell.
- **Missing Python dependencies** — `start_server.py` now checks and prints exactly which packages to install.

## Architecture Notes

- Physics engine is **pure Python** (`tools/server.py`) — no C++ binary required.
- Sketch → Simulation: upload an image → OpenCV pipeline (`tools/sketch_ai/`) produces a scene graph → `sketchToScene.js` converts it into 3D objects → `/simulate` runs the physics → frames play back in the viewport.
- Energy history is computed client-side from frame data and rendered by the Energy Monitor.