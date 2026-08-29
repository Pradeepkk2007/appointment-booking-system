-- ============================================================
-- Appointment Booking System - SQL Server Schema
-- ============================================================
IF DB_ID('AppointmentBooking') IS NULL
    BEGIN
        CREATE DATABASE AppointmentBooking;
    END


GO
USE AppointmentBooking;


GO
-- ---------------- USERS ----------------
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    DROP TABLE dbo.Users;

CREATE TABLE dbo.Users (
    id         INT            IDENTITY (1, 1) PRIMARY KEY,
    name       NVARCHAR (100) NOT NULL,
    email      NVARCHAR (150) NOT NULL UNIQUE,
    Password   VARCHAR (255)  NOT NULL,
    role       NVARCHAR (20)  DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
    created_at DATETIME2      DEFAULT SYSUTCDATETIME()
);


GO
-- ---------------- SERVICES ----------------
IF OBJECT_ID('dbo.Services', 'U') IS NOT NULL
    DROP TABLE dbo.Services;

CREATE TABLE dbo.Services (
    id               INT             IDENTITY (1, 1) PRIMARY KEY,
    name             NVARCHAR (150)  NOT NULL,
    description      NVARCHAR (500)  NULL,
    duration_minutes INT             DEFAULT 30 NOT NULL,
    price            DECIMAL (10, 2) DEFAULT 0 NOT NULL,
    is_active        BIT             DEFAULT 1 NOT NULL,
    created_at       DATETIME2       DEFAULT SYSUTCDATETIME()
);


GO
-- ---------------- APPOINTMENTS ----------------
IF OBJECT_ID('dbo.Appointments', 'U') IS NOT NULL
    DROP TABLE dbo.Appointments;

CREATE TABLE dbo.Appointments (
    id               INT            IDENTITY (1, 1) PRIMARY KEY,
    user_id          INT            NOT NULL FOREIGN KEY REFERENCES dbo.Users (id),
    service_id       INT            NOT NULL FOREIGN KEY REFERENCES dbo.Services (id),
    appointment_date DATE           NOT NULL,
    appointment_time VARCHAR (5)    NOT NULL, -- 'HH:mm' 24hr
    status           NVARCHAR (20)  DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    notes            NVARCHAR (500) NULL,
    created_at       DATETIME2      DEFAULT SYSUTCDATETIME(),
    updated_at       DATETIME2      DEFAULT SYSUTCDATETIME()
);


GO
-- KEY BUSINESS RULE: prevent double-booking of the same service/date/time slot.
-- A filtered unique index only enforces uniqueness for NON-cancelled bookings,
-- so a cancelled slot frees itself up again automatically.
CREATE UNIQUE INDEX UQ_Appointments_NoDoubleBooking
    ON dbo.Appointments(service_id, appointment_date, appointment_time) WHERE status IN ('pending', 'confirmed', 'completed');


GO
-- ---------------- SEED DATA ----------------
INSERT  INTO dbo.Services (
    name,
    description,
    duration_minutes,
    price
)
VALUES                   ('General Consultation', 'A general check-up / consultation session', 30, 50.00),
('Dental Cleaning', 'Routine dental cleaning and checkup', 45, 80.00),
('Hair Styling', 'Haircut and styling session', 60, 40.00),
('Physiotherapy Session', 'One-on-one physiotherapy session', 45, 70.00);


-- NOTE: Create the admin user via the app's normal /api/auth/register endpoint,
-- then run this to promote it to admin (replace the email):
-- UPDATE dbo.Users SET role = 'admin' WHERE email = 'admin@example.com';