# Design: Grist Integration Architecture

## Context
Grist will serve as the primary calculation engine for BOQs and Pricing. Neon (PostgreSQL) remains the source of truth for project metadata and raw quantity suggestions.

## Data Flow
1. **Project Creation**: Backend calls Grist API to create a new doc from a "Master Template" and stores the `docId`.
2. **Measurement Capture**: When a measurement is approved in `SuggestionsPage`, the backend:
   - Saves to Neon.
   - Pushes a record to the corresponding Grist table.
3. **User Interaction**: User edits rates or notes in the embedded Grist iframe.
4. **Sync (On Demand)**: Main totals and rates can be fetched from Grist API to update project summaries in the custom UI.

## Authentication
Initially, we will use a "Single User / Admin API Key" approach for the prototype to avoid complex OIDC/SSO setup. Grist will be configured to support anonymous access or a shared team account for the embedded views.

## Infrastructure
`docker-compose.grist.yml` will define:
- Image: `gristlabs/grist:latest`
- Management DB: PostgreSQL (shared with main app or separate schema)
- Persist: Local volume for `.grist` files.

## Grist Template Schema
- **Table: BOQ_Items**
  - Columns: ItemNo, Description, Unit, Quantity, DirectCost, TotalAmount, Notes.
- **Table: Measurements**
  - Columns: SourceID, DrawingLabel, Value, Unit, Timestamp.
