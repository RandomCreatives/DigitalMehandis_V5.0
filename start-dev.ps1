# EthioQS — Local Development Startup Script
# Run from the repo root: .\start-dev.ps1

Write-Host "=== EthioQS Dev Startup ===" -ForegroundColor Cyan

# ── Backend ───────────────────────────────────────────────────────────────────
Write-Host "`n[1/4] Setting up Python virtual environment..." -ForegroundColor Yellow
Set-Location backend

if (-not (Test-Path "venv")) {
    python -m venv venv
}

# Activate venv
& ".\venv\Scripts\Activate.ps1"

Write-Host "[2/4] Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet

Write-Host "[3/4] Running database migrations..." -ForegroundColor Yellow
alembic upgrade head

Write-Host "[4/4] Seeding Ethiopian rate database..." -ForegroundColor Yellow
python -m app.utils.seed_rates

Write-Host "`n✅ Backend ready. Starting API server..." -ForegroundColor Green
Write-Host "   API docs: http://localhost:8000/api/docs" -ForegroundColor Cyan

# Start backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

Set-Location ..

# ── Frontend ──────────────────────────────────────────────────────────────────
Write-Host "`n[Frontend] Installing npm packages..." -ForegroundColor Yellow
Set-Location frontend
npm install --silent

Write-Host "`n✅ Frontend ready. Starting Next.js dev server..." -ForegroundColor Green
Write-Host "   App: http://localhost:3000" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Set-Location ..

Write-Host "`n=== Both servers starting in separate windows ===" -ForegroundColor Green
Write-Host "   Frontend → http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend  → http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host "`nPress any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
