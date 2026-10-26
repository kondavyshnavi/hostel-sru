# AI-Assisted Smart Hostel and Residential Management Platform
> **SR University — Department of Computer Science & Engineering**  
> **Final Year / B.Tech CSE Capstone Project Demonstration**

A full-stack, enterprise-grade, role-based residential management platform engineered to automate student hostel administration, prevent room over-allocations, detect facility booking conflicts, eliminate paper gate passes with encrypted QR codes, and generate explainable rule-based operational recommendations with Pandas and Chart.js analytics.

---

## 🌟 Key System Capabilities

- **Role-Based Access Control (RBAC):** Backend-enforced authorization with custom decorators across 3 isolated user roles: **Admin**, **Resident Student**, and **Maintenance Staff**.
- **Room Allocation Engine:** Strict bed-level capacity validation preventing over-allocation, automated room-status synchronization, and room transfer/vacate workflows.
- **Simulated Payment Sandbox & Official Receipts:** Zero-exposure payment simulation (UPI, Debit Card, Net Banking) with instant printable receipt generation and unique transaction reference tracking.
- **Attendance & Gate QR Passes:** Daily attendance recording with unique `(resident_id, date)` database constraints preventing duplicate entries, dynamic daily gate QR codes, and self check-in verification.
- **Visitor Security Management:** Pre-registration of visitors, dynamic encrypted QR pass codes, administrative approval workflows, and security gate check-in/out timestamps.
- **Maintenance & Defect Tracking:** Multi-category issue reporting (Plumbing, Electrical, Wi-Fi, Housekeeping), staff assignment, work log tracking, and resolution date metrics.
- **Facility Reservation Conflict Detection:** Slot booking for study halls, seminar spaces, and sports arenas with collision prevention against overlapping slots.
- **Pandas Analytics & Chart.js Visualizations:** Real-time data processing calculating occupancy percentages, revenue inflows, category breakdowns, and utility consumption patterns.
- **Explainable Rule-Based AI Recommendations:** Multi-heuristic reasoning identifying occupancy bottlenecks, priority complaint escalations, recurring defect patterns, utility surges (>15%), and fee deadlines.

---

## 🏗️ Architecture & Technology Stack

```
                               ┌─────────────────────────────────────────┐
                               │           React 18 + Vite               │
                               │   Navy-Blue (#0F172A) & Teal (#0D9488)  │
                               │     Chart.js 4.4 + Lucide React         │
                               └────────────────────┬────────────────────┘
                                                    │
                                           REST API (Axios + JWT)
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │           Python Flask 3.1              │
                               │  - JWT Auth & Role Access Control       │
                               │  - 12 Modular Blueprint REST APIs       │
                               │  - Pandas 2.2 Analytical Engine         │
                               │  - QR Code Generator (Python qrcode)    │
                               └────────────────────┬────────────────────┘
                                                    │
                                        SQLAlchemy 2.0 ORM / PyMySQL
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │           MySQL 8.0 / SQLite            │
                               │     16 Normalized Relational Tables     │
                               │     Cascades, Foreign Keys, Unique Keys │
                               └─────────────────────────────────────────┘
```

---

## 🗄️ Normalized Database Schema (16 Tables)

