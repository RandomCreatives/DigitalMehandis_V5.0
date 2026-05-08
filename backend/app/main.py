from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.v1 import auth, projects, drawings, takeoff, bbs, boq, rates

settings = get_settings()

app = FastAPI(
    title="EthioQS API",
    description="Ethiopian Quantity Surveying Tool — Phase 1",
    version="1.0.0",
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
app.include_router(auth.router, prefix=PREFIX)
app.include_router(projects.router, prefix=PREFIX)
app.include_router(drawings.router, prefix=PREFIX)   # handles /projects/*/drawings + /admin/drawings
app.include_router(takeoff.router, prefix=PREFIX)
app.include_router(bbs.router, prefix=PREFIX)
app.include_router(boq.router, prefix=PREFIX)
app.include_router(rates.router, prefix=PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "EthioQS API"}
