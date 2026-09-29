import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { CodeTag, PriorityBadge, StatusBadge } from '../components/Badges';
import { CATEGORIES, STATUS_LABELS, categoryLabel, formatDate, formatDuration } from '../utils/format';

const EMPTY_FILTERS = { status: 'open', category: '', priority: '', search: '', sort: 'priority' };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Wait until the admin stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search })), 350);
    return () => clearTimeout(t);
  }, [search]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const [list, s] = await Promise.all([
        api.get('/admin/complaints', { params }),
        api.get('/admin/stats'),
      ]);
      setComplaints(list.data.complaints);
      setStats(s.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filters]);

  const setFilter = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  return (
    <div>
      <div className="page-head">
        <h1>Complaints</h1>
        <button className="btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {stats && (
        <div className="stats">
          <Stat value={stats.pending} label="Waiting for action" />
          <Stat value={stats.high_priority} label="High priority" tone="danger" />
          <Stat value={stats.resolved} label="Resolved" tone="ok" />
          <Stat value={stats.issues} label="Issues reported" />
          <Stat value={stats.duplicates_merged} label="Duplicate reports merged" />
          <Stat
            value={formatDuration(stats.avg_resolution_hours)}
            label="Average time to resolve"
          />
        </div>
      )}

      <div className="filters">
        <input
          type="search"
          placeholder="Search by ID, description or address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search complaints"
        />
        <select name="status" value={filters.status} onChange={setFilter} aria-label="Status">
          <option value="open">Still open</option>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="category" value={filters.category} onChange={setFilter} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select name="priority" value={filters.priority} onChange={setFilter} aria-label="Priority">
          <option value="">Any priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select name="sort" value={filters.sort} onChange={setFilter} aria-label="Sort">
          <option value="priority">Sort: priority</option>
          <option value="newest">Sort: newest</option>
          <option value="oldest">Sort: oldest</option>
        </select>
      </div>

      {error && <p className="alert error" role="alert">{error}</p>}

      {!loading && !error && complaints.length === 0 && (
        <div className="empty">
          <h2>No complaints match these filters</h2>
          <button className="btn" onClick={() => { setSearch(''); setFilters(EMPTY_FILTERS); }}>Clear filters</button>
        </div>
      )}

      {complaints.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Issue</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reports</th>
                <th>Department</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/complaints/${c.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/complaints/${c.id}`)}
                  tabIndex={0}
                >
                  <td><CodeTag code={c.complaint_code} /></td>
                  <td>
                    <strong>{categoryLabel(c.category)}</strong>
                    <span className="muted small cell-sub">{c.address || c.description}</span>
                  </td>
                  <td><PriorityBadge level={c.priority_level} score={c.priority_score} /></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="num">{c.duplicate_count + 1}</td>
                  <td>{c.department_name || <span className="muted">None</span>}</td>
                  <td>{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
