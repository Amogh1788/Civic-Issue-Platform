const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { CATEGORIES, STATUSES, ADMIN_TRANSITIONS } = require('../utils/constants');
const { refreshOpenPriorities, updateCluster, withTransaction } = require('../utils/complaintService');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, 'Invalid complaint id');
  return id;
}

// Admins work on the original report; duplicates follow it automatically
async function getOriginal(id) {
  const { rows } = await pool.query('SELECT * FROM complaints WHERE id = $1', [id]);
  const complaint = rows[0];
  if (!complaint) throw httpError(404, 'Complaint not found');
  if (complaint.duplicate_of) {
    throw httpError(400, 'This report is a duplicate. Update the original complaint instead.');
  }
  return complaint;
}

// GET /api/admin/complaints?status=&category=&priority=&search=&sort=priority|newest|oldest
router.get(
  '/complaints',
  asyncHandler(async (req, res) => {
    await refreshOpenPriorities();

    const { status, category, priority, search, sort } = req.query;
    const where = ['c.duplicate_of IS NULL'];
    const params = [];

    if (status) {
      if (status === 'open') {
        where.push("c.status NOT IN ('resolved','closed','rejected')");
      } else {
        if (!STATUSES.includes(status)) throw httpError(400, 'Unknown status');
        params.push(status);
        where.push(`c.status = $${params.length}`);
      }
    }
    if (category) {
      if (!CATEGORIES.includes(category)) throw httpError(400, 'Unknown category');
      params.push(category);
      where.push(`c.category = $${params.length}`);
    }
    if (priority) {
      if (!['low', 'medium', 'high'].includes(priority)) throw httpError(400, 'Unknown priority');
      params.push(priority);
      where.push(`c.priority_level = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      where.push(`(c.complaint_code ILIKE $${params.length} OR c.description ILIKE $${params.length}
                   OR c.address ILIKE $${params.length})`);
    }

    const orderBy = {
      newest: 'c.created_at DESC',
      oldest: 'c.created_at ASC',
      priority: 'c.priority_score DESC, c.created_at ASC',
    }[sort] || 'c.priority_score DESC, c.created_at ASC';

    const { rows } = await pool.query(
      `SELECT c.id, c.complaint_code, c.category, c.description, c.photo_url, c.address,
              c.latitude, c.longitude, c.status, c.priority_score, c.priority_level,
              c.duplicate_count, c.created_at, d.name AS department_name, u.name AS reporter_name
         FROM complaints c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN departments d ON d.id = c.department_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT 200`,
      params
    );

    res.json({ complaints: rows });
  })
);

// GET /api/admin/stats  — numbers for the dashboard cards (Phase 11, basic)
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const totals = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE duplicate_of IS NULL)::int AS issues,
             COUNT(*) FILTER (WHERE duplicate_of IS NOT NULL)::int AS duplicates_merged,
             COUNT(*) FILTER (WHERE duplicate_of IS NULL
                              AND status NOT IN ('resolved','closed','rejected'))::int AS pending,
             COUNT(*) FILTER (WHERE duplicate_of IS NULL AND status IN ('resolved','closed'))::int AS resolved,
             COUNT(*) FILTER (WHERE duplicate_of IS NULL AND priority_level = 'high'
                              AND status NOT IN ('resolved','closed','rejected'))::int AS high_priority,
             ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
                   FILTER (WHERE duplicate_of IS NULL AND resolved_at IS NOT NULL)::numeric, 1)
                   AS avg_resolution_hours
        FROM complaints`);

    const byCategory = await pool.query(`
      SELECT category, COUNT(*)::int AS count
        FROM complaints WHERE duplicate_of IS NULL
       GROUP BY category ORDER BY count DESC`);

    const byDepartment = await pool.query(`
      SELECT d.name,
             COUNT(c.id)::int AS assigned,
             COUNT(c.id) FILTER (WHERE c.status IN ('resolved','closed'))::int AS resolved
        FROM departments d
        LEFT JOIN complaints c ON c.department_id = d.id AND c.duplicate_of IS NULL
       GROUP BY d.id ORDER BY d.name`);

    res.json({
      ...totals.rows[0],
      by_category: byCategory.rows,
      by_department: byDepartment.rows,
    });
  })
);

// GET /api/admin/departments
router.get(
  '/departments',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT id, name FROM departments ORDER BY name');
    res.json({ departments: rows });
  })
);

// PATCH /api/admin/complaints/:id/status  { status, note }
router.patch(
  '/complaints/:id/status',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const next = req.body.status;
    const note = (req.body.note || '').trim();
    const complaint = await getOriginal(id);

    const allowed = ADMIN_TRANSITIONS[complaint.status] || [];
    if (!allowed.includes(next)) {
      throw httpError(400, `Cannot change status from "${complaint.status}" to "${next}"`);
    }
    if (next === 'rejected' && note.length < 5) {
      throw httpError(400, 'Give a reason for rejecting this complaint');
    }

    const defaultNotes = {
      verified: 'Complaint verified by the authority',
      in_progress: 'Work has started',
    };

    await withTransaction((db) =>
      updateCluster(db, id, { status: next }, note || defaultNotes[next], req.user.id)
    );
    res.json({ message: 'Status updated' });
  })
);

// PATCH /api/admin/complaints/:id/assign  { departmentId, note }
router.patch(
  '/complaints/:id/assign',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const departmentId = Number(req.body.departmentId);
    const note = (req.body.note || '').trim();
    const complaint = await getOriginal(id);

    if (!['verified', 'assigned', 'in_progress', 'reopened'].includes(complaint.status)) {
      throw httpError(400, 'Verify the complaint before assigning it');
    }

    const dept = await pool.query('SELECT id, name FROM departments WHERE id = $1', [departmentId]);
    if (!dept.rows[0]) throw httpError(400, 'Choose a department');

    // First assignment moves the status to "assigned"; later ones just change the department
    const status = complaint.status === 'verified' ? 'assigned' : complaint.status;
    const verb = complaint.department_id ? 'Reassigned' : 'Assigned';

    await withTransaction((db) =>
      updateCluster(db, id, { status, department_id: departmentId },
        note || `${verb} to ${dept.rows[0].name}`, req.user.id)
    );
    res.json({ message: `${verb} to ${dept.rows[0].name}` });
  })
);

// POST /api/admin/complaints/:id/resolve  (multipart: "photo" = after-repair photo, "note")
router.post(
  '/complaints/:id/resolve',
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const note = (req.body.note || '').trim();
      const complaint = await getOriginal(id);

      if (complaint.status !== 'in_progress') throw httpError(400, 'Only complaints in progress can be resolved');
      if (!req.file) throw httpError(400, 'Add an after-repair photo');
      if (note.length < 5) throw httpError(400, 'Describe the work that was done');

      await withTransaction((db) =>
        updateCluster(db, id, {
          status: 'resolved',
          resolution_photo_url: `/uploads/${req.file.filename}`,
          resolution_note: note,
          resolved_at: new Date(),
          citizen_confirmed: null,
        }, `Marked resolved: ${note}`, req.user.id)
      );
      res.json({ message: 'Marked resolved. Waiting for the citizen to confirm.' });
    } catch (err) {
      if (req.file) fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
      throw err;
    }
  })
);

module.exports = router;
