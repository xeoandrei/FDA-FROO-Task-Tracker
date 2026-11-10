# Dispatch Slip Per-Target Dates, PDF-Only Controls & Annex A Cleanup

Enhances the Dispatch Slip creation and preview workflow to support per-target date ranges (single dates or start-to-end ranges across multiple targets), streamlines export controls to **Extract to PDF** only, and removes the **Field Compliance Notes** footer from Annex A.

## User Review & Critical Decisions

> [!IMPORTANT]
> Summary of confirmed design choices from your answers:

- **Per-Target Date Input (`Targeted Date`)**: Each Target card in **Create Dispatch Slip** (`Target #1`, `Target #2`, etc.) includes **Establishment Name**, **Specific Complete Address / Location**, and **Targeted Date** with **Start Date** and optional **End Date** pickers.
- **Smart Consolidated Date Formatting & Annex A Display**:
  - All target dates/ranges automatically combine into a clean, official date string on Page 1 (`"to be dispatched on 6, 10–13, & 17–20 March 2026"` when in the same month/year, or full month-day ranges across months) and replace the standalone top-level Dispatch Date input.
  - On **Annex A (Page 2)**, each row in the schedule table displays that specific target's **Targeted Date** alongside its Establishment, Location, and Target Scope.
- **Streamlined Export Controls**: Removes both the **Print / Native PDF** top button and the **Print Slip** bottom button from the preview modal, leaving **Extract to PDF** as the single primary export action.
- **Annex A Footer Removal**: Removes the **Field Compliance Notes** block on Annex A so the itemized table has maximum vertical space above the signatures.

---

## 1. Overview & Core Concept

- **What It Does**: Allows FROO officers to assign specific target dates or date ranges to each target establishment in a dispatch slip, automatically formats multi-date strings (e.g., `"6, 10-13, & 17-20 March 2026"`) for the main dispatch authorization line, itemizes per-target dates in Annex A, and simplifies the preview interface.
- **Target Audience / Persona**: FROO field inspectors, Regional Supervisors, Cluster Directors, and ODDG-FROO Administrators generating multi-day or multi-establishment dispatch orders.
- **Key Value**: Eliminates manual formatting of complex multi-day schedules while ensuring MySQL persistence and official A4 PDF output remain completely error-free.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Create / Edit Dispatch Slip Modal**:
     - Top row displays the auto-generated **CTRL No.** and a live preview of the consolidated **Dispatch Schedule** derived from the targets below.
     - Under **Target Establishments, Locations & Dates**, each **Target #N** card contains:
       1. **Establishment / Facility Name**
       2. **Specific Complete Address / Location**
       3. **Targeted Date**: **Start Date** picker (`required`) + **End Date (Optional)** picker (for multi-day ranges like `10–13 March 2026`).
     - Clicking **+ Add Another Target** adds a new target card with its own establishment, location, and start/end date pickers.
  2. **Dispatch Slip Preview Modal**:
     - Header and footer action bars show only **Edit** (when applicable), **Extract to PDF**, and **Close** (removing **Print / Native PDF** and **Print Slip**).
     - **Page 1**: Displays the consolidated schedule string on the `"to be dispatched on ___"` line.
     - **Page 2 (Annex A)**: Displays a dedicated **Targeted Date** column in the schedule table and removes the **Field Compliance Notes** block above the Conforme/Recommending signatures.
- **Visual Identity & Theme**:
  - Retains the official FDA emerald (`#056839`) and neutral slate modal chrome with high-contrast tabular numerals (`tabular-nums`) for dates and control numbers, and Times New Roman serif typography inside the A4 letterhead preview.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Automatic Multi-Date & Range Consolidation**
  - *Chosen Approach*: Group target dates chronologically; format single days (`6`) and start-to-end ranges (`10-13`, `17-20`) within the same month and year into `"6, 10-13, & 17-20 March 2026"` (or `"March 28-30 & April 2-4, 2026"` when spanning months).
  - *Why*: Matches official FDA FROO dispatch phrasing automatically without requiring manual typing.
- **Decision 2: Non-Destructive MySQL Column Migration for Multi-Date Strings**
  - *Chosen Approach*: Automatically migrate `dispatch_slips.dispatch_date` to `VARCHAR(255)` and add `target_date VARCHAR(150) NULL` to `dispatch_slip_destinations` on server startup.
  - *Why*: Ensures multi-date strings (such as `"6, 10-13, & 17-20 March 2026"`) and per-target date labels save cleanly in MySQL (both locally in Docker/Workbench and on Railway) without `DATE` type truncation errors.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      Create Dispatch Slip Modal                         │
│  Target #1: Establishment + Location + Start Date / Optional End Date   │
│  Target #2: Establishment + Location + Start Date / Optional End Date   │
│         │                                                               │
│         ▼                                                               │
│  Smart Date Formatter ──► Consolidated String:                          │
│                           "6, 10-13, & 17-20 March 2026"                │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                   ┌────────────────┴────────────────┐
                   ▼                                 ▼
┌─────────────────────────────────────┐ ┌─────────────────────────────────┐
│     Backend API & MySQL (`froo_db`) │ │   Dispatch Slip Preview & PDF   │
│ • `dispatch_slips.dispatch_date`    │ │ • Page 1: Consolidated Date     │
│   (VARCHAR(255))                    │ │ • Page 2 (Annex A): Per-Target  │
│ • `dispatch_slip_destinations`      │ │   Date column; no Compliance    │
│   `target_date` (VARCHAR(150))      │ │   Notes footer                  │
│                                     │ │ • Controls: Extract to PDF only │
└─────────────────────────────────────┘ └─────────────────────────────────┘
```

### Interactive Component & State Mapping
- **Target List State**: Manages synchronized arrays of target entries (`establishment`, `location`, `startDate`, `endDate`), formatting each target's date label (e.g., `"10-13 March 2026"`) and computing the combined `dispatchDate` summary string.
- **Database & API Persistence**: Sends `targetDates` alongside `establishments` and `locations` in `POST /api/tasks/:taskId/dispatches`, storing each target's formatted date in `dispatch_slip_destinations.target_date` and returning `targetDates` when fetching tasks.
- **Preview & PDF Export**: Renders only the **Extract to PDF** action (removing native browser print triggers) and updates Annex A's table columns to `No. | Establishment / Entity | Physical Location / Address | Targeted Date | Target Scope` with the footer compliance notes removed.
