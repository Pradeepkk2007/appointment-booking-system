import { useEffect, useState } from 'react';
import api from '../api/axios.js';

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', date: '', search: '' });
  const [updatingId, setUpdatingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.date) params.date = filters.date;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get('/admin/appointments', { params });
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const applyFilters = (e) => {
    e.preventDefault();
    load();
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.patch(`/admin/appointments/${id}/status`, { status });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="page-header"><h1>Manage Appointments</h1></div>

      <form onSubmit={applyFilters} className="filters-bar">
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" name="date" value={filters.date} onChange={handleFilterChange} />
        <input
          type="text"
          name="search"
          placeholder="Search by user, email, or service..."
          value={filters.search}
          onChange={handleFilterChange}
          style={{ minWidth: 220 }}
        />
        <button className="btn btn-outline" type="submit">Apply Filters</button>
      </form>

      <div className="card">
        {loading ? (
          <p>Loading...</p>
        ) : appointments.length === 0 ? (
          <p className="empty-state">No appointments match your filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th><th>Service</th><th>Date</th><th>Time</th><th>Status</th><th>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.user_name}<br /><small style={{ color: 'var(--text-muted)' }}>{a.user_email}</small></td>
                  <td>{a.service_name}</td>
                  <td>{new Date(a.appointment_date).toLocaleDateString()}</td>
                  <td>{a.appointment_time}</td>
                  <td><span className={`pill pill-${a.status}`}>{a.status}</span></td>
                  <td>
                    <select
                      value={a.status}
                      disabled={updatingId === a.id}
                      onChange={(e) => handleStatusChange(a.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminAppointments;
