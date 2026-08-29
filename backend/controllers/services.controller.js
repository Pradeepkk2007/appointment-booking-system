import { getPool, sql } from '../config/db.js';

// Public: list active services (with optional search)
export const listServices = async (req, res) => {
  try {
    const { search } = req.query;
    const pool = await getPool();
    const request = pool.request();

    let query = 'SELECT id, name, description, duration_minutes, price, is_active FROM dbo.Services WHERE is_active = 1';
    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      query += ' AND name LIKE @search';
    }
    query += ' ORDER BY name';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch services.' });
  }
};

// Admin: list ALL services (including inactive)
export const listAllServices = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT id, name, description, duration_minutes, price, is_active, created_at FROM dbo.Services ORDER BY id DESC'
    );
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch services.' });
  }
};

export const createService = async (req, res) => {
  try {
    const { name, description, duration_minutes, price, is_active } = req.body;

    if (!name || !duration_minutes || price === undefined) {
      return res.status(400).json({ message: 'name, duration_minutes and price are required.' });
    }
    if (duration_minutes <= 0) {
      return res.status(400).json({ message: 'duration_minutes must be positive.' });
    }
    if (price < 0) {
      return res.status(400).json({ message: 'price cannot be negative.' });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description || null)
      .input('duration_minutes', sql.Int, duration_minutes)
      .input('price', sql.Decimal(10, 2), price)
      .input('is_active', sql.Bit, is_active === undefined ? 1 : is_active)
      .query(`
        INSERT INTO dbo.Services (name, description, duration_minutes, price, is_active)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @duration_minutes, @price, @is_active)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create service.' });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration_minutes, price, is_active } = req.body;

    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description || null)
      .input('duration_minutes', sql.Int, duration_minutes)
      .input('price', sql.Decimal(10, 2), price)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE dbo.Services
        SET name = @name,
            description = @description,
            duration_minutes = @duration_minutes,
            price = @price,
            is_active = @is_active
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update service.' });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    // Soft delete: mark inactive instead of hard delete, to preserve appointment history
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('UPDATE dbo.Services SET is_active = 0 OUTPUT INSERTED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    res.json({ message: 'Service deactivated.', service: result.recordset[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete service.' });
  }
};
