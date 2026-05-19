## Phase 1: Core Refactoring

- [ ] 1.1 Implement `app.core.modules.loader` for dynamic router registration.
- [ ] 1.2 Migrate existing features (BBS, BOQ, Projects) to the `app.modules/` structure.
- [ ] 1.3 Update `main.py` to use the new loader.

## Phase 2: AI & Semantic Search

- [ ] 2.1 Implement `AIService` with provider factory (Anthropic/OpenAI).
- [ ] 2.2 Setup LanceDB for embedded vector storage.
- [ ] 2.3 Create embeddings for the Ethiopian National Rate Library.
- [ ] 2.4 Implement `/api/v1/ai/match-rate` endpoint.

## Phase 3: Advanced QTO & Data Pipeline

- [ ] 3.1 Define the `CanonicalQuantity` Pydantic model for all takeoff sources.
- [ ] 3.2 Refactor DXF parser to output CanonicalQuantities.
- [ ] 3.3 Implement "Group by Layer/Type" in the takeoff explorer.

## Phase 4: Professional UI

- [ ] 4.1 Integrate AG Grid for the BOQ Management interface.
- [ ] 4.2 Implement real-time "Geometry Link" badges in the BOQ rows.
- [ ] 4.3 Add a global "AI Command Bar" (Cmd+K) for quick actions.
