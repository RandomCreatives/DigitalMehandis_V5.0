# EthioQS / Digital Mehandis — Session Context

> **Read this at the start of every session.**
> Last updated: 2026-05-13

---

## Project Identity

| Field | Value |
|---|---|
| App name | **Ethio-QS Engine** (branding) / **Digital Mehandis** (repo name) |
| Repo | `https://github.com/RandomCreatives/DigitalMehandis_V5.0` |
| Active branch | `feature/phase-2` |
| Local path | `D:\DEV_TRIAL\ConTech` |
| Description | Free, open-source Quantity Surveying platform for Ethiopian construction professionals |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Fabric.js 5, PDF.js 4, Zustand, Axios |
| Backend | FastAPI (Python 3.13), SQLAlchemy 2.0.36 async, Alembic, asyncpg |
| Database | **SQLite** (local dev via aiosqlite) → **PostgreSQL 16** (production, not yet set up locally) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Export | openpyxl (Excel), reportlab (PDF) |
| DXF | ezdxf 1.3.4 (installed, beta UI not yet built) |

---

## How to Run Locally

```powershell
# Backend (from D:\DEV_TRIAL\ConTech\backend)
.\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (from D:\DEV_TRIAL\ConTech\frontend)
npm run dev
```

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/api/docs
- DB file: `backend/ethioqs.db` (SQLite, gitignored)

**If login fails** → backend is probably stopped. Restart it.
**If Phase 2 tabs 500** → run `.\venv\Scripts\python.exe create_tables.py` from `backend/`

---

## Database

### Current state
- Running on **SQLite** (`backend/ethioqs.db`)
- `backend/.env` has `DATABASE_URL=sqlite+aiosqlite:///./ethioqs.db`
- To switch to PostgreSQL: change `.env` to `postgresql+asyncpg://ethioqs:ethioqs_secret@localhost:5432/ethioqs` then run `alembic upgrade head`

### Phase 1 tables (migration 0001)
`users`, `projects`, `drawings`, `takeoff_items`, `rates`, `bbs_bars`, `boq_outputs`, `suggested_quantities`, `federated_quantities`

### Phase 2 tables (created via `create_tables.py`)
`drawing_pages`, `drawing_calibrations`, `measurements`, `project_elements`, `quantity_sources`, `boq_items`, `boq_item_sources`, `audit_logs`

### Key model files
- `backend/app/db/models.py` — Phase 1 models + GUID TypeDecorator (dialect-aware: PostgreSQL UUID or SQLite String)
- `backend/app/db/models_phase2.py` — Phase 2 models (class order matters: BOQItem before QuantitySource)
- `backend/app/db/__init__.py` — imports both model modules so SQLAlchemy resolves all relationships

---

## Backend Structure

```
backend/app/
├── api/v1/
│   ├── auth.py          — register, login, refresh
│   ├── projects.py      — project CRUD
│   ├── drawings.py      — PDF upload, serve, suggestions
│   ├── takeoff.py       — take-off item CRUD
│   ├── bbs.py           — BBS bar CRUD + cutting list
│   ├── boq.py           — BOQ generation + export (Phase 1)
│   ├── rates.py         — rate database
│   ├── calibration.py   — drawing scale calibration (Phase 2)
│   ├── measurements.py  — canvas measurements (Phase 2)
│   ├── elements.py      — project elements (Phase 2)
│   ├── boq_items.py     — editable BOQ builder (Phase 2)
│   └── audit.py         — audit log (Phase 2)
├── core/
│   ├── config.py        — Pydantic settings
│   ├── security.py      — JWT + bcrypt (uses bcrypt directly, NOT passlib)
│   └── constants.py
├── db/
│   ├── models.py        — Phase 1 models
│   ├── models_phase2.py — Phase 2 models
│   ├── session.py       — async engine + get_db
│   └── migrations/      — Alembic (0001 initial, 0002 phase2)
├── schemas/
│   ├── phase2.py        — Pydantic v2 schemas for Phase 2
│   └── ...              — Phase 1 schemas
└── utils/
    ├── audit_helper.py  — log_action() async helper
    ├── bbs_calculator.py
    ├── boq_generator.py
    ├── exporters.py
    ├── file_handler.py
    ├── pdf_processor.py
    ├── dxf_parser.py    — ezdxf entity extractor (Phase 2 beta)
    └── seed_rates.py
```

---

## Frontend Structure

