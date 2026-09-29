const { distanceMeters } = require('./geo');

// Points for how serious each category is (max 20)
const SEVERITY = {
  pothole: 20,
  water_leakage: 18,
  road_damage: 16,
  streetlight: 12,
  garbage: 10,
  other: 5,
};

// Landmarks further than this add no points
const LANDMARK_RANGE_METERS = 1000;

function nearest(complaint, landmarks, type) {
  let best = null;
  for (const l of landmarks) {
    if (l.type !== type) continue;
    const d = distanceMeters(complaint.latitude, complaint.longitude, l.latitude, l.longitude);
    if (!best || d < best.distance) best = { name: l.name, distance: d };
  }
  return best;
}

// Closer = more points. 0 m gives max points, LANDMARK_RANGE_METERS or more gives 0.
function proximityPoints(near, max) {
  if (!near || near.distance >= LANDMARK_RANGE_METERS) return 0;
  return round(max * (1 - near.distance / LANDMARK_RANGE_METERS));
}

const round = (n) => Math.round(n * 10) / 10;

/**
 * Priority score out of 100:
 *   duplicates  up to 30  (10 points per extra report)
 *   age         up to 20  (2 points per day open)
 *   school      up to 15  (closer = more)
 *   hospital    up to 15  (closer = more)
 *   severity    up to 20  (depends on category)
 * Level: high >= 60, medium >= 35, otherwise low.
 * The breakdown is saved so the dashboard can show why a complaint ranks where it does.
 */
function computePriority(complaint, landmarks, now = new Date()) {
  const ageDays = Math.max(0, (now - new Date(complaint.created_at)) / 86400000);
  const school = nearest(complaint, landmarks, 'school');
  const hospital = nearest(complaint, landmarks, 'hospital');

  const breakdown = [
    {
      factor: 'Duplicate reports',
      points: Math.min(complaint.duplicate_count * 10, 30),
      max: 30,
      detail: `${complaint.duplicate_count} other citizen(s) reported this`,
    },
    {
      factor: 'Complaint age',
      points: round(Math.min(ageDays * 2, 20)),
      max: 20,
      detail: `Open for ${Math.floor(ageDays)} day(s)`,
    },
    {
      factor: 'Near a school',
      points: proximityPoints(school, 15),
      max: 15,
      detail: school ? `${Math.round(school.distance)} m from ${school.name}` : 'No schools on record',
    },
    {
      factor: 'Near a hospital',
      points: proximityPoints(hospital, 15),
      max: 15,
      detail: hospital ? `${Math.round(hospital.distance)} m from ${hospital.name}` : 'No hospitals on record',
    },
    {
      factor: 'Issue severity',
      points: SEVERITY[complaint.category] ?? 5,
      max: 20,
      detail: `Category: ${complaint.category.replace('_', ' ')}`,
    },
  ];

  const score = round(breakdown.reduce((sum, b) => sum + b.points, 0));
  const level = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';

  return { score, level, breakdown };
}

module.exports = { computePriority };