| # | Table Name | Purpose & Critical Constraints |
|---|---|---|
| 1 | `users` | User credentials, password hash, role (`admin`, `resident`, `staff`), account status. |
| 2 | `residents` | Comprehensive student profile: enrollment number (unique), emergency contacts, branch, year. |
| 3 | `hostels` | Hostel blocks (Boys, Girls, Co-ed), floors, wardens, contact info. |
| 4 | `rooms` | Room number, floor, room type (Single, Double, Triple, Quad), capacity, base fee, status. |
| 5 | `room_allocations` | Active bed allocations, date range, transfer logs with over-allocation prevention. |
| 6 | `fees` | Semester fees, mess fees, maintenance charges, due dates, paid/overdue status. |
| 7 | `payments` | Transaction references, receipt numbers (`RCP-YYYYMM-XXXXX`), payment modes (UPI, Card). |
| 8 | `attendance` | Daily attendance with `UNIQUE(resident_id, date)` constraint preventing duplicate entries. |
| 9 | `visitors` | Visitor pass requests, security pass codes, QR code image data, check-in/out timestamps. |
| 10 | `maintenance_requests` | Defect reports, priority (`low`, `medium`, `high`, `emergency`), assigned staff, work notes. |
| 11 | `facilities` | Campus facilities (Digital Study Center, Badminton Court, Seminar Hall, Gym). |
| 12 | `facility_reservations` | Slot bookings with strict overlap validation preventing collision on approved slots. |
| 13 | `notifications` | In-app notification messages dispatched upon allocations, approvals, and fees. |
| 14 | `announcements` | Campus circulars and urgent notices broadcast to residents or staff. |
| 15 | `utility_records` | Electricity (kWh, cost) and water (liters, cost) sub-meter records by billing month. |
| 16 | `audit_logs` | Security and administrative audit trail of all sensitive operations with IP logging. |

---

## 🔑 Pre-Configured Demo Accounts

For quick university demonstration, you can log in with one click on the login screen or use the following credentials:

| Role | Username | Password | Dashboard Features |
|---|---|---|---|
| **Administrator** | `admin` | `Admin@123` | Full control: Residents, Rooms, Allocations, Invoices, Approvals, Analytics, AI Recommendations. |
| **Resident Student** | `rahul_sharma` | `Student@123` | My Room, Attendance Self Check-in, Fee Sandbox & Receipts, Lodge Complaints, Reserve Facilities. |
| **Resident Student** | `sneha_reddy` | `Student@123` | Female Hostel Profile (Block C), Fee Payment History, Visitor Gate Pass Request. |
| **Maintenance Staff** | `staff_rajesh` | `Staff@123` | Assigned Complaints, Work Diagnostics & Notes, Resolution Status Updates, Sub-meter Readings. |

---

## 🚀 Quick Start Guide (Windows PowerShell)

### Prerequisites
- **Python 3.10+** (Tested on Python 3.13)
- **Node.js 18+** (Tested on Node.js v24)
- **MySQL Server 8.0** (Optional: SQLite zero-config mode runs out-of-the-box)

### Step 1: Backend Setup
Open a PowerShell terminal and run:
```powershell
# Navigate to backend folder
cd "c:\Users\VYSHNAVI KONDA\OneDrive\Desktop\hostel sru\backend"

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# (Optional: install dependencies if creating new venv)
pip install -r requirements.txt

# Initialize database schema and load realistic university seed data
python seed.py

# Launch the Flask REST API server
python app.py
```
> The REST backend starts on `http://localhost:5000` (Health check: `http://localhost:5000/api/health`).

---

### Step 2: Frontend Setup
Open a **second** PowerShell terminal and run:
```powershell
# Navigate to frontend folder
cd "c:\Users\VYSHNAVI KONDA\OneDrive\Desktop\hostel sru\frontend"

# (Optional: install dependencies if not installed)
npm install

# Start the Vite development server
npm run dev
```
> The React dashboard opens at `http://localhost:3000`.

---

## 🧪 Automated Testing Suite

Execute the automated test suite covering authentication, RBAC, room allocations, over-capacity limits, duplicate attendance constraints, complaint workflows, and facility collision checks:

```powershell
cd "c:\Users\VYSHNAVI KONDA\OneDrive\Desktop\hostel sru\backend"
.\venv\Scripts\pytest -v
```

### Verified Test Cases:
- `test_auth.py`: JWT login, invalid password rejection, resident registration, 403 Forbidden enforcement on unauthorized routes.
- `test_rooms_allocation.py`: Bed allocation, duplicate active allocation prevention, room capacity limit enforcement.
- `test_attendance.py`: Daily check-in logging, duplicate `(resident, date)` 409 rejection, QR pass generation.
- `test_maintenance.py`: Resident lodging complaint, admin assigning staff, staff updating work notes and resolving complaint.
- `test_facilities.py`: Facility creation, slot booking, and overlapping time conflict prevention.
- `test_analytics.py`: Pandas aggregations and rule-based recommendation calculations.

