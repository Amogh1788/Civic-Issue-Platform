# CivicFix — Smart Civic Issue Reporting & Resolution Platform

FSD mini project based on IGNITE 8.0 problem statement **FSD 2**.

Citizens report civic problems (potholes, broken streetlights, garbage, water leakage, road damage)
with a photo and location. The authority verifies, assigns, fixes and resolves them with an
after-repair photo, and the citizen confirms whether the fix actually worked.

**Stack:** React (Vite) · Node.js + Express · PostgreSQL · JWT · Multer

---

## 1. Requirements

- Node.js 18 or newer
- PostgreSQL 14 or newer (with pgAdmin if you like a GUI)

## 2. Set up the database

Create an empty database called `civic_db`:

```bash
psql -U postgres -c "CREATE DATABASE civic_db;"
```

(Or right-click Databases → Create → Database in pgAdmin.)

## 3. Run the backend

```bash
cd server
cp .env.example .env        # Windows: copy .env.example .env
```

Open `server/.env` and set `DATABASE_URL` to your PostgreSQL username and password, and change `JWT_SECRET`.

```bash
npm install
npm run db:init     # creates the tables
npm run db:seed     # creates the admin account, departments and sample landmarks
npm run dev         # starts the API on http://localhost:5000
```

Check it works: open http://localhost:5000/api/health, which should show `"database":"connected"`.

## 4. Run the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev         # opens on http://localhost:5173
```

## 5. Log in

| Role | How |
|---|---|
| Citizen | Click **Create an account** on the login page |
| Admin | `admin@civic.local` / `Admin@123` (change these in `server/.env` before seeding) |

**Demo tip:** register two citizens and report the same category of issue from almost the same
coordinates (for example 19.10450, 72.83650 and 19.10465, 72.83655). The second report is merged
into the first, and the first one's priority goes up.

To wipe everything and start fresh: `npm run db:reset` (in `server/`).

---

## Project structure

```
civic-issue-platform/
├── server/
│   ├── src/
│   │   ├── index.js                 Express app, routes, static /uploads
│   │   ├── config/index.js          Reads .env
│   │   ├── db/
│   │   │   ├── schema.sql           All tables
│   │   │   ├── init.js              npm run db:init
│   │   │   ├── seed.js              npm run db:seed
│   │   │   └── pool.js              PostgreSQL connection pool
│   │   ├── middleware/
│   │   │   ├── auth.js              JWT check + role check
│   │   │   ├── upload.js            Multer: JPG/PNG/WEBP, 5 MB limit
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js       register, login, profile
│   │   │   ├── complaint.routes.js  citizen: report, list, detail, confirm
│   │   │   └── admin.routes.js      admin: list, stats, verify, assign, resolve
│   │   └── utils/
│   │       ├── complaintService.js  duplicate detection, priority refresh, history
│   │       ├── priority.js          priority score formula
│   │       ├── geo.js               Haversine distance
│   │       └── constants.js         categories, statuses, allowed transitions
│   └── uploads/                     uploaded photos (not committed)
└── client/
    └── src/
        ├── api/client.js            Axios instance, adds the JWT to requests
        ├── context/AuthContext.jsx  login state
        ├── components/              Navbar, ProtectedRoute, badges, status track,
        │                            admin actions, citizen confirmation, priority breakdown
        └── pages/                   Login, Register, ReportIssue, MyComplaints,
                                     ComplaintDetail, AdminDashboard, Profile
