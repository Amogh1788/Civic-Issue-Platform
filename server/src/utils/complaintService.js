const pool = require('../db/pool');
const { duplicateRadius } = require('../config');
const { distanceMeters, boundingBox } = require('./geo');
const { computePriority } = require('./priority');
const { FINAL_STATUSES } = require('./constants');

/**
 * Phase 6 — duplicate detection (location based).
 * Looks for an open, original complaint of the same category within DUPLICATE_RADIUS_METERS.
 * Resolved complaints are skipped: a new report there is a fresh problem, not a duplicate.
 * Returns the nearest match with its distance, or null.
 */
async function findDuplicateParent(db, { category, latitude, longitude }) {
  const box = boundingBox(latitude, longitude, duplicateRadius);
  const { rows } = await db.query(
    `SELECT id, complaint_code, latitude, longitude, status, department_id
       FROM complaints
      WHERE category = $1
        AND duplicate_of IS NULL
        AND status <> ALL($2)
        AND status <> 'resolved'
        AND latitude  BETWEEN $3 AND $4
        AND longitude BETWEEN $5 AND $6`,
    [category, FINAL_STATUSES, box.minLat, box.maxLat, box.minLon, box.maxLon]
  );

  let best = null;
  for (const row of rows) {
    const d = distanceMeters(latitude, longitude, row.latitude, row.longitude);
    if (d <= duplicateRadius && (!best || d < best.distance)) best = { ...row, distance: d };
  }
  return best;
}

async function getLandmarks(db) {
  const { rows } = await db.query('SELECT name, type, latitude, longitude FROM landmarks');
  return rows;
}

// Phase 7 — recompute and store the priority of one complaint
async function recalcPriority(db, complaintId, landmarks) {
  const { rows } = await db.query('SELECT * FROM complaints WHERE id = $1', [complaintId]);
  if (!rows[0]) return;
  const p = computePriority(rows[0], landmarks || (await getLandmarks(db)));
  await db.query(
    `UPDATE complaints
        SET priority_score = $1, priority_level = $2, priority_breakdown = $3
      WHERE id = $4`,
    [p.score, p.level, JSON.stringify(p.breakdown), complaintId]
  );
}

// Age changes every day, so refresh all open original complaints (called by the admin list)
async function refreshOpenPriorities() {
  const landmarks = await getLandmarks(pool);
  const { rows } = await pool.query(
    `SELECT * FROM complaints
      WHERE duplicate_of IS NULL AND status <> ALL($1) AND status <> 'resolved'`,
    [FINAL_STATUSES]
  );
  for (const c of rows) {
    const p = computePriority(c, landmarks);
    await pool.query(
      `UPDATE complaints SET priority_score = $1, priority_level = $2, priority_breakdown = $3
        WHERE id = $4`,
      [p.score, p.level, JSON.stringify(p.breakdown), c.id]
    );
  }
}

async function addHistory(db, complaintId, status, note, userId) {
  await db.query(
    `INSERT INTO complaint_history (complaint_id, status, note, changed_by)
     VALUES ($1, $2, $3, $4)`,
    [complaintId, status, note || null, userId || null]
  );
}

/**
 * Updates the original complaint AND every duplicate linked to it, so every citizen
 * who reported the same issue sees the same progress.
 * `fields` is an object of column -> value, and must include `status`.
 */
async function updateCluster(db, rootId, fields, note, userId) {
  const columns = Object.keys(fields);
  const sets = columns.map((col, i) => `${col} = $${i + 1}`);
  const values = columns.map((col) => fields[col]);

  const { rows } = await db.query(
    `UPDATE complaints
        SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${columns.length + 1} OR duplicate_of = $${columns.length + 1}
      RETURNING id`,
    [...values, rootId]
  );

  for (const row of rows) {
    await addHistory(db, row.id, fields.status, note, userId);
  }
}

// Wraps work in a transaction: await withTransaction(async (client) => { ... })
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  findDuplicateParent,
  getLandmarks,
  recalcPriority,
  refreshOpenPriorities,
  addHistory,
  updateCluster,
  withTransaction,
};
