## Why

The current EthioQS architecture is monolithic and focused primarily on manual workflows. To scale into a comprehensive construction ERP platform (Digital Mehandis) similar to OpenConstructionERP, we need to transition towards a modular architecture. This will allow us to support advanced features like AI-powered estimation, multi-format CAD/BIM takeoff, and regional cost databases without cluttering the core codebase.

## What Changes

- **Modular Architecture**: Implementation of an auto-discovery module system where features like "BBS", "BOQ", or "AI-Estimate" are independent, pluggable units.
- **AI-First Workflows**: Integration of LLMs for semantic cost matching and automated quantity extraction from drawings and photos.
- **Advanced QTO Pipeline**: Moving from basic PDF manual takeoff to a unified data pipeline that can handle DWG, IFC, and PDF with consistent canonical geometry outputs.
- **Vector Search**: Implementation of vector-based semantic search for cost items (using LanceDB or Qdrant) to handle 55,000+ items efficiently.
- **Professional Data Grid**: Adopting high-performance data grids (like AG Grid) for the BOQ editor to handle large-scale projects with complex calculations.

## Capabilities

### New Capabilities
- `modular-core`: Dynamic loading of feature modules.
- `ai-estimation`: Natural language to BOQ generation.
- `semantic-search`: AI-powered cost item matching.
- `unified-qto`: Multi-format drawing processing.

### Modified Capabilities
- `boq-management`: Transition from static lists to a high-performance interactive grid.

## Impact

- `backend/app/main.py`: Will become a lightweight module loader.
- `backend/app/modules/`: New home for all domain logic (BBS, BOQ, etc.).
- `frontend/src/components/`: Migration to Shadcn + AG Grid for professional ERP feel.
- `docker-compose.yml`: Inclusion of vector database services (optional/embedded).
