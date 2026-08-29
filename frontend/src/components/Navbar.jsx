import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="brand">📅 BookIt</Link>
      <div className="links">
        <Link to="/services">Services</Link>
        <Link to="/book">Book Appointment</Link>
        <Link to="/my-appointments">My Appointments</Link>
        {isAdmin && (
          <>
            <Link to="/admin/services">Manage Services</Link>
            <Link to="/admin/appointments">Manage Appointments</Link>
          </>
        )}
        <span>
          {user.name}
          {isAdmin && <span className="badge-role">ADMIN</span>}
        </span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
