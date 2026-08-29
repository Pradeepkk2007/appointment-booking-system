import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

const todayStr = () => new Date().toISOString().split('T')[0];

const BookAppointment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(location.state?.serviceId || '');
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/services').then(({ data }) => setServices(data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSelectedTime('');
    setError('');
    api
      .get('/appointments/availability', { params: { serviceId, date } })
      .then(({ data }) => setSlots(data.slots))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load availability.'))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!serviceId || !date || !selectedTime) {
      setError('Please select a service, date and time slot.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/appointments', {
        service_id: Number(serviceId),
        appointment_date: date,
        appointment_time: selectedTime,
        notes,
      });
      setSuccess('Appointment booked successfully!');
      setTimeout(() => navigate('/my-appointments'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book appointment.');
      // Refresh slots in case of a race-condition double booking
      if (err.response?.status === 409) {
        const { data } = await api.get('/appointments/availability', { params: { serviceId, date } });
        setSlots(data.slots);
        setSelectedTime('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header"><h1>Book an Appointment</h1></div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Service</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Select a service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes} min - ${Number(s.price).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date</label>
            <input type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {serviceId && date && (
            <div className="form-group">
              <label>Available Time Slots</label>
              {loadingSlots ? (
                <p>Loading slots...</p>
              ) : slots.length === 0 ? (
                <p className="empty-state">No slots available.</p>
              ) : (
                <div className="slot-grid">
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={slot.time}
                      disabled={!slot.available}
                      className={`slot-btn ${selectedTime === slot.time ? 'selected' : ''}`}
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the provider should know?" />
          </div>

          <button className="btn btn-primary" disabled={submitting || !selectedTime}>
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookAppointment;
