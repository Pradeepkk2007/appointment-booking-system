import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const { data } = await api.get('/admin/dashboard');
          setStats(data);
        } else {
          const { data } = await api.get('/appointments/my', { params: { type: 'upcoming' } });
          setMyAppointments(data.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {user.name}</h1>
      </div>

      {isAdmin ? (
        <div className="grid grid-4">
          <div className="card stat-card">
            <div className="value">{stats.totalAppointments}</div>
            <div className="label">Total Appointments</div>
          </div>
          <div className="card stat-card">
            <div className="value">{stats.todayAppointments}</div>
            <div className="label">Today's Appointments</div>
          </div>
          <div className="card stat-card">
            <div className="value">{stats.totalActiveServices}</div>
            <div className="label">Active Services</div>
          </div>
          <div className="card stat-card">
            <div className="value">{stats.totalUsers}</div>
            <div className="label">Registered Users</div>
          </div>
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>Appointments by Status</h3>
            <div className="grid grid-4">
              {stats.byStatus.map((s) => (
                <div key={s.status} className="stat-card">
                  <div className="value" style={{ fontSize: '1.4rem' }}>{s.count}</div>
                  <div className="label"><span className={`pill pill-${s.status}`}>{s.status}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-2" style={{ marginBottom: 20 }}>
            <Link to="/book" className="card" style={{ textAlign: 'center' }}>
              <h3>➕ Book a New Appointment</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Browse services and pick a time slot</p>
            </Link>
            <Link to="/my-appointments" className="card" style={{ textAlign: 'center' }}>
              <h3>📋 View My Appointments</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>See upcoming & past bookings</p>
            </Link>
          </div>

          <div className="card">
            <h3>Upcoming Appointments</h3>
            {myAppointments.length === 0 ? (
              <p className="empty-state">No upcoming appointments. <Link to="/book">Book one now</Link>.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Service</th><th>Date</th><th>Time</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {myAppointments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.service_name}</td>
                      <td>{new Date(a.appointment_date).toLocaleDateString()}</td>
                      <td>{a.appointment_time}</td>
                      <td><span className={`pill pill-${a.status}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
