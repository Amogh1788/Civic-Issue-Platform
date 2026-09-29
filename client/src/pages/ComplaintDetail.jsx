import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage, fileUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CodeTag, StatusBadge } from '../components/Badges';
import StatusTrack from '../components/StatusTrack';
import AdminActions from '../components/AdminActions';
import ConfirmResolution from '../components/ConfirmResolution';
import PriorityBreakdown from '../components/PriorityBreakdown';
import { categoryIcon, categoryLabel, formatDateTime, mapLink } from '../utils/format';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get(`/complaints/${id}`);
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="empty">
        <p className="alert error">{error}</p>
        <Link className="btn" to={isAdmin ? '/admin' : '/complaints'}>Back</Link>
      </div>
    );
  }
  if (!data) return <p className="muted">Loading complaint…</p>;

  const { complaint: c, history, duplicates } = data;
  const isOriginal = !c.duplicate_of;

  return (
    <div className="detail">
      <Link className="small-link" to={isAdmin ? '/admin' : '/complaints'}>
        {isAdmin ? 'Back to dashboard' : 'Back to my complaints'}
      </Link>

      <div className="detail-head">
        <div>
          <CodeTag code={c.complaint_code} />
          <h1><span aria-hidden="true">{categoryIcon(c.category)}</span> {categoryLabel(c.category)}</h1>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <StatusTrack status={c.status} />

      {c.duplicate_of && (
        <p className="alert info">
          This report was merged into <strong>{c.duplicate_of_code}</strong> because the same issue was
          already reported nearby. It follows that complaint's progress.
          {isAdmin && <> <Link to={`/complaints/${c.duplicate_of}`}>Open the original</Link></>}
        </p>
      )}

      {!isAdmin && c.status === 'resolved' && <ConfirmResolution complaintId={c.id} onChange={load} />}

      <div className="detail-grid">
        <div className="detail-main">
          <div className={`photos ${c.resolution_photo_url ? 'two' : ''}`}>
            <figure>
              <img src={fileUrl(c.photo_url)} alt="Issue as reported" />
              <figcaption>Reported</figcaption>
            </figure>
            {c.resolution_photo_url && (
              <figure>
                <img src={fileUrl(c.resolution_photo_url)} alt="After repair" />
                <figcaption>After repair</figcaption>
              </figure>
            )}
          </div>

          <section className="panel">
            <h2>Details</h2>
            <p>{c.description}</p>
            <dl className="facts">
              <dt>Location</dt>
              <dd>
                {c.address && <>{c.address}<br /></>}
                <a href={mapLink(c.latitude, c.longitude)} target="_blank" rel="noreferrer">
                  {Number(c.latitude).toFixed(5)}, {Number(c.longitude).toFixed(5)}
                </a>
              </dd>
              <dt>Reported</dt>
              <dd>{formatDateTime(c.created_at)} by {c.reporter_name}</dd>
              {isAdmin && (c.reporter_email || c.reporter_phone) && (
                <>
                  <dt>Contact</dt>
                  <dd>{[c.reporter_email, c.reporter_phone].filter(Boolean).join(', ')}</dd>
                </>
              )}
              <dt>Department</dt>
              <dd>{c.department_name || 'Not assigned yet'}</dd>
              {c.resolution_note && (
                <>
                  <dt>Work done</dt>
                  <dd>{c.resolution_note}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="panel">
            <h2>History</h2>
            <ol className="timeline">
              {history.map((h, i) => (
                <li key={i}>
                  <div className="timeline-top">
                    <StatusBadge status={h.status} />
                    <time className="muted small">{formatDateTime(h.created_at)}</time>
                  </div>
                  {h.note && <p>{h.note}</p>}
                  {h.changed_by_name && (
                    <p className="muted small">
                      by {h.changed_by_name}{h.changed_by_role === 'admin' ? ' (authority)' : ''}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {isAdmin && isOriginal && (
          <aside className="detail-side">
            <AdminActions key={c.status + c.department_id} complaint={c} onChange={load} />
            <PriorityBreakdown score={c.priority_score} level={c.priority_level} breakdown={c.priority_breakdown} />
            {duplicates.length > 0 && (
              <section className="panel">
                <h2>Also reported by {duplicates.length} other{duplicates.length === 1 ? '' : 's'}</h2>
                <ul className="dup-list">
                  {duplicates.map((d) => (
                    <li key={d.id}>
                      <img src={fileUrl(d.photo_url)} alt="" />
                      <div>
                        <strong>{d.complaint_code}</strong>
                        <p className="muted small">{d.reporter_name}, {formatDateTime(d.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
