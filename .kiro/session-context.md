# EthioQS — Session Context

Use this file to track where we left off between sessions.

---

## Project Summary

**EthioQS** — Free, open-source quantity surveying tool for Ethiopian construction professionals.

- Frontend: Next.js 14, Tailwind CSS, ShadCN UI, Fabric.js, PDF.js — runs on port 3000
- Backend: FastAPI (Python 3.11), PostgreSQL 14, SQLAlchemy 2.0 (async) — runs on port 8000
- Auth: JWT (access + refresh tokens)
- Export: Excel (openpyxl/SheetJS), PDF (reportlab/jsPDF)

---

## Phase 1 Features (built)

- Upload and view PDF drawings
- Manual take-off with measurement tools
- Bill of Quantities (BOQ) in Ethiopian MoUDC format
- Bar Bending Schedule (BBS) with automatic calculations
- Substructure / Superstructure separation
- Export to Excel and PDF
- Pre-loaded Ethiopian material rate database

---

## Current Session Log

### Session — 2026-05-08

**Goal:** Get the app running locally via Docker.

**What was done:**
- Reviewed existing `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` — all looked correct
- Removed obsolete `version: "3.9"` field from `docker-compose.yml` (causes a warning in newer Compose)
- Created missing `frontend/public/` directory (frontend Dockerfile was copying it, would have failed without it)
- Ran `docker compose up --build` — build in progress as of end of session

**Pending / Next steps:**
- Confirm all 3 containers (db, backend, frontend) come up healthy
- Verify frontend loads at http://localhost:3000
- Verify backend API docs load at http://localhost:8000/api/docs
- Check DB migrations run on first boot (alembic upgrade head may need to be wired into backend startup)

---

## Known Issues / Notes

- Backend `Dockerfile` does NOT run `alembic upgrade head` on startup — migrations need to be run manually or added to the CMD/entrypoint
- `NEXT_PUBLIC_API_URL` in compose is set to `http://localhost:8000` — fine for browser calls, but SSR calls inside the container should use `http://backend:8000`
- JWT stored in localStorage (Phase 1 simplicity) — upgrade to httpOnly cookies planned for Phase 2

---

## File Map (quick reference)

```
backend/app/api/v1/     — route handlers (auth, projects, drawings, takeoff, bbs, boq, rates)
backend/app/core/       — config, security, constants
backend/app/db/         — models, session, alembic migrations
backend/app/utils/      — bbs_calculator, boq_generator, exporters, file_handler, seed_rates
frontend/src/app/       — Next.js pages (auth, dashboard, [projectId]/*)
frontend/src/lib/       — api.ts (axios), calculations.ts, utils.ts
frontend/src/store/     — authStore, projectStore (Zustand)
frontend/src/types/     — shared TS interfaces
```
