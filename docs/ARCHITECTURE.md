# EthioQS Architecture

## System Overview

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│  Next.js 14     │ ─────────────► │  FastAPI          │
│  (Frontend)     │                │  (Backend)        │
│  Port 3000      │ ◄───────────── │  Port 8000        │
└─────────────────┘   JSON/REST    └────────┬─────────┘
                                            │ SQLAlchemy
                                            ▼
                                   ┌──────────────────┐
                                   │  PostgreSQL 14   │
                                   │  Port 5432       │
                                   └──────────────────┘
```

## Backend Structure

```
app/
├── api/v1/          # Route handlers (thin layer, delegates to utils)
│   ├── auth.py      # JWT register/login/refresh
│   ├── projects.py  # Project CRUD
│   ├── drawings.py  # File upload & serving
│   ├── takeoff.py   # Take-off item CRUD
│   ├── bbs.py       # BBS bar CRUD + cutting list
│   ├── boq.py       # BOQ generation + exports
│   └── rates.py     # Global rate database
├── core/
│   ├── config.py    # Pydantic settings (env vars)
│   ├── security.py  # JWT + bcrypt
│   └── constants.py # Enums, unit weights, WBS
├── db/
│   ├── models.py    # SQLAlchemy ORM models
│   ├── session.py   # Async DB session
│   └── migrations/  # Alembic
├── schemas/         # Pydantic request/response models
└── utils/
    ├── bbs_calculator.py  # Cutting length & weight logic
    ├── boq_generator.py   # BOQ assembly from takeoff + rates
    ├── exporters.py       # Excel (openpyxl) + PDF (reportlab)
    ├── file_handler.py    # Upload validation & storage
    └── seed_rates.py      # Pre-loaded Ethiopian rate database
```

## Frontend Structure

```
src/
├── app/             # Next.js App Router pages
│   ├── page.tsx     # Landing page
│   ├── auth/        # Login & Register
│   └── dashboard/
│       ├── page.tsx              # Project list
│       └── [projectId]/
│           ├── page.tsx          # Project overview
│           ├── drawings/         # PDF upload & viewer
│           ├── takeoff/          # Manual take-off sheet
│           ├── boq/              # BOQ generation & export
│           └── bbs/              # BBS entry & cutting list
├── lib/
│   ├── api.ts           # Axios client with JWT interceptors
│   ├── calculations.ts  # Client-side BBS preview math
│   └── utils.ts         # cn(), formatCurrency()
├── store/
│   ├── authStore.ts     # Zustand auth state
│   └── projectStore.ts  # Zustand project state
└── types/index.ts       # Shared TypeScript interfaces
```

## Key Design Decisions

- **Async throughout**: FastAPI + asyncpg + SQLAlchemy async for non-blocking I/O
- **JWT in localStorage**: Phase 1 simplicity; upgrade to httpOnly cookies in Phase 2
- **Client-side BBS preview**: Calculations run in browser for instant feedback, confirmed by backend on save
- **Rate matching**: Simple substring match in Phase 1; upgrade to fuzzy/semantic search in Phase 2
- **PDF serving**: Files served directly from backend with auth check; use CDN/MinIO in Phase 2
