# Proposal: Grist Spreadsheet Integration

## Why
Quantity Surveying (QS) professionals rely heavily on spreadsheet logic for complex BOQ calculations, price adjustments, and tiered reporting. Building a custom UI for every possible calculation variation is inefficient. Grist-core provides an "Excel-like" relational database engine that can be embedded directly into Digital Mehandis, giving users the power of a full workbench without leaving the platform.

## What Changes
- **Embedded Workbench**: The current BOQ and Pricing views will be augmented/replaced by an embedded Grist workbook.
- **Bi-directional Sync**: Measurements taken in the PDF/DXF tool will be pushed to Grist. Changes in Grist (like unit rates) will be synchronized back to the main PostgreSQL database where necessary.
- **Infrastructure**: Introduction of a Grist service in Docker Compose.

## Capabilities
- `grist-powered-boq`: Full spreadsheet features (formulas, pivot tables) inside the app.
- `automated-data-entry`: Direct measurement-to-cell synchronization.
- `custom-reporting`: User-definable dashboards within the Grist environment.

## Impact
- **Backend**: New `grist_service.py` to manage the Grist REST API.
- **Database**: Add `grist_doc_id` to the `Project` model.
- **Frontend**: New `GristWorkbench` component using iframes for embedding.
