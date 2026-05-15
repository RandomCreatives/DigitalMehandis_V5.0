from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.v1 import auth, projects, drawings, takeoff, bbs, boq, rates
from app.api.v1 import calibration, measurements, elements, boq_items, audit
from app.api.v1 import cost_library, rate_matching

settings = get_settings()

app = FastAPI(
    title="EthioQS API",
    description="Ethiopian Quantity Surveying Tool — Phase 2: Drawing-Aware QS",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"

# ── Phase 1 routes (preserved) ────────────────────────────────────────────────
app.include_router(auth.router,      prefix=PREFIX)
app.include_router(projects.router,  prefix=PREFIX)
app.include_router(drawings.router,  prefix=PREFIX)
app.include_router(takeoff.router,   prefix=PREFIX)
app.include_router(bbs.router,       prefix=PREFIX)
app.include_router(boq.router,       prefix=PREFIX)
app.include_router(rates.router,     prefix=PREFIX)

# ── Phase 2 routes ────────────────────────────────────────────────────────────
app.include_router(calibration.router,  prefix=PREFIX)
app.include_router(measurements.router, prefix=PREFIX)
app.include_router(elements.router,     prefix=PREFIX)
app.include_router(boq_items.router,    prefix=PREFIX)
app.include_router(audit.router,        prefix=PREFIX)

# ── Phase 2 Cost Engine routes ────────────────────────────────────────────────
app.include_router(cost_library.router,  prefix=PREFIX)
app.include_router(rate_matching.router, prefix=PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "EthioQS API", "phase": "2"}
