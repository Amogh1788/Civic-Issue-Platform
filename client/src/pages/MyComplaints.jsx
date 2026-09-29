import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage, fileUrl } from '../api/client';
import { StatusBadge } from '../components/Badges';
import { categoryLabel, formatDate } from '../utils/format';

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/complaints/mine');
      setComplaints(data.complaints);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const waiting = complaints.filter((c) => c.status === 'resolved');

  return (
    <div>
      <div className="page-head">
        <h1>My complaints</h1>
        <button className="btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {error && <p className="alert error" role="alert">{error}</p>}

      {waiting.length > 0 && (
        <p className="alert info">
          {waiting.length === 1 ? 'One issue has' : `${waiting.length} issues have`} been marked fixed.
          Open {waiting.length === 1 ? 'it' : 'them'} to confirm whether the repair worked.
        </p>
      )}

      {!loading && !error && complaints.length === 0 && (
        <div className="empty">
          <h2>You haven't reported anything yet</h2>
          <p>When you see a civic problem, report it here and track it until it's fixed.</p>
          <Link className="btn primary" to="/report">Report an issue</Link>
        </div>
      )}

      <ul className="complaint-list">
        {complaints.map((c) => (
          <li key={c.id}>
            <Link to={`/complaints/${c.id}`} className="complaint-row">
              <img src={fileUrl(c.photo_url)} alt="" loading="lazy" />
              <div className="complaint-row-body">
                <div className="complaint-row-top">
                  <strong>{categoryLabel(c.category)}</strong>
                  <StatusBadge status={c.status} />
                </div>
                <p className="clamp">{c.description}</p>
                <p className="muted small">
                  {c.complaint_code}, reported {formatDate(c.created_at)}
                  {c.duplicate_of_code && `, merged into ${c.duplicate_of_code}`}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
