# Digital Mehandis test 005
# EthioQS — Ethiopian Quantity Surveying Tool

Free, open-source quantity surveying tool for Ethiopian construction professionals, students, and contractors.

## Features (Phase 1)
- Upload and view PDF drawings
- Manual take-off with measurement tools
- Bill of Quantities (BOQ) in Ethiopian MoUDC format
- Bar Bending Schedule (BBS) with automatic calculations
- Substructure / Superstructure separation
- Export to Excel and PDF
- Pre-loaded Ethiopian material rate database

## Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, ShadCN UI, Fabric.js, PDF.js
- **Backend**: FastAPI (Python 3.11+), PostgreSQL 14+, SQLAlchemy 2.0
- **Auth**: JWT (access + refresh tokens)
- **Export**: SheetJS (Excel), jsPDF (PDF)

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### With Docker
```bash
docker-compose up --build
```

### Manual Setup

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your values
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local  # Fill in your values
npm run dev
```

## License
GNU GPL v3 — see [LICENSE](LICENSE)

## Contributing
See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