---

## 🐳 Docker Deployment Guide (Beginner-Friendly)

The platform is fully containerized with Docker and Docker Compose, orchestrating **MySQL 8.0**, the **Flask Backend** (powered by Gunicorn WSGI), and the **React + Vite Frontend** (served via an optimized Nginx reverse proxy).

### Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for Windows/macOS, or Docker Engine + Docker Compose on Linux.
- Ensure Docker Desktop is launched and running.

### Step-by-Step Setup

1. **Clone or Navigate to the Project Root:**
   ```bash
   cd "hostel sru"
   ```

2. **Configure Environment Variables:**
   Copy the provided `.env.example` to create your local `.env` configuration file:
   ```bash
   cp .env.example .env
   # Or on Windows PowerShell:
   Copy-Item .env.example .env
   ```
   *(Optional)* Edit `.env` to customize your database password or secret keys. Strong default fallbacks are pre-configured for instant zero-friction local execution.

3. **Build and Launch All Containers:**
   ```bash
   docker compose up --build -d
   ```
   *This command:*
   - Spins up a persistent **MySQL 8.0** container and automatically initializes the database schema and seed records from `schema.sql` and `seed_data.sql`.
   - Compiles and packages the **Flask REST API** with Gunicorn into a secure container on port `5000`.
   - Compiles the **React + Vite frontend** into optimized production static assets and serves them with **Nginx** on port `80`.

4. **Verify Container Health:**
   ```bash
   docker compose ps
   ```
   You should see all three services (`sru_hostel_mysql`, `sru_hostel_backend`, `sru_hostel_frontend`) with status `Up` or `healthy`.

