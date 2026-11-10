# Cluster Director Registration & Office Foreign Key Fix

Resolves the `ER_NO_REFERENCED_ROW_2` (`fk_users_office`) MySQL foreign key constraint error when creating Cluster Director accounts for **Mindanao East Cluster (MEC)**, **Mindanao West Cluster (MWC)**, or **Visayas Cluster (VC)**.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Root Cause Identified**: The frontend defines 5 FROO Clusters (`NLC`, `SLC`, `VC`, `MEC` — *Mindanao East Cluster (MEC)*, and `MWC` — *Mindanao West Cluster (MWC)*), whereas the MySQL `clusters` and `offices` tables only seeded `NLC`, `SLC`, `VBC`, and `MOC`. When creating a Mindanao East Cluster Director, MySQL rejected `'Mindanao East Cluster (MEC)'` because that `office_code` did not exist in the `offices` table.

- **Database & Seed Alignment**: Add `VC`, `MEC` (*Mindanao East Cluster*), and `MWC` (*Mindanao West Cluster*) to the `clusters` and `offices` tables across the startup auto-seeder, schema SQL files, and fallback store.
- **Self-Healing Office Lookup on User Creation**: Enhance the user creation endpoint so that if a valid FROO cluster/office is submitted before a database re-seed, the server automatically ensures the parent cluster and office records exist in `clusters` and `offices` prior to inserting into `users`.

---

## 1. Overview & Core Concept

- **What It Does**: Synchronizes the backend MySQL `clusters` and `offices` reference tables with all 5 frontend FROO Cluster definitions (`NLC`, `SLC`, `VC`, `MEC`, `MWC`) and adds automatic office/cluster upsert protection during user creation.
- **Target Audience / Persona**: Superadministrators and ODDG-FROO Administrators creating Cluster Director and regional personnel accounts.
- **Key Value**: Guarantees that creating Cluster Director accounts for **Mindanao East Cluster (MEC)**, **Mindanao West Cluster (MWC)**, **Visayas Cluster (VC)**, **North Luzon Cluster (NLC)**, and **South Luzon Cluster (SLC)** succeeds in both local Docker/MySQL Workbench and Railway deployments without foreign key errors.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. Administrator opens **User & Access Management** ➔ **Add New Staff Account**.
  2. Selects Position **Cluster Director** and Cluster **Mindanao East Cluster (MEC)** (or **Mindanao West Cluster (MWC)** / **Visayas Cluster (VC)**).
  3. Submits the form; the backend resolves the matching `office_code` and `cluster_code` in MySQL, creates the active `CLUSTER_DIRECTOR` record, and logs the event in `system_audit_logs`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Preserve Existing `VBC` / `MOC` Codes While Adding `VC`, `MEC`, and `MWC`**
  - *Chosen Approach*: Keep existing `VBC` and `MOC` rows intact (`INSERT IGNORE`) while adding `VC`, `MEC`, `MWC` and their corresponding office entries (`Mindanao East Cluster (MEC)`, `Mindanao West Cluster (MWC)`, `MEC`, `MWC`, `VC`).
  - *Why*: Ensures backward compatibility with any existing database records while fully supporting the 5-cluster structure used by the UI.
- **Decision 2: Auto-Ensure Office Reference in `POST /api/users`**
  - *Chosen Approach*: Before inserting a new user row, if the resolved `office_code` is not yet present in `offices` (for example, on an already-running local MySQL instance prior to restart), automatically `INSERT IGNORE` the missing cluster/office row.
  - *Why*: Eliminates any possibility of `ER_NO_REFERENCED_ROW_2` even on existing databases.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```text
┌──────────────────────────────────────────────────────────────────────┐
│                   User Management Modal (Frontend)                   │
│  Position: Cluster Director                                          │
│  Cluster : MEC -> Office: "Mindanao East Cluster (MEC)"              │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ POST /api/users
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 User Creation Route (Express Backend)                │
│  1. Lookup office_code / office_name in `offices`                    │
│  2. If Cluster office not yet in `offices`, auto-insert into         │
│     `clusters` & `offices` (INSERT IGNORE)                           │
│  3. INSERT INTO `users` with verified `office_code` & `cluster_code` │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       MySQL Database (`froo_db`)                     │
│  • `clusters`: NLC, SLC, VC, VBC, MEC, MWC, MOC                      │
│  • `offices` : Includes "Mindanao East Cluster (MEC)" & "MEC"        │
│                and "Mindanao West Cluster (MWC)" & "MWC"             │
└──────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping
- **Startup Auto-Seeder**: Runs `INSERT IGNORE` on server boot to populate `VC`, `MEC`, and `MWC` in `clusters` and `offices`, and updates Regional Field Office cluster mappings (`Region 10`, `Region 11`, `Region 13` ➔ `MEC`; `Region 9`, `Region 12 / BARMM` ➔ `MWC`).
- **Admin User Creation Endpoint**: Validates and resolves `office_code` and `cluster_code`, ensuring the foreign key target exists in `offices` before executing `INSERT INTO users`.
- **SQL Schema Scripts**: Updates the SQL schema files so fresh MySQL Workbench / Docker imports include `MEC`, `MWC`, and `VC` out of the box.
