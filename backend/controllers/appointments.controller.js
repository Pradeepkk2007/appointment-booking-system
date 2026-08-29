import { getPool, sql } from '../config/db.js';

const BUSINESS_START_HOUR = 9; // 9 AM
const BUSINESS_END_HOUR = 18; // 6 PM
const SLOT_STEP_MINUTES = 30; // slots generated every 30 minutes

const generateAllSlots = () => {
  const slots = [];
  for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_STEP_MINUTES) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
};

// GET /api/appointments/availability?serviceId=1&date=2026-08-30
// Returns all possible slots for that day and marks which are already taken.
export const getAvailability = async (req, res) => {
  try {
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
      return res.status(400).json({ message: 'serviceId and date are required.' });
    }

    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) {
      return res.status(400).json({ message: 'Cannot check availability for a past date.' });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('serviceId', sql.Int, serviceId)
      .input('date', sql.Date, date)
      .query(`
        SELECT appointment_time
        FROM dbo.Appointments
        WHERE service_id = @serviceId
          AND appointment_date = @date
          AND status IN ('pending', 'confirmed', 'completed')
      `);

    const bookedTimes = new Set(result.recordset.map((r) => r.appointment_time));
    const allSlots = generateAllSlots();

    const slots = allSlots.map((time) => ({
      time,
      available: !bookedTimes.has(time),
    }));

    res.json({ date, serviceId: Number(serviceId), slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch availability.' });
  }
};

// POST /api/appointments  (authenticated user)
export const createAppointment = async (req, res) => {
  try {
    const { service_id, appointment_date, appointment_time, notes } = req.body;
    const userId = req.user.id;

    if (!service_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ message: 'service_id, appointment_date and appointment_time are required.' });
    }

    // Validate date/time isn't in the past
    const requested = new Date(`${appointment_date}T${appointment_time}:00`);
    if (requested < new Date()) {
      return res.status(400).json({ message: 'Cannot book an appointment in the past.' });
    }

    // Validate time format matches our slot grid
    if (!/^\d{2}:\d{2}$/.test(appointment_time)) {
      return res.status(400).json({ message: 'Invalid time format. Expected HH:mm.' });
    }

    const pool = await getPool();

    // Confirm service exists and is active
    const serviceResult = await pool
      .request()
      .input('id', sql.Int, service_id)
      .query('SELECT id, is_active FROM dbo.Services WHERE id = @id');

    const service = serviceResult.recordset[0];
    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }
    if (!service.is_active) {
      return res.status(400).json({ message: 'This service is no longer available.' });
    }

    // ---- CORE BUSINESS RULE: prevent double booking ----
    // We rely on a filtered UNIQUE INDEX in SQL Server on
    // (service_id, appointment_date, appointment_time) WHERE status <> 'cancelled'.
    // We still pre-check here for a friendly error message, but the DB constraint
    // is the real source of truth in case of race conditions.
    try {
      const insertResult = await pool
        .request()
        .input('user_id', sql.Int, userId)
        .input('service_id', sql.Int, service_id)
        .input('appointment_date', sql.Date, appointment_date)
        .input('appointment_time', sql.VarChar, appointment_time)
        .input('notes', sql.NVarChar, notes || null)
        .query(`
          INSERT INTO dbo.Appointments (user_id, service_id, appointment_date, appointment_time, status, notes)
          OUTPUT INSERTED.*
          VALUES (@user_id, @service_id, @appointment_date, @appointment_time, 'pending', @notes)
        `);

      return res.status(201).json(insertResult.recordset[0]);
    } catch (dbErr) {
      // SQL Server unique index violation error number is 2601 / 2627
      if (dbErr.number === 2601 || dbErr.number === 2627) {
        return res.status(409).json({
          message: 'This time slot has just been booked by someone else. Please choose another slot.',
        });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create appointment.' });
  }
};

// GET /api/appointments/my  (authenticated user) - supports ?status= & ?type=upcoming|past
export const getMyAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type } = req.query;

    const pool = await getPool();
    const request = pool.request().input('userId', sql.Int, userId);

    let query = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.notes, a.created_at,
             s.id AS service_id, s.name AS service_name, s.duration_minutes, s.price
      FROM dbo.Appointments a
      JOIN dbo.Services s ON s.id = a.service_id
      WHERE a.user_id = @userId
    `;

    if (status) {
      request.input('status', sql.NVarChar, status);
      query += ' AND a.status = @status';
    }

    if (type === 'upcoming') {
      query += " AND (a.appointment_date > CAST(GETDATE() AS DATE) OR (a.appointment_date = CAST(GETDATE() AS DATE) AND a.appointment_time >= FORMAT(GETDATE(), 'HH:mm')))";
      query += " AND a.status NOT IN ('cancelled')";
    } else if (type === 'past') {
      query += " AND (a.appointment_date < CAST(GETDATE() AS DATE) OR (a.appointment_date = CAST(GETDATE() AS DATE) AND a.appointment_time < FORMAT(GETDATE(), 'HH:mm')) OR a.status = 'completed')";
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch appointments.' });
  }
};

// PUT /api/appointments/:id  (owner can reschedule/update notes while pending)
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { appointment_date, appointment_time, notes } = req.body;

    const pool = await getPool();

    const existingResult = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM dbo.Appointments WHERE id = @id');

    const appointment = existingResult.recordset[0];
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (appointment.user_id !== userId) {
      return res.status(403).json({ message: 'You can only modify your own appointments.' });
    }
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({ message: `Cannot modify a ${appointment.status} appointment.` });
    }

    const newDate = appointment_date || appointment.appointment_date;
    const newTime = appointment_time || appointment.appointment_time;

    try {
      const result = await pool
        .request()
        .input('id', sql.Int, id)
        .input('appointment_date', sql.Date, newDate)
        .input('appointment_time', sql.VarChar, newTime)
        .input('notes', sql.NVarChar, notes ?? appointment.notes)
        .query(`
          UPDATE dbo.Appointments
          SET appointment_date = @appointment_date,
              appointment_time = @appointment_time,
              notes = @notes,
              updated_at = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      res.json(result.recordset[0]);
    } catch (dbErr) {
      if (dbErr.number === 2601 || dbErr.number === 2627) {
        return res.status(409).json({ message: 'That time slot is already booked. Please choose another slot.' });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update appointment.' });
  }
};

// PATCH /api/appointments/:id/cancel  (owner cancels)
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const pool = await getPool();
    const existingResult = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM dbo.Appointments WHERE id = @id');

    const appointment = existingResult.recordset[0];
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (appointment.user_id !== userId) {
      return res.status(403).json({ message: 'You can only cancel your own appointments.' });
    }
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Appointment is already cancelled.' });
    }
    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed appointment.' });
    }

    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE dbo.Appointments
        SET status = 'cancelled', updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel appointment.' });
  }
};
