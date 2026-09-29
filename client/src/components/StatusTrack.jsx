import { STATUS_LABELS } from '../utils/format';

const STEPS = ['submitted', 'verified', 'assigned', 'in_progress', 'resolved', 'closed'];

// A complaint's journey as a sequence of steps. Rejected complaints stop early;
// reopened ones go back to the "in progress" step.
export default function StatusTrack({ status }) {
  if (status === 'rejected') {
    return <p className="track-note rejected">This complaint was rejected. See the history below for the reason.</p>;
  }

  // Closed is the end of the journey, so every step is complete
  const current =
    status === 'closed' ? STEPS.length
    : status === 'reopened' ? STEPS.indexOf('in_progress')
    : STEPS.indexOf(status);

  return (
    <>
      <ol className="track">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className={i < current ? 'done' : i === current ? 'current' : ''}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="track-dot">{i < current ? '✓' : i + 1}</span>
            <span className="track-label">{STATUS_LABELS[step]}</span>
          </li>
        ))}
      </ol>
      {status === 'reopened' && (
        <p className="track-note">Reopened because the reporter said the issue is not fixed yet.</p>
      )}
    </>
  );
}
