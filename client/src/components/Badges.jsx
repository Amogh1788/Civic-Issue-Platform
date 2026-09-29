import { STATUS_LABELS } from '../utils/format';

export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

export function PriorityBadge({ level, score }) {
  return (
    <span className={`badge priority-${level}`}>
      {level[0].toUpperCase() + level.slice(1)}
      {score !== undefined && <span className="badge-score">{Math.round(score)}</span>}
    </span>
  );
}

// The complaint ID, styled like a painted road-marking tag
export function CodeTag({ code }) {
  return <span className="code-tag">{code}</span>;
}
