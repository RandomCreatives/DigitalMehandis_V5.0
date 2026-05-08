# Contributing to EthioQS

Thank you for your interest in contributing! EthioQS is an open-source project under GNU GPL v3.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ethioqs.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `cd backend && pytest`
6. Commit: `git commit -m "feat: describe your change"`
7. Push and open a Pull Request

## Branch Naming

- `feature/` — new features
- `fix/` — bug fixes
- `docs/` — documentation only
- `refactor/` — code refactoring

## Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `test:` adding tests
- `chore:` maintenance

## Code Style

**Backend (Python)**
- Follow PEP 8
- Use type hints everywhere
- Write docstrings for public functions
- Run `ruff check .` before committing

**Frontend (TypeScript)**
- Use functional components with hooks
- Keep components small and focused
- Use Tailwind utility classes

## Reporting Issues

Use the GitHub issue templates:
- Bug Report: describe steps to reproduce, expected vs actual behavior
- Feature Request: describe the use case and proposed solution

## Code of Conduct

Be respectful and inclusive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