5. **Open the Application:**
   - **Frontend Application (Web Portal):** Open your browser and visit:  
     👉 [http://localhost](http://localhost) (or [http://localhost:80](http://localhost:80))
   - **Backend API Health Check:**  
     👉 [http://localhost:5000/api/health](http://localhost:5000/api/health)

6. **Default Login Credentials:**
   | Role | Username | Password |
   |---|---|---|
   | **Admin** | `admin` | `Admin@123` |
   | **Staff** | `staff_rajesh` or `staff_priya` | `Staff@123` |
   | **Resident** | `rahul_sharma` or `sneha_reddy` | `Student@123` |

7. **Stopping or Restarting Containers:**
   ```bash
   # View live logs
   docker compose logs -f

   # Stop all services without deleting data
   docker compose stop

   # Resume services
   docker compose start

   # Shut down services (preserves persistent MySQL and QR volumes)
   docker compose down

   # Complete reset (wipes volumes and re-initializes on next up)
   docker compose down -v
   ```

---

## 📡 REST API Reference

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/login` | `POST` | Public | Authenticates user and issues signed JWT bearer token. |
| `/api/auth/register` | `POST` | Public | Registers student resident account and creates student profile. |
| `/api/auth/me` | `GET` | Authenticated | Retrieves current logged-in user profile and allocation details. |
| `/api/residents` | `GET` | Admin/Staff | Search and filter residents by name, enrollment, hostel, or status. |
| `/api/residents` | `POST` | Admin | Registers new resident student with full academic record. |
| `/api/rooms` | `GET` | Authenticated | Lists all rooms with occupancy rates and status tags. |
| `/api/rooms/allocate` | `POST` | Admin | Allocates resident to room with strict bed capacity limit validation. |
| `/api/rooms/vacate` | `POST` | Admin | Vacates resident from room and auto-refreshes room vacancy status. |
| `/api/fees` | `GET` | Authenticated | Lists fee records (residents see only their own fees). |
| `/api/fees/pay` | `POST` | Authenticated | Payment sandbox simulation; generates receipt and clears balances. |
| `/api/fees/receipt/<rcp>` | `GET` | Authenticated | Generates structured printable receipt data. |
| `/api/attendance` | `GET` | Authenticated | Fetches attendance records filtered by date or resident. |
| `/api/attendance` | `POST` | Admin/Staff | Marks daily attendance with duplicate prevention check. |
| `/api/attendance/daily-qr` | `GET` | Authenticated | Generates dynamic 24-hour gate QR code token for scanning. |
| `/api/attendance/scan-qr` | `POST` | Resident | Resident scans QR token to verify self check-in. |
| `/api/visitors` | `POST` | Authenticated | Registers visitor; generates pass code and QR pass image. |
| `/api/visitors/<id>/approve`| `PUT` | Admin/Staff | Approves visitor pass request. |
| `/api/visitors/check-in` | `POST` | Admin/Staff | Records security gate check-in timestamp. |
| `/api/maintenance` | `POST` | Authenticated | Submits maintenance complaint with category and priority. |
| `/api/maintenance/<id>/assign`| `PUT` | Admin | Dispatches complaint to maintenance personnel. |
| `/api/maintenance/<id>/status`| `PUT` | Admin/Staff | Updates defect status (`in_progress`, `resolved`) with work notes. |
| `/api/facilities/reserve` | `POST` | Authenticated | Requests slot reservation; detects and rejects overlapping bookings. |
| `/api/facilities/reservations/<id>/status` | `PUT` | Admin | Approves or rejects facility booking slot. |
| `/api/analytics/overview` | `GET` | Authenticated | Calculates live occupancy, revenue, and defect resolution KPIs. |
| `/api/analytics/occupancy`| `GET` | Authenticated | Pandas breakdown of capacity and occupancy by hostel block. |
| `/api/analytics/fees` | `GET` | Authenticated | Pandas revenue inflows and monthly collection trends. |
| `/api/recommendations` | `GET` | Authenticated | Generates explainable, rule-based operational recommendations. |
| `/api/utilities` | `POST` | Admin/Staff | Logs monthly power (kWh) and water (liters) sub-meter metrics. |
| `/api/announcements` | `POST` | Admin | Publishes campus announcement and broadcasts in-app alerts. |

---

## 🎓 College Demonstration Script (5-Minute Walkthrough)

1. **Login & Role-Based Security:**
   - Click the **Admin** quick-login button on the login screen.
   - Show the Executive Admin Dashboard with real-time statistics computed live from database records.
2. **Room Allocation & Capacity Prevention:**
   - Navigate to **Rooms & Allocations**. Show how Room A-101 has 1/2 occupants.
   - Click **Allocate** to place unallocated student `Karthik Rao` into Room A-101.
   - Demonstrate that the room now dynamically marks as **Fully Occupied** and prevents any 3rd student from being placed into it.
3. **Smart Analytics & Pandas Processing:**
   - Navigate to **Smart Analytics**. Show interactive Chart.js charts: Occupancy by hostel wing, Monthly fee collections, and Utility consumption.
4. **AI-Assisted Operational Recommendations:**
   - Navigate to **AI Recommendations**. Explain the 6 rule-based heuristic modules:
     - Identification of high-occupancy hostel wings.
     - Automated matching of unallocated students to available vacancy.
     - Urgent escalation for overdue repair complaints.
     - Anomaly detection for power surges (>15%).
5. **Resident Portal Experience:**
   - Logout and click **Resident** (`rahul_sharma`).
   - Show personal allocated room and attendance rate.
   - Click **View Attendance QR** to display the QR gate pass.
   - Click **Lodge Complaint** or **Book Facility** to show resident self-service workflows.
6. **Simulated Payment Sandbox & Official Receipt:**
   - Go to **My Fees & Payments**. Click **Pay** on a pending fee invoice.
   - Simulate a UPI/Card payment and view the generated printable official fee receipt with university branding!

---
© 2026 Department of Computer Science & Engineering, SR University. All rights reserved.
