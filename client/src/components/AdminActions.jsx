import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';

// The next steps an authority can take, depending on the complaint's current status
export default function AdminActions({ complaint, onChange }) {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState(complaint.department_id || '');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/departments').then(({ data }) => setDepartments(data.departments)).catch(() => {});
  }, []);

  async function run(request) {
    setBusy(true);
    setError('');
    try {
      await request();
      setNote('');
      setPhoto(null);
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (status) => run(() => api.patch(`/admin/complaints/${complaint.id}/status`, { status, note }));
  const assign = () => {
    if (!departmentId) return setError('Choose a department');
    run(() => api.patch(`/admin/complaints/${complaint.id}/assign`, { departmentId, note }));
  };
  const resolve = () => {
    if (!photo) return setError('Add an after-repair photo');
    const data = new FormData();
    data.append('photo', photo);
    data.append('note', note);
    run(() => api.post(`/admin/complaints/${complaint.id}/resolve`, data));
  };

  const { status } = complaint;
  const canAssign = ['verified', 'assigned', 'in_progress', 'reopened'].includes(status);

  if (['resolved', 'closed', 'rejected'].includes(status)) {
    const text = {
      resolved: 'Waiting for the citizen to confirm the repair.',
      closed: 'The citizen confirmed the fix. Nothing left to do.',
      rejected: 'This complaint was rejected.',
    }[status];
    return <section className="panel"><h2>Actions</h2><p className="muted">{text}</p></section>;
  }

  return (
    <section className="panel admin-actions">
      <h2>Actions</h2>
      {error && <p className="alert error" role="alert">{error}</p>}

      <label>
        Note {status === 'in_progress' ? '(describe the work done)' : <span className="optional">optional, shown to the citizen</span>}
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {status === 'submitted' && (
        <div className="actions">
          <button className="btn primary" disabled={busy} onClick={() => setStatus('verified')}>Verify complaint</button>
          <button className="btn danger" disabled={busy} onClick={() => setStatus('rejected')}>Reject</button>
        </div>
      )}

      {canAssign && (
        <div className="assign-row">
          <label>
            Department
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Choose a department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <button className="btn" disabled={busy} onClick={assign}>
            {complaint.department_id ? 'Reassign' : 'Assign'}
          </button>
        </div>
      )}

      {status === 'verified' && (
        <div className="actions">
          <button className="btn danger" disabled={busy} onClick={() => setStatus('rejected')}>Reject</button>
        </div>
      )}

      {['assigned', 'reopened'].includes(status) && (
        <div className="actions">
          <button className="btn primary" disabled={busy} onClick={() => setStatus('in_progress')}>Start work</button>
        </div>
      )}

      {status === 'in_progress' && (
        <div className="resolve-box">
          <label>
            After-repair photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files[0])} />
          </label>
          <button className="btn primary" disabled={busy} onClick={resolve}>Mark resolved</button>
        </div>
      )}
    </section>
  );
}
