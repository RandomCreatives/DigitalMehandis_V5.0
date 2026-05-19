## Context

The current application uses SQLite via `aiosqlite`. While convenient for initial setup, Phase 2 features like DXF processing and increased data complexity benefit from PostgreSQL's robust features and performance.

## Goals / Non-Goals

**Goals:**
- Provide a standardized PostgreSQL 16 environment via Docker Compose.
- Update the backend to use `asyncpg` for PostgreSQL connectivity.
- Maintain compatibility with existing SQLAlchemy models.

**Non-Goals:**
- Migrating existing local SQLite data to PostgreSQL (a fresh start is acceptable for dev).
- Performance tuning of PostgreSQL parameters.

## Decisions

- **Containerization**: Use the official `postgres:16-alpine` image in `docker-compose.yml` for consistency across developer machines.
- **Driver**: Continue using `SQLAlchemy` with the `asyncpg` driver, as it is already referenced in the project's memory and is the standard for async FastAPI/PostgreSQL apps.
- **Environment Variables**: Use `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` in `.env` to configure the container and the application connection string.

## Risks / Trade-offs

- **[Risk] Migration failures on PostgreSQL** → [Mitigation] Test all Alembic migrations against a clean PostgreSQL instance before finalizing.
- **[Risk] Resource usage** → [Mitigation] PostgreSQL container is lightweight, but developers with very low RAM might see an impact.
