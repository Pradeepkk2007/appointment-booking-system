import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Services from './pages/Services.jsx';
import BookAppointment from './pages/BookAppointment.jsx';
import MyAppointments from './pages/MyAppointments.jsx';
import AdminServices from './pages/AdminServices.jsx';
import AdminAppointments from './pages/AdminAppointments.jsx';

function App() {
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/services" element={<PrivateRoute><Services /></PrivateRoute>} />
          <Route path="/book" element={<PrivateRoute><BookAppointment /></PrivateRoute>} />
          <Route path="/my-appointments" element={<PrivateRoute><MyAppointments /></PrivateRoute>} />

          <Route path="/admin/services" element={<PrivateRoute adminOnly><AdminServices /></PrivateRoute>} />
          <Route path="/admin/appointments" element={<PrivateRoute adminOnly><AdminAppointments /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
