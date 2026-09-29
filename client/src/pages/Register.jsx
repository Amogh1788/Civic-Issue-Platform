import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.password !== form.confirm) return setError('Passwords do not match');

    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      await register(payload);
      navigate('/report');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-intro">
        <h1>Create a citizen account</h1>
        <p>You'll use it to report issues and to confirm when they are fixed.</p>
      </div>

      <form className="panel auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Sign up</h2>
        {error && <p className="alert error" role="alert">{error}</p>}

        <label>
          Full name
          <input name="name" value={form.name} onChange={update} autoComplete="name" required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={update} autoComplete="email" required />
        </label>
        <label>
          Phone <span className="optional">optional</span>
          <input type="tel" name="phone" value={form.phone} onChange={update} autoComplete="tel" />
        </label>
        <div className="row-2">
          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={update} autoComplete="new-password" required />
          </label>
          <label>
            Confirm password
            <input type="password" name="confirm" value={form.confirm} onChange={update} autoComplete="new-password" required />
          </label>
        </div>

        <button className="btn primary" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
