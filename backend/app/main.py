from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.modules.loader import load_modules

settings = get_settings()

def create_app() -> FastAPI:
    app = FastAPI(
        title="Digital Mehandis API",
        description="Ethiopian Construction ERP — Modular Design",
        version="3.0.0",
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

    # Dynamically load all modules from app.modules
    load_modules(app, "app.modules", prefix="/api/v1")

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "Digital Mehandis", "version": "3.0.0"}

    return app

app = create_app()
