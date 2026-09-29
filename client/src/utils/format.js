export const CATEGORIES = [
  { value: 'pothole', label: 'Pothole', icon: '🕳️' },
  { value: 'streetlight', label: 'Streetlight', icon: '💡' },
  { value: 'garbage', label: 'Garbage', icon: '🗑️' },
  { value: 'water_leakage', label: 'Water leakage', icon: '💧' },
  { value: 'road_damage', label: 'Road damage', icon: '🚧' },
  { value: 'other', label: 'Other', icon: '📍' },
];

export const STATUS_LABELS = {
  submitted: 'Submitted',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
  rejected: 'Rejected',
};

export const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label || value;
export const categoryIcon = (value) => CATEGORIES.find((c) => c.value === value)?.icon || '📍';

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });

export const mapLink = (lat, lng) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

// Average resolution time from hours: "Under 1 h", "5 h", "3 days"
export function formatDuration(hours) {
  if (hours == null) return 'None yet';
  if (hours < 1) return 'Under 1 h';
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}
