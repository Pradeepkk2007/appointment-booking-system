import { useEffect, useState } from 'react';
import api from '../api/axios.js';

const emptyForm = { name: '', description: '', duration_minutes: 30, price: 0, is_active: true };

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/services');
      setServices(data);
    } catch (err) {
      setError('Failed to load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (service) => {
    setForm({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price,
      is_active: service.is_active,
    });
    setEditingId(service.id);
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.duration_minutes || form.duration_minutes <= 0) return 'Duration must be a positive number.';
    if (form.price === '' || Number(form.price) < 0) return 'Price cannot be negative.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        duration_minutes: Number(form.duration_minutes),
        price: Number(form.price),
      };
      if (editingId) {
        await api.put(`/admin/services/${editingId}`, payload);
      } else {
        await api.post('/admin/services', payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this service? It will no longer be bookable.')) return;
    try {
      await api.delete(`/admin/services/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate service.');
    }
  };

  return (
    <div>
      <div className="page-header"><h1>Manage Services</h1></div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>{editingId ? 'Edit Service' : 'Add New Service'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Dental Cleaning" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" rows="2" value={form.description} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange} min="5" step="5" />
            </div>
            <div className="form-group">
              <label>Price ($)</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} min="0" step="0.01" />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} style={{ width: 'auto', marginRight: 8 }} />
                Active (bookable)
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Service' : 'Add Service'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel Edit</button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h3>All Services</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead><tr><th>Name</th><th>Duration</th><th>Price</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.duration_minutes} min</td>
                    <td>${Number(s.price).toFixed(2)}</td>
                    <td>
                      <span className={`pill ${s.is_active ? 'pill-confirmed' : 'pill-cancelled'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(s)}>Edit</button>
                      {s.is_active && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(s.id)}>Deactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminServices;
