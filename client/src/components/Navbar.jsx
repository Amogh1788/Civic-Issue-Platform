import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="hazard" aria-hidden="true" />
      <div className="navbar-inner">
        <Link to={user ? homeFor(user) : '/login'} className="brand">
          <span className="brand-mark" aria-hidden="true">CF</span>
          CivicFix
        </Link>

        {user && (
          <nav className="nav-links">
            {user.role === 'citizen' && (
              <>
                <NavLink to="/complaints" end>My complaints</NavLink>
                <NavLink to="/report" className="nav-cta">Report an issue</NavLink>
              </>
            )}
            {user.role === 'admin' && <NavLink to="/admin">Dashboard</NavLink>}
            <NavLink to="/profile">Profile</NavLink>
            <button type="button" className="link-button" onClick={handleLogout}>Log out</button>
          </nav>
        )}
      </div>
    </header>
  );
}