```
frontend/src/
├── app/
│   ├── page.tsx                    — Landing page (glassmorphism, dark/light)
│   ├── layout.tsx                  — Root layout + ThemeProvider
│   ├── globals.css                 — Design tokens, component classes
│   ├── auth/
│   │   ├── layout.tsx              — Auth layout (shared header/footer)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── dashboard/
│       ├── layout.tsx              — Sidebar (Home btn, nav, 3-min auto-logout)
│       ├── page.tsx                — Projects list (stats, table)
│       └── [projectId]/
│           ├── layout.tsx          — Tab bar + prev/next navigation
│           ├── page.tsx            — Redirects to /drawings
│           ├── drawings/page.tsx   — Upload + "Open in Viewer" → MeasurementCanvas
│           ├── calibration/page.tsx — Drawing calibration management
│           ├── suggestions/page.tsx — Approve/reject auto-extracted quantities
│           ├── takeoff/page.tsx    — Manual take-off sheet
│           ├── boq/page.tsx        — Phase 1 BOQ generator
│           ├── boq-items/page.tsx  — Phase 2 editable BOQ builder
│           ├── bbs/page.tsx        — Bar Bending Schedule
│           ├── audit-log/page.tsx  — Audit trail timeline
│           └── cost-data/page.tsx  — MoUDC rate reference (placeholder)
├── components/
│   ├── MeasurementCanvas.tsx       — Full-screen PDF + Fabric.js measurement workspace
│   ├── NavDropdown.tsx             — Landing page nav dropdowns (theme-aware)
│   └── ThemeProvider.tsx           — Dark/light theme context
├── lib/
│   ├── api.ts                      — Axios client with JWT interceptors + auto-refresh
│   ├── calculations.ts             — Client-side BBS math
│   └── utils.ts                    — cn(), formatCurrency()
├── store/
│   ├── authStore.ts                — Zustand auth (login, register, logout)
│   └── projectStore.ts             — Zustand projects (CRUD)
└── types/
    ├── index.ts                    — Phase 1 TypeScript interfaces
    └── measurements.ts             — Phase 2: Calibration, SavedMeasurement, Tool types
```

---

## Project Tab Bar (in order)

1. **Drawings** — upload PDFs, open in measurement canvas
2. **Calibration** — set scale for each drawing
3. **Suggestions** — review auto-extracted quantities
4. **Take-off** — manual quantity entry
5. **BOQ** — Phase 1 BOQ generator
6. **BOQ Items** — Phase 2 editable BOQ builder with source traceability
7. **Bar Schedule** — BBS calculator
8. **Audit Log** — action trail
9. **Cost Data** — MoUDC rate reference

---

## Design System

- **Primary**: `#091426` (deep navy)
- **Accent / CTA**: `#eb6905` (safety orange)
- **Background**: `#f7f9fb` (light) / `#0a1628` (dark)
- **Font**: Inter
- **Theme**: dark/light toggle, persisted to localStorage via ThemeProvider
- **CSS classes**: `btn-primary`, `btn-secondary`, `btn-ghost`, `card`, `panel`, `data-table`, `chip`, `input`, `nav-item`, `section-tab`

---

## Measurement Canvas (MeasurementCanvas.tsx)

The core Phase 2 feature. Full-screen overlay on top of drawings.

**Tools:**
| Tool | Behavior |
|---|---|
| Select | Default, pan with Space+drag or middle mouse |
| Calibrate | Click 2 points → modal → enter real distance → scale saved to DB |
| Length | Click points, double-click to finish, live label |
| Area | Click polygon vertices, double-click to close, filled polygon |
| Count | Click to place numbered markers |

**Right panel:** save form (label, discipline, section, element category, multiplier, color) + measurements list with → BOQ and delete buttons

**Bottom bar:** X/Y coords, zoom %, calibration scale, active tool hint

**API calls:**
- `GET /projects/{id}/drawings/{id}/calibrations/active` — load active calibration
- `POST /projects/{id}/drawings/{id}/calibrations` — save calibration
- `GET /projects/{id}/drawings/{id}/measurements` — load saved measurements
- `POST /projects/{id}/drawings/{id}/measurements` — save measurement
- `DELETE /projects/{id}/measurements/{id}` — delete
- `POST /projects/{id}/measurements/{id}/create-quantity` — promote to BOQ queue

---

## Known Issues / Gotchas

1. **bcrypt**: Uses `bcrypt` directly (NOT passlib) — passlib is incompatible with Python 3.13
2. **SQLAlchemy**: Must be 2.0.36+ for Python 3.13 compatibility
3. **pydantic**: Must be 2.9.2+ for Python 3.13 pre-built wheels
4. **models_phase2.py class order**: `QuantitySource` MUST be defined AFTER `BOQItem` — forward reference issue
5. **Phase 2 tables on SQLite**: Created via `create_tables.py` (not alembic migration, which uses PostgreSQL-specific types)
6. **Fabric.js import**: `import * as fabricModule from 'fabric'; const fabric = (fabricModule as any).fabric` — v5 CJS export quirk
7. **PDF.js worker**: Must set `GlobalWorkerOptions.workerSrc` client-side only (`typeof window !== 'undefined'`)
8. **MeasurementCanvas**: Loaded with `next/dynamic({ ssr: false })` — required for Fabric.js + PDF.js

---

## Phase 2 — What's Left

- [ ] PostgreSQL local setup (user needs to install PostgreSQL 16)
- [ ] DXF beta UI — layer viewer, manual mapping, generate suggestions
- [ ] Rate library — editable project rates, regional, import/export Excel
- [ ] "Use Rate" button on Cost Data → BOQ Items wiring
- [ ] BBS steel totals → approved quantity → BOQ feed
- [ ] Measurement canvas: element linking modal (link measurement to ProjectElement)

## Phase 3 — Future

- Spatial federation engine (cross-discipline element matching)
- Automatic conflict detection (pipe through beam, etc.)
- Global coordinate system (calibration → real-world XYZ)
- DXF full automation (layer → element → quantity)
- IFC/Revit import
- AI-assisted quantity suggestions
- Multi-user collaboration
- PWA / offline mode

---

## Git Workflow

```powershell
# Check status before committing
git status --short
git diff --staged

# Commit
git add <specific files>
git commit -m "feat: description"
git push

# Check branch vs remote
git log --oneline origin/main..HEAD
```

Current branch `feature/phase-2` is ahead of `main`. Merge via GitHub PR when a milestone is complete.
