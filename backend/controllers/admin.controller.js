import { getPool, sql } from '../config/db.js';

// GET /api/admin/appointments?status=&date=&search=
export const getAllAppointments = async (req, res) => {
  try {
    const { status, date, search } = req.query;
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.notes, a.created_at,
             s.id AS service_id, s.name AS service_name,
             u.id AS user_id, u.name AS user_name, u.email AS user_email
      FROM dbo.Appointments a
      JOIN dbo.Services s ON s.id = a.service_id
      JOIN dbo.Users u ON u.id = a.user_id
      WHERE 1 = 1
    `;

    if (status) {
      request.input('status', sql.NVarChar, status);
      query += ' AND a.status = @status';
    }
    if (date) {
      request.input('date', sql.Date, date);
      query += ' AND a.appointment_date = @date';
    }
    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      query += ' AND (u.name LIKE @search OR u.email LIKE @search OR s.name LIKE @search)';
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch appointments.' });
  }
};

// PATCH /api/admin/appointments/:id/status  { status: 'confirmed' | 'completed' | 'cancelled' }
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE dbo.Appointments
        SET status = @status, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update status.' });
  }
};

// GET /api/admin/dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const pool = await getPool();

    const [totalsResult, todayResult, statusResult, servicesResult] = await Promise.all([
      pool.request().query('SELECT COUNT(*) AS totalAppointments FROM dbo.Appointments'),
      pool.request().query("SELECT COUNT(*) AS todayAppointments FROM dbo.Appointments WHERE appointment_date = CAST(GETDATE() AS DATE) AND status <> 'cancelled'"),
      pool.request().query(`
        SELECT status, COUNT(*) AS count
        FROM dbo.Appointments
        GROUP BY status
      `),
      pool.request().query('SELECT COUNT(*) AS totalServices FROM dbo.Services WHERE is_active = 1'),
    ]);

    const usersResult = await pool.request().query("SELECT COUNT(*) AS totalUsers FROM dbo.Users WHERE role = 'user'");

    res.json({
      totalAppointments: totalsResult.recordset[0].totalAppointments,
      todayAppointments: todayResult.recordset[0].todayAppointments,
      totalActiveServices: servicesResult.recordset[0].totalServices,
      totalUsers: usersResult.recordset[0].totalUsers,
      byStatus: statusResult.recordset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats.' });
  }
};