```

## Database tables

| Table | Purpose |
|---|---|
| `users` | Citizens and admins (`role` column) |
| `departments` | Roads, Street Lighting, Solid Waste, Water Supply, General Maintenance |
| `landmarks` | Schools and hospitals used by the priority score |
| `complaints` | Each report: category, photo, location, status, priority, resolution |
| `complaint_history` | One row per status change, shown as the timeline |

Relationships: a complaint belongs to a user and (once assigned) a department. A duplicate
complaint points to the original with `duplicate_of`.

## Complaint lifecycle

```
submitted → verified → assigned → in_progress → resolved → closed
    ↓           ↓                       ↑            ↓
 rejected    rejected                   └─ reopened ←┘  (citizen says it's not fixed)
```

The server enforces these moves. For example, an admin cannot resolve a complaint without an
after-repair photo, and only the citizen can close it.

## How the "smart" parts work

**Duplicate detection:** when a report comes in, the server looks for an open, original complaint
of the same category within 50 m (`DUPLICATE_RADIUS_METERS` in `.env`). It pre-filters with a
bounding box in SQL, then checks exact distance with the Haversine formula. A match is linked
with `duplicate_of`, the original's `duplicate_count` goes up, and from then on the duplicate
follows the original's status, so every reporter sees the same progress.

**Priority score (0–100):**

| Factor | Max points | Rule |
|---|---|---|
| Duplicate reports | 30 | 10 per extra report |
| Complaint age | 20 | 2 per day open |
| Near a school | 15 | Full points at 0 m, none beyond 1 km |
| Near a hospital | 15 | Same as schools |
| Issue severity | 20 | Pothole 20, water leakage 18, road damage 16, streetlight 12, garbage 10, other 5 |

60 or more is **high**, 35 or more is **medium**, otherwise **low**. The breakdown is stored as
JSON and shown on the admin's complaint page, so it's clear why something ranks where it does.

> The landmarks in `seed.js` are **placeholder points near Vile Parle**. Replace them with real
> schools and hospitals from your area (right-click a spot in Google Maps to copy its coordinates),
> then run `npm run db:reset`.

## API reference

All routes except register, login and health need `Authorization: Bearer <token>`.

| Method | Route | Who | Purpose |
|---|---|---|---|
| GET | `/api/health` | anyone | Server and database check |
| POST | `/api/auth/register` | anyone | Create citizen account |
| POST | `/api/auth/login` | anyone | Returns a JWT |
| GET | `/api/auth/me` | logged in | Profile and complaint counts |
| PUT | `/api/auth/me` | logged in | Update name and phone |
| POST | `/api/complaints` | citizen | Report an issue (multipart: `photo`, `category`, `description`, `latitude`, `longitude`, `address`) |
| GET | `/api/complaints/mine` | citizen | Own complaints |
| GET | `/api/complaints/:id` | owner or admin | Detail, history and duplicates |
| POST | `/api/complaints/:id/confirm` | owner | `{ fixed: true }` closes, `{ fixed: false, note }` reopens |
| GET | `/api/admin/complaints` | admin | List with `status`, `category`, `priority`, `search`, `sort` |
| GET | `/api/admin/stats` | admin | Dashboard numbers |
| GET | `/api/admin/departments` | admin | Department list |
| PATCH | `/api/admin/complaints/:id/status` | admin | `{ status, note }` to verify, reject or start work |
| PATCH | `/api/admin/complaints/:id/assign` | admin | `{ departmentId, note }` |
| POST | `/api/admin/complaints/:id/resolve` | admin | Multipart: after-repair `photo` and `note` |

## Security and validation

- Passwords hashed with bcrypt; JWT expires after 7 days (`JWT_EXPIRES_IN`)
- Role checks on every protected route; citizens can only see their own complaints
- All SQL uses parameterised queries (no string-built user input)
- Uploads: only JPG/PNG/WEBP, max 5 MB, random filenames; the file is deleted if the request fails
- Server-side validation on every form, with the same checks repeated on the client

## Phase status

| Phase | Status |
|---|---|
| 1 Project setup | Done |
| 2 Authentication and roles | Done |
| 3 Issue reporting | Done |
| 4 Citizen complaint tracking | Done (refresh button instead of live updates) |
| 5 Admin dashboard | Done (map view not yet added; each complaint links to OpenStreetMap) |
| 6 Duplicate detection | Done, location based (image comparison not added) |
| 7 Priority score | Done |
| 8 Resolution verification | Done, using the after-repair photo and citizen confirmation |
| 9 Spam detection | Not started |
| 10 Real-time (Socket.IO) | Not started |
| 11 Analytics | Basic stats done; charts not added |
| 12 Testing | Manually tested; no automated test suite |
| 13 Deployment | Not started |

## Git setup

```bash
git init
git add .
git commit -m "Initial commit: CivicFix core features"
git branch -M main
git remote add origin https://github.com/<your-username>/civic-issue-platform.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `.env` files and uploaded photos.
