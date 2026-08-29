import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

const Services = () => {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadServices = async (searchTerm = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/services', { params: searchTerm ? { search: searchTerm } : {} });
      setServices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadServices(search);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Available Services</h1>
      </div>

      <form onSubmit={handleSearch} className="filters-bar">
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-outline" type="submit">Search</button>
      </form>

      {loading ? (
        <p>Loading services...</p>
      ) : services.length === 0 ? (
        <p className="empty-state">No services found.</p>
      ) : (
        <div className="grid grid-2">
          {services.map((s) => (
            <div key={s.id} className="card">
              <h3>{s.name}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{s.description}</p>
              <p><strong>Duration:</strong> {s.duration_minutes} min &nbsp;|&nbsp; <strong>Price:</strong> ${Number(s.price).toFixed(2)}</p>
              <button className="btn btn-primary" onClick={() => navigate('/book', { state: { serviceId: s.id } })}>
                Book This Service
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Services;
