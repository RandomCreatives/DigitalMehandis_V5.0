## Why

The project currently uses SQLite for local development. To ensure environment parity and support robust concurrent operations needed for Phase 2 (e.g., drawing processing and multiple users), we need to transition to PostgreSQL 16 as the primary database for both local development and production.

## What Changes

- Transition from SQLite to PostgreSQL 16 for local development.
- Update Docker Compose configuration to include a PostgreSQL container.
- Update backend environment variables to point to the new PostgreSQL instance.
- Ensure all existing migrations are compatible with PostgreSQL.

## Capabilities

### New Capabilities
- `database-parity`: Ensures local development environment matches production-ready PostgreSQL setup.

### Modified Capabilities
- None

## Impact

- `backend/.env`: Database connection string will change.
- `docker-compose.yml`: Will include a new `db` service.
- `backend/app/db/session.py`: Connection logic might need refinement for `asyncpg`.
- Developer workflow: Requires running PostgreSQL (via Docker or locally).
