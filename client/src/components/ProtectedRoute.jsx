import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';

// <ProtectedRoute role="admin"> only lets admins in; without a role, any logged-in user
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />;

  return children;
}
