## ADDED Requirements

### Requirement: Use PostgreSQL for Local Development
The system SHALL use a PostgreSQL 16 database for all data storage in the local development environment.

#### Scenario: Database connection on startup
- **WHEN** the backend application starts
- **THEN** it SHALL establish a connection to the PostgreSQL database using the `DATABASE_URL` environment variable.

### Requirement: Docker-based Database Instance
The project SHALL provide a `docker-compose.yml` service that initializes a PostgreSQL 16 instance.

#### Scenario: Start infrastructure
- **WHEN** the developer runs `docker-compose up`
- **THEN** a PostgreSQL 16 container SHALL be started and initialized with the database name and credentials specified in the environment.
