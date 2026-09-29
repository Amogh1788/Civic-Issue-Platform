import { useState } from 'react';
import api, { errorMessage } from '../api/client';

// Phase 8: the citizen says whether the repair actually fixed the issue
export default function ConfirmResolution({ complaintId, onChange }) {
  const [showReason, setShowReason] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(fixed) {
    setBusy(true);
    setError('');
    try {
      await api.post(`/complaints/${complaintId}/confirm`, { fixed, note });
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel confirm-box">
      <h2>Is it fixed?</h2>
      <p>The authority marked this issue resolved. Compare the photos, or check the spot yourself.</p>
      {error && <p className="alert error" role="alert">{error}</p>}

      {showReason ? (
        <>
          <label>
            What is still wrong?
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="actions">
            <button className="btn danger" disabled={busy} onClick={() => send(false)}>Reopen complaint</button>
            <button className="btn" disabled={busy} onClick={() => setShowReason(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <div className="actions">
          <button className="btn primary" disabled={busy} onClick={() => send(true)}>Yes, it's fixed</button>
          <button className="btn" disabled={busy} onClick={() => setShowReason(true)}>No, still a problem</button>
        </div>
      )}
    </section>
  );
}
