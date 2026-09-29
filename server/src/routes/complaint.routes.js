const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { CATEGORIES } = require('../utils/constants');
const {
  uploadComplaintPhoto
} = require('../services/storage');
const {
  findDuplicateParent,
  recalcPriority,
  addHistory,
  updateCluster,
  withTransaction,
} = require('../utils/complaintService');

const router = express.Router();
router.use(requireAuth);

// Delete an uploaded file when the request fails validation

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, 'Invalid complaint id');
  return id;
}

// POST /api/complaints  (multipart/form-data with a "photo" file)
router.post(
  '/',
  requireRole('citizen'),
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    try {
      const category = req.body.category;
      const description = (req.body.description || '').trim();
      const address = (req.body.address || '').trim();
      const latitude = Number(req.body.latitude);
      const longitude = Number(req.body.longitude);

      if (!req.file) throw httpError(400, 'Add a photo of the issue');
      if (!CATEGORIES.includes(category)) throw httpError(400, 'Choose a valid category');
      if (description.length < 10) throw httpError(400, 'Describe the issue in at least 10 characters');
      if (description.length > 1000) throw httpError(400, 'Keep the description under 1000 characters');
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw httpError(400, 'Add the location of the issue');
      }
      const photoUrl = await uploadComplaintPhoto(req.file);
      const result = await withTransaction(async (db) => {
        const parent = await findDuplicateParent(db, { category, latitude, longitude });

        // Reserve the id first so the complaint code can include it
        const { rows: seq } = await db.query("SELECT nextval('complaints_id_seq') AS id");
        const id = Number(seq[0].id);
        const code = `CIV-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;

        // A duplicate follows its original's status and department
        const status = parent ? parent.status : 'submitted';
        const { rows } = await db.query(
          `INSERT INTO complaints
             (id, complaint_code, user_id, category, description, photo_url,
              latitude, longitude, address, status, department_id, duplicate_of)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING *`,
          [
            id, code, req.user.id, category, description, photoUrl,
            latitude, longitude, address || null, status,
            parent ? parent.department_id : null, parent ? parent.id : null,
          ]
        );

        if (parent) {
          await addHistory(db, id, status,
            `Same issue already reported as ${parent.complaint_code} ` +
            `(${Math.round(parent.distance)} m away). Your report was added to it.`, req.user.id);
          await db.query(
            'UPDATE complaints SET duplicate_count = duplicate_count + 1, updated_at = NOW() WHERE id = $1',
            [parent.id]
          );
          await recalcPriority(db, parent.id);
        } else {
          await addHistory(db, id, 'submitted', 'Complaint submitted', req.user.id);
          await recalcPriority(db, id);
        }

        return { complaint: rows[0], duplicateOf: parent ? parent.complaint_code : null };
      });

      res.status(201).json(result);
    } catch (err) {
  throw err;
}
  })
);

// GET /api/complaints/mine
router.get(
  '/mine',
  requireRole('citizen'),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT c.id, c.complaint_code, c.category, c.description, c.photo_url, c.address,
              c.status, c.created_at, c.updated_at, c.duplicate_of,
              p.complaint_code AS duplicate_of_code
         FROM complaints c
         LEFT JOIN complaints p ON p.id = c.duplicate_of
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ complaints: rows });
  })
);

// GET /api/complaints/:id  — the reporter or an admin
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await pool.query(
      `SELECT c.*, d.name AS department_name, p.complaint_code AS duplicate_of_code,
              u.name AS reporter_name, u.email AS reporter_email, u.phone AS reporter_phone
         FROM complaints c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN departments d ON d.id = c.department_id
         LEFT JOIN complaints p ON p.id = c.duplicate_of
        WHERE c.id = $1`,
      [id]
    );
    const complaint = rows[0];
    if (!complaint) throw httpError(404, 'Complaint not found');

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && complaint.user_id !== req.user.id) throw httpError(404, 'Complaint not found');

    if (!isAdmin) {
      delete complaint.reporter_email;
      delete complaint.reporter_phone;
    }

    const history = await pool.query(
      `SELECT h.status, h.note, h.created_at, u.name AS changed_by_name, u.role AS changed_by_role
         FROM complaint_history h
         LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.complaint_id = $1
        ORDER BY h.created_at ASC, h.id ASC`,
      [id]
    );

    // Admins see the other reports merged into this one
    let duplicates = [];
    if (isAdmin && !complaint.duplicate_of) {
      const dup = await pool.query(
        `SELECT c.id, c.complaint_code, c.photo_url, c.description, c.created_at, u.name AS reporter_name
           FROM complaints c JOIN users u ON u.id = c.user_id
          WHERE c.duplicate_of = $1 ORDER BY c.created_at`,
        [id]
      );
      duplicates = dup.rows;
    }

    res.json({ complaint, history: history.rows, duplicates });
  })
);

// POST /api/complaints/:id/confirm  { fixed: true|false, note }
// Phase 8 — the citizen confirms whether the repair actually fixed the issue
router.post(
  '/:id/confirm',
  requireRole('citizen'),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const fixed = req.body.fixed;
    const note = (req.body.note || '').trim();
    if (typeof fixed !== 'boolean') throw httpError(400, 'Say whether the issue is fixed');

    const { rows } = await pool.query('SELECT * FROM complaints WHERE id = $1', [id]);
    const complaint = rows[0];
    if (!complaint || complaint.user_id !== req.user.id) throw httpError(404, 'Complaint not found');
    if (complaint.status !== 'resolved') throw httpError(400, 'You can confirm only after the issue is marked resolved');
    if (!fixed && note.length < 5) throw httpError(400, 'Tell us what is still wrong');

    const rootId = complaint.duplicate_of || complaint.id;
    await withTransaction(async (db) => {
      if (fixed) {
        await updateCluster(db, rootId, { status: 'closed', citizen_confirmed: true },
          note || 'Citizen confirmed the issue is fixed', req.user.id);
      } else {
        await updateCluster(db, rootId, { status: 'reopened', citizen_confirmed: false, resolved_at: null },
          `Citizen says it is not fixed: ${note}`, req.user.id);
      }
    });

    res.json({ message: fixed ? 'Thanks for confirming. Complaint closed.' : 'Complaint reopened' });
  })
);

module.exports = router;
