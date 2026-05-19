## Context

The Digital Mehandis vision requires a shift from a "tool" to a "platform". OpenConstructionERP (OCE) provides a blueprint for this via its 88+ modules and AI-driven workflows.

## Goals / Non-Goals

**Goals:**
- Implement a module system where each module contains its own routes, models, and services.
- Define a canonical "QuantityData" schema to allow interchange between PDF, DXF, and BIM sources.
- Setup a semantic search infrastructure using embeddings.

**Non-Goals:**
- Implementing all 88 modules immediately.
- Rewriting the entire frontend in one go (gradual migration).

## Decisions

- **Module Discovery**: Use a `module_loader.py` that scans the `backend/app/modules` directory and auto-registers APIRouters.
- **AI Integration**: Implement a generic `AIService` provider interface that supports Anthropic, OpenAI, and DeepSeek via a unified API.
- **Database**: Retain PostgreSQL 16 as the primary OLTP store, but introduce LanceDB (embedded) for vector embeddings of regional rate libraries.
- **Frontend State**: Shift to a more robust state management pattern to handle the complex "Linked Geometry" views where model selection updates the BOQ in real-time.

## Architecture Sketch

```
backend/
├── app/
│   ├── core/          # System fundamentals
│   ├── modules/       # Pluggable features
│   │   ├── boq/
│   │   ├── ai_agent/
│   │   └── takeoff/
│   └── main.py        # Module discovery & registration
```

## Risks / Trade-offs

- **[Risk] Complexity** → The system becomes harder for new developers to understand. [Mitigation] Strict coding standards and auto-documentation.
- **[Risk] Performance** → Loading many modules might slow down startup. [Mitigation] Lazy loading where possible.
