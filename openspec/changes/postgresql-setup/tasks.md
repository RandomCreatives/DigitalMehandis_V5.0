## 1. Infrastructure Setup

- [ ] 1.1 Add PostgreSQL service to `docker-compose.yml`
- [ ] 1.2 Update `.env.example` with PostgreSQL defaults
- [ ] 1.3 Add `psycopg2-binary` or `asyncpg` to `backend/requirements.txt` (if missing)

## 2. Backend Configuration

- [ ] 2.1 Update `backend/app/core/config.py` to handle PostgreSQL connection string
- [ ] 2.2 Refine `backend/app/db/session.py` for PostgreSQL/asyncpg specific requirements

## 3. Migration and Verification

- [ ] 3.1 Run `alembic upgrade head` against the new PostgreSQL instance
- [ ] 3.2 Verify all tables are created correctly in PostgreSQL
- [ ] 3.3 Run backend test suite to ensure functionality remains intact
