const CATEGORIES = ['pothole', 'streetlight', 'garbage', 'water_leakage', 'road_damage', 'other'];

const STATUSES = [
  'submitted', 'verified', 'assigned', 'in_progress',
  'resolved', 'closed', 'reopened', 'rejected',
];

// Complaints in these states no longer need work
const FINAL_STATUSES = ['closed', 'rejected'];

// Which status an admin may set with PATCH /admin/complaints/:id/status.
// Other moves have their own routes because they need extra data:
//   verified -> assigned      PATCH /admin/complaints/:id/assign  (needs a department)
//   in_progress -> resolved   POST  /admin/complaints/:id/resolve (needs an after-repair photo)
//   resolved -> closed/reopened  set by the citizen's confirmation
const ADMIN_TRANSITIONS = {
  submitted: ['verified', 'rejected'],
  verified: ['rejected'],
  assigned: ['in_progress'],
  in_progress: [],
  reopened: ['in_progress'],
  resolved: [],
  closed: [],
  rejected: [],
};

module.exports = { CATEGORIES, STATUSES, FINAL_STATUSES, ADMIN_TRANSITIONS };
