"""
EthioQS — Ethiopian Quantity Surveying Tool

EthioQS is a free, open-source quantity surveying tool designed for Ethiopian
construction professionals, students, and contractors. It facilitates the
entire quantity surveying workflow, from drawing management to Bill of
Quantities (BOQ) generation.

Project Status: Phase 2 — Drawing-Aware QS & Federation Foundation

Key Features:
- Drawing Management: Upload and view PDF and DXF drawings.
- Take-off: Manual measurement tools and drawing-aware entity extraction.
- BOQ Generation: Automatic assembly of BOQs in Ethiopian MoUDC format.
- BBS (Bar Bending Schedule): Automatic calculations for reinforcement.
- Federation: Synchronization of quantities from multiple sources (manual, drawings).
- Audit Logging: Traceability of all major project actions.
- Export: Generate professional Excel and PDF reports.

Tech Stack:
- Frontend: Next.js 14, Tailwind CSS, ShadCN UI, Fabric.js, PDF.js
- Backend: FastAPI (Python 3.11+), PostgreSQL 14+, SQLAlchemy 2.0
- Authentication: JWT (Access & Refresh tokens via httpOnly cookies)

Backend Package Structure:
- app.api: REST API endpoints organized by version and domain.
- app.core: Centralized configuration, security, and constants.
- app.db: Database models (SQLAlchemy) and session management.
- app.schemas: Pydantic models for request validation and response serialization.
- app.services: Complex business logic and service-layer abstractions (e.g., Federation).
- app.utils: Utility functions for calculations, file handling, and exports.

License: GNU GPL v3
"""

__version__ = "2.0.0"
