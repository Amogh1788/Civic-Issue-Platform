import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        setStats(data.stats);
        setForm({ name: data.user.name, phone: data.user.phone || '' });
      })
      .catch((err) => setMessage({ type: 'error', text: errorMessage(err) }));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await api.put('/auth/me', form);
      updateUser(data.user);
      setMessage({ type: 'success', text: 'Profile saved' });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="narrow">
      <h1>Your profile</h1>
      <p className="muted">
        Signed in as {user.email} ({user.role === 'admin' ? 'authority admin' : 'citizen'})
        {user.createdAt && `, member since ${formatDate(user.createdAt)}`}
      </p>

      {stats && user.role === 'citizen' && (
        <p className="profile-stats">
          You have reported <strong>{stats.total}</strong> issue{stats.total === 1 ? '' : 's'};{' '}
          <strong>{stats.resolved}</strong> fixed so far.
        </p>
      )}

      <form className="panel" onSubmit={handleSubmit}>
        {message && <p className={`alert ${message.type}`} role="status">{message.text}</p>}
        <label>
          Full name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Phone <span className="optional">optional</span>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  );
}
