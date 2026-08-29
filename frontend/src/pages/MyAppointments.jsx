import { useEffect, useState } from 'react';
import api from '../api/axios.js';

const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [type, setType] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/appointments/my', { params: type === 'all' ? {} : { type } });
      setAppointments(data);
    } catch (err) {
      setError('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    setActionId(id);
    try {
      await api.patch(`/appointments/${id}/cancel`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <div className="page-header"><h1>My Appointments</h1></div>

      <div className="filters-bar">
        {['upcoming', 'past', 'all'].map((t) => (
          <button
            key={t}
            className={`btn btn-sm ${type === t ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <p>Loading...</p>
        ) : appointments.length === 0 ? (
          <p className="empty-state">No appointments found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Service</th><th>Date</th><th>Time</th><th>Status</th><th>Notes</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.service_name}</td>
                  <td>{new Date(a.appointment_date).toLocaleDateString()}</td>
                  <td>{a.appointment_time}</td>
                  <td><span className={`pill pill-${a.status}`}>{a.status}</span></td>
                  <td>{a.notes || '-'}</td>
                  <td>
                    {['pending', 'confirmed'].includes(a.status) && (
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={actionId === a.id}
                        onClick={() => handleCancel(a.id)}
                      >
                        {actionId === a.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
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

export default MyAppointments;
