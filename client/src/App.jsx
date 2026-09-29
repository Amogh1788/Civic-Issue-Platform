import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, homeFor } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ReportIssue from './pages/ReportIssue';
import MyComplaints from './pages/MyComplaints';
import ComplaintDetail from './pages/ComplaintDetail';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Navigate to={user ? homeFor(user) : '/login'} replace />} />
          <Route path="/login" element={user ? <Navigate to={homeFor(user)} replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to={homeFor(user)} replace /> : <Register />} />

          <Route path="/report" element={<ProtectedRoute role="citizen"><ReportIssue /></ProtectedRoute>} />
          <Route path="/complaints" element={<ProtectedRoute role="citizen"><MyComplaints /></ProtectedRoute>} />
          <Route path="/complaints/:id" element={<ProtectedRoute><ComplaintDetail /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
