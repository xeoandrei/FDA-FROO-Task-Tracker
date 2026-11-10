# FDA Philippines — FROO Operational Task & Field Monitoring System

An enterprise-grade web application designed for the **Food and Drug Administration (FDA) Philippines – Field Regulatory Operations Office (FROO)** to create, assign, monitor, and manage operational tasks, regulatory inspections, post-market surveillance (PMS), and official personnel dispatch orders across **ODDG-FROO**, **4 Cluster Offices**, **16 Regional Field Offices**, and **FDA Central Offices/Centers**.

---

## 📋 Table of Contents

1. [System Overview](#-system-overview)
2. [Key Features](#-key-features)
3. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
4. [Organizational Scope](#-organizational-scope)
5. [Tech Stack & Architecture](#-tech-stack--architecture)
6. [Database Schema (`froo_db`)](#-database-schema-froo_db)
7. [Local Setup Guide (VS Code + Docker + MySQL Workbench)](#-local-setup-guide-vs-code--docker--mysql-workbench)
8. [Cloud Deployment Guide (Railway.app)](#-cloud-deployment-guide-railwayapp)
9. [Environment Variables](#-environment-variables)
10. [Project Structure](#-project-structure)

---

## 🏛️ System Overview

The **FROO Task Tracker & Field Monitoring System** centralizes the tracking of regulatory directives, establishment inspections, post-market surveillance, administrative matters, and policy-related assignments across the Philippines. It enforces strict role-based permissions, official task acceptance workflows, real-time audit logging, and standardized **Personnel Dispatch Slip** generation and approval.

---

## ✨ Key Features

* **Operational Task Management**
  * Create and track tasks across categories (*Establishment Inspection*, *Post-Market Surveillance*, *Administrative / Directives*, *Policy Related Matters*, *Admin Matters*, *Special Assignment*, *Court Hearing / Legal*, *Inter-Agency Coordination*).
  * **14-Digit Document Tracking Number (DTN)** validation with an **N/A** option for internal or non-DTN tasks.
  * **Multi-Personnel Assignment** with real-time search filtering across registered FROO staff.
  * **Multi-Region / Office Selection** supporting simultaneous task assignment across multiple Regional Field Offices and Central Offices.
  * **Priority Levels** (*Normal* and *Urgent*) with dedicated separation between general task parameters and external field schedule/location details.

* **Official Task Receipt & Execution Workflow**
  * **3-Stage Lifecycle**: `Open` ➔ `In Progress` ➔ `Completed` (with automatic `Overdue` detection).
  * **Strict Receipt Authorization**: Assigned personnel or authorized regional supervisors formally **Receive & Accept** open tasks, recording an immutable timestamp and preventing duplicate acceptance or unauthorized status reversion.
  * **Activity Timeline**: Full chronological audit log of every status transition, progress note, and operational update per task.

* **Official FROO Personnel Dispatch Slip System**
  * Generate standardized **FDA FROO Personnel Dispatch Slips** linked directly to operational tasks.
  * Multi-destination support (Establishment Name & Location Address sequences), inspection purpose checkboxes, vehicle/driver assignment, and official signatory blocks.
  * **Two-Tier Approval Workflow**:
    * Standard Officer dispatches route to **Regional Supervisor / Cluster Director** approval.
    * Regional Supervisor / Cluster Director dispatches route to **ODDG-FROO Executive Approval**.
  * **High-Resolution PDF / Image Export**: Export official formatted dispatch slips for printing and physical filing.

* **Executive Analytics, Calendar & Regional Matrix**
  * **Task Board & Table Views** with multi-faceted filtering (Status, Priority, Category, Origin, Region/Office, and My Tasks / Action Required badges).
  * **Interactive Calendar View** for tracking due dates and scheduled field operations.
  * **Analytics Dashboard** displaying completion rates, regional workload distribution, and category breakdowns.
  * **System Audit Logs & User Directory Console** for Superadministrators and ODDG-FROO Admins to manage staff registrations, approvals, password resets, and security events.

---

## 🔐 Role-Based Access Control (RBAC)

| Role Code | Role Title | Hierarchy | Scope & Permissions |
| :--- | :--- | :---: | :--- |
| `SUPERADMIN` | **Super Administrator** | Level 1 | Full national visibility, system configuration, user management, task creation/deletion, and universal dispatch slip approval. |
| `ADMIN` | **ODDG-FROO Executive Admin** | Level 2 | National task creation, monitoring across all 16 Regional Offices, user directory management, and ODDG dispatch slip approval. |
| `CLUSTER_DIRECTOR` | **Cluster Director** | Level 3 | Supervisory oversight across all Regional Field Offices within their assigned Cluster (`NLC`, `SLC`, `VBC`, `MOC`), including dispatch approval. |
| `REGIONAL_SUPERVISOR` | **Regional Field Supervisor** | Level 4 | Manages tasks within their Regional Field Office, assigns regional personnel, and approves standard regional dispatch slips. |
| `STANDARD` | **Field Regulatory Operations Officer** | Level 5 | Receives and executes assigned tasks, logs progress updates, and drafts dispatch slips for supervisor approval (restricted from approving dispatches). |

---

## 🗺️ Organizational Scope

* **Central / Executive Offices**:
  * `ODDG-FROO` — Office of the Deputy Director General for Field Regulatory Operations Office
  * `FDA Centers` — FDA Product & Regulatory Centers
  * `LSSC` — Legal Services Support Center
  * `CSL` — Common Services Laboratory
  * `PPO` — Policy and Planning Office
* **4 Cluster Offices**:
  * **North Luzon Cluster (`NLC`)**: Region 1, Region 2, Region 3, CAR
  * **South Luzon Cluster (`SLC`)**: Region 4A (CALABARZON), Region 4B (MIMAROPA), Region 5, NCR
  * **Visayas Cluster (`VBC`)**: Region 6, Region 7, Region 8
  * **Mindanao Cluster (`MOC`)**: Region 9, Region 10, Region 11, Region 12 / BARMM, Region 13 (Caraga)
* **16 Regional Field Offices**:
  * NCR, CAR, Region 1, Region 2, Region 3, Region 4A, Region 4B, Region 5, Region 6, Region 7, Region 8, Region 9, Region 10, Region 11, Region 12 / BARMM, Region 13 (Caraga)

---

## 🛠️ Tech Stack & Architecture

* **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Vite
* **Backend**: Node.js (v20+), Express.js, TypeScript (`tsx`)
* **Database**: MySQL 8.0 (`mysql2/promise` connection pool with automatic schema bootstrapping and resilient in-memory fallback)
* **Authentication**: JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` password hashing
* **Document Export**: `jspdf` & `html-to-image`
* **Containerization & Cloud**: Docker Compose (`mysql:8.0`) & Railway.app / Render ready

---

## 🗄️ Database Schema (`froo_db`)

The MySQL database consists of **9 normalized relational tables** (defined in `froo_schema.sql` and auto-bootstrapped via `server/seed.ts`):

1. `clusters` — Master table of the 4 FROO geographical clusters.
2. `roles` — RBAC role definitions and dispatch approval flags.
3. `offices` — Central offices, cluster offices, and 16 regional field offices.
4. `users` — Registered FROO personnel, hashed credentials, roles, and office assignments.
5. `tasks` — Core operational tasks, DTN, multi-assignee list, multi-region scope, status, and timestamps.
6. `task_activity_logs` — Immutable chronological history of task actions and status updates.
7. `dispatch_slips` — Official travel/dispatch orders linked to tasks, purposes, team members, and signatory workflow status.
8. `dispatch_slip_destinations` — Ordered list of target establishments and addresses per dispatch slip.
9. `system_audit_logs` — System-wide security and administrative event logs.

---

## 💻 Local Setup Guide (VS Code + Docker + MySQL Workbench)

### Prerequisites
* **Node.js** (v20 LTS or newer)
* **Docker Desktop** (for local MySQL 8.0 container)
* **MySQL Workbench** (optional, for visual database inspection)

### 1. Clone the Repository & Install Dependencies
```bash
git clone <your-github-repo-url>
cd <your-repo-folder>
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Default local `.env` configuration for Docker MySQL:
```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=froo_user
DB_PASSWORD=froo_secret_password
DB_NAME=froo_db
JWT_SECRET=fda-froo-super-secret-jwt-key-2026
PORT=3000
```

### 3. Start the MySQL 8.0 Docker Container
```bash
docker compose up -d
```
*This starts a persistent MySQL 8.0 instance on host port `3307` and automatically executes `froo_schema.sql` on first initialization.*

### 4. Start the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ☁️ Cloud Deployment Guide (Railway.app)

This project is pre-configured for zero-hassle deployment on **Railway.app**:

1. Push this repository to **GitHub**.
2. Log in to **[Railway.app](https://railway.app)** and click **New Project** ➔ **Deploy from GitHub repo**.
3. In the same Railway project canvas, click **+ New** ➔ **Database** ➔ **Add MySQL**.
4. Open your **Web App** service ➔ **Variables** tab and add:
   * `MYSQL_URL` = `${{MySQL.MYSQL_URL}}`
   * `NODE_ENV` = `production`
   * `JWT_SECRET` = `<your-secure-random-secret>`
5. In the **Settings** tab of your Web App service:
   * **Build Command**: `npm run build`
   * **Start Command**: `npm start`
   * Under **Networking**, click **Generate Domain** (Port `3000`).
6. On first startup, the server automatically creates all 9 MySQL tables and seeds the baseline offices, clusters, roles, and Superadministrator account.

---

## 🔑 Environment Variables

| Variable | Description | Local Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port for the Express + Vite server | `3000` |
| `NODE_ENV` | Runtime mode (`development` or `production`) | `development` |
| `DB_HOST` | MySQL Hostname (or `MYSQLHOST` on Railway) | `127.0.0.1` |
| `DB_PORT` | MySQL Port (or `MYSQLPORT` on Railway) | `3307` |
| `DB_USER` | MySQL Username (or `MYSQLUSER` on Railway) | `froo_user` |
| `DB_PASSWORD` | MySQL Password (or `MYSQLPASSWORD` on Railway) | `froo_secret_password` |
| `DB_NAME` | MySQL Database Name (or `MYSQLDATABASE` on Railway) | `froo_db` |
| `MYSQL_URL` | Full MySQL Connection URI (used automatically on Railway) | *(Optional)* |
| `DB_SSL` | Enable SSL for external cloud MySQL (`true` / `false`) | `false` |
| `JWT_SECRET` | Secret key for signing authentication tokens | `fda-froo-jwt-secret` |

---

## 📁 Project Structure

```text
├── docker-compose.yml        # Local MySQL 8.0 container configuration (Port 3307)
├── froo_schema.sql           # Official non-destructive MySQL 8.0 schema & baseline seeds
├── server.ts                 # Unified full-stack Express + Vite production/dev server
├── server/
│   ├── auth.ts               # JWT middleware & bcrypt password utilities
│   ├── db.ts                 # MySQL connection pool + resilient in-memory fallback
│   ├── seed.ts               # Auto-schema bootstrapper & non-destructive column migrations
│   └── routes/               # Express REST API endpoints (auth, tasks, dispatches, users, logs)
└── src/
    ├── App.tsx               # Main application state, routing, & role-based workspace views
    ├── components/           # Modular UI components (Dashboard, TaskModals, DispatchSlip, etc.)
    ├── services/api.ts       # Frontend REST API client
    ├── utils/                # Regional authorization, RBAC helpers, & PDF export utilities
    └── types.ts              # TypeScript domain interfaces
```

---

## 📄 License & Attribution

Developed for the **Food and Drug Administration (FDA) Philippines — Field Regulatory Operations Office (FROO)**.  
All rights reserved.
