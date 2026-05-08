# EthioQS User Guide

## Getting Started

### 1. Create an Account
Go to the app URL → click **Get Started Free** → fill in your details → **Create Account**.

### 2. Create a Project
From the dashboard → **New Project** → enter:
- Project name
- Location (Ethiopian city)
- Code of practice (default: EBCS)
- Click **Create Project**

---

## Uploading Drawings

1. Open your project → click **Drawings**
2. Select the drawing category (Architectural / Structural / Electrical / Sanitary)
3. Drag & drop your PDF files or click to browse
4. Files appear in the list once uploaded
5. Click the eye icon to view a drawing in the browser

**Supported formats:** PDF only (Phase 1)
**Max file size:** 100 MB per file

---

## Take-off Sheet

1. Open your project → click **Take-off**
2. Switch between **Substructure** and **Superstructure** tabs
3. For each item:
   - Enter description (e.g. "C-25 Concrete")
   - Select unit (m³, m², m, Nr, kg, etc.)
   - Enter quantity
   - Click **Add**
4. Edit quantities inline by clicking the quantity field
5. Delete items with the trash icon

---

## Generating BOQ

1. Open your project → click **BOQ**
2. Select section: Combined / Substructure / Superstructure
3. Click **Generate BOQ**
4. The system matches your take-off items to the pre-loaded Ethiopian rate database
5. Export to **Excel** or **PDF** using the buttons

**Note:** Items without a matching rate are skipped. Add custom rates via the API if needed.

---

## Bar Bending Schedule (BBS)

1. Open your project → click **BBS**
2. Select section (Substructure / Superstructure)
3. For each bar, fill in:
   - Member name (e.g. "Footing F1")
   - Bar diameter (6–32mm)
   - Bar shape (Straight, L-Shape, Hook, U-Shape, Spiral)
   - Quantity, clear length, cover, hook length
   - Standard (EBCS 3 or BS 8666)
4. The **live preview** shows cutting length, weight, and lap length before saving
5. Click **Add Bar** to save
6. View the **Cutting List** for supplier batch-cutting orders
7. Export to **Excel** (includes BBS sheet + Cutting List sheet)

### BBS Calculation Reference

| Shape | Formula |
|-------|---------|
| Straight | Clear length + 2 × cover |
| L-Shape | 2 × clear length − 2d + 2 × cover |
| Hook | Clear length + hook length + 2 × cover |
| U-Shape | 2 × clear length + hook length − 2d + 2 × cover |
| Spiral | 2 × clear length − 4d |

Lap length: **50d** (EBCS 3 tension) or **40d** (BS 8666)

---

## Exporting

| Format | BOQ | BBS |
|--------|-----|-----|
| Excel (.xlsx) | ✅ | ✅ (BBS + Cutting List sheets) |
| PDF | ✅ | Coming in Phase 2 |

---

## Rate Database

EthioQS comes pre-loaded with Ethiopian construction rates including:
- Excavation & earthworks
- C-25, C-30, C-20 concrete
- Reinforcement steel (all diameters)
- Hollow block walls
- Formwork
- Plastering, painting, tiling
- Roofing (EGA sheets, timber trusses)
- Doors & windows

Rates are based on EBCS 2023 and Addis Ababa market surveys (2024).
