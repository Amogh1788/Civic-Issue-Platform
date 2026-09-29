import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import { errorMessage } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(homeFor(user));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-intro">
        <h1>Spotted a pothole, a dead streetlight or overflowing garbage?</h1>
        <p>Report it with a photo and its location, then follow it until the repair is done and you confirm it.</p>
      </div>

      <form className="panel auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Log in</h2>
        {error && <p className="alert error" role="alert">{error}</p>}

        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={update} autoComplete="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" value={form.password} onChange={update} autoComplete="current-password" required />
        </label>

        <button className="btn primary" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
        <p className="muted">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
