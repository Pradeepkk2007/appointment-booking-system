# Appointment Booking System

A full-stack Appointment Booking System built with **Node.js + Express** (backend, ES module `import` syntax), **Microsoft SQL Server** (database), and **React (Vite)** (frontend).

Users can register/login, browse services, book appointments in available time slots, and view/cancel their bookings. Admins can manage services and all appointments, with a dashboard summary.

---

## 1. Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18 (Vite), React Router, Axios |
| Backend   | Node.js, Express.js (ES Modules) |
| Database  | Microsoft SQL Server (`mssql` driver) |
| Auth      | JWT (JSON Web Tokens) + bcrypt password hashing |

---

## 2. Project Structure

```
appointment-booking-system/
├── backend/
│   ├── config/db.js              # SQL Server connection pool
│   ├── controllers/              # Route handlers (business logic)
│   ├── middleware/auth.js        # JWT auth + admin guard
│   ├── routes/                   # Express routers
│   ├── sql/schema.sql            # DB schema + seed data
│   ├── server.js                 # App entrypoint
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/axios.js          # Axios instance with auth interceptor
    │   ├── context/AuthContext.jsx
    │   ├── components/           # Navbar, PrivateRoute
    │   ├── pages/                # Login, Register, Dashboard, Services,
    │   │                         # BookAppointment, MyAppointments,
    │   │                         # AdminServices, AdminAppointments
    │   └── App.jsx / main.jsx
    └── package.json
```

---

## 3. Database Setup (SQL Server)

1. Make sure SQL Server is running locally (or via Docker):
   ```bash
   docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong@Passw0rd" \
     -p 1433:1433 --name sql-server -d mcr.microsoft.com/mssql/server:2022-latest
   ```
2. Run the schema script against your server (creates the DB, tables, seed services, and — importantly — the **unique filtered index that blocks double bookings**):
   ```bash
   sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -i backend/sql/schema.sql
   ```
   (Or open `backend/sql/schema.sql` in Azure Data Studio / SSMS and execute it.)

---

## 4. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env with your SQL Server credentials
npm run dev        # starts on http://localhost:5000
```

`.env` variables:
```
PORT=5000
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=AppointmentBookingDB
DB_USER=sa
DB_PASSWORD=YourStrong@Passw0rd
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d
```

### Creating an admin user
There's no separate admin signup flow (by design, to keep it simple). Register normally through the app, then promote that user in SQL:
```sql
UPDATE dbo.Users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

---

## 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev         # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:5000`, so no CORS configuration is needed in development (`vite.config.js`).

---

## 6. How the Core Business Rule Is Enforced (No Double Booking)

Double booking is prevented at **two layers**:

1. **Database layer (source of truth):** a SQL Server **filtered unique index**
   ```sql
   CREATE UNIQUE INDEX UQ_Appointments_NoDoubleBooking
   ON dbo.Appointments (service_id, appointment_date, appointment_time)
   WHERE status IN ('pending','confirmed','completed');
   ```
   This guarantees that two *active* appointments can never exist for the same service at the same date/time slot — even under concurrent requests. Cancelled appointments are excluded from the constraint, so a cancelled slot becomes bookable again automatically.

2. **API layer (friendly UX):** the backend queries live availability (`GET /api/appointments/availability`) and disables already-booked slots in the UI *before* the user submits. If a race condition still occurs (two users click "book" on the same slot within milliseconds), the DB constraint throws a unique-key violation (SQL error 2601/2627), which the API catches and returns as a clean `409 Conflict` with a message like *"This time slot has just been booked by someone else."*

### Appointment statuses
`pending` → `confirmed` → `completed`, or `cancelled` at any point (except from `completed`). Admins can move an appointment through any status; users can only cancel their own pending/confirmed appointments.

### Slot generation
Slots are generated server-side on a fixed grid (09:00–18:00, 30-minute steps) — see `BUSINESS_START_HOUR`, `BUSINESS_END_HOUR`, `SLOT_STEP_MINUTES` in `backend/controllers/appointments.controller.js`. This can be swapped later for per-service working hours without changing the double-booking guarantee.

---

## 7. API Documentation

Base URL: `http://localhost:5000/api`

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a new user. Body: `{ name, email, password }` |
| POST | `/auth/login` | — | Login. Body: `{ email, password }`. Returns `{ user, token }` |
| GET | `/auth/me` | User | Get current logged-in user's profile |

### Services (public read)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/services?search=` | — | List active services, optional name search |

### Appointments (user)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/appointments/availability?serviceId=&date=` | User | Get all slots for a service/date with `available: true/false` |
| POST | `/appointments` | User | Book an appointment. Body: `{ service_id, appointment_date, appointment_time, notes? }` |
| GET | `/appointments/my?type=upcoming\|past&status=` | User | List own appointments |
| PUT | `/appointments/:id` | User (owner) | Reschedule / update notes (only if pending/confirmed) |
| PATCH | `/appointments/:id/cancel` | User (owner) | Cancel an appointment |

### Admin (requires `role: admin`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/dashboard` | Summary stats: totals, today's count, breakdown by status |
| GET | `/admin/services` | List **all** services (including inactive) |
| POST | `/admin/services` | Create a service |
| PUT | `/admin/services/:id` | Update a service |
| DELETE | `/admin/services/:id` | Deactivate a service (soft delete) |
| GET | `/admin/appointments?status=&date=&search=` | List/filter all appointments across users |
| PATCH | `/admin/appointments/:id/status` | Update an appointment's status |

All authenticated routes expect header: `Authorization: Bearer <token>`.

---

## 8. Validation & Error Handling

- Server-side validation on registration (email format via unique constraint, password length ≥ 6), service creation (positive duration, non-negative price), and appointment booking (no past-dated bookings, correct `HH:mm` format, service must be active).
- Consistent JSON error responses: `{ message: "..." }` with appropriate HTTP status codes (400, 401, 403, 404, 409, 500).
- Frontend shows inline error/success alerts and disables buttons while requests are in flight to prevent duplicate submits.

---

## 9. Notes on Scope

This was built to a **1-hour turnaround** as a practical assignment — it favors a clean, understandable architecture over exhaustive production hardening (no rate limiting, no email verification, no automated tests, no refresh-token rotation). Given more time, natural next steps would be: per-service configurable working hours, appointment reminders, automated tests (Jest/Supertest), and refresh tokens.
