import { PriorityBadge } from './Badges';

// Shows why a complaint got its priority score (Phase 7 explainability)
export default function PriorityBreakdown({ score, level, breakdown }) {
  if (!breakdown) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Priority</h2>
        <PriorityBadge level={level} score={score} />
      </div>
      <ul className="breakdown">
        {breakdown.map((b) => (
          <li key={b.factor}>
            <div className="breakdown-top">
              <span>{b.factor}</span>
              <span className="breakdown-points">{b.points} / {b.max}</span>
            </div>
            <div className="meter" aria-hidden="true">
              <span style={{ width: `${(b.points / b.max) * 100}%` }} />
            </div>
            <p className="muted small">{b.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
