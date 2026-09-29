const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { jwtSecret, jwtExpiresIn } = require('../config');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/errorHandler');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,20}$/;

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, createdAt: u.created_at };
}

// POST /api/auth/register  — citizens only; admins are created by the seed script
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim();
    const password = req.body.password || '';

    if (name.length < 2) throw httpError(400, 'Enter your full name');
    if (!EMAIL_RE.test(email)) throw httpError(400, 'Enter a valid email address');
    if (phone && !PHONE_RE.test(phone)) throw httpError(400, 'Enter a valid phone number');
    if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) throw httpError(409, 'An account with this email already exists');

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'citizen') RETURNING *`,
      [name, email, phone || null, hash]
    );

    res.status(201).json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    if (!email || !password) throw httpError(400, 'Enter your email and password');

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) throw httpError(401, 'Email or password is incorrect');

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) throw httpError(404, 'Account not found');

    const stats = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('resolved','closed'))::int AS resolved
         FROM complaints WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({ user: publicUser(rows[0]), stats: stats.rows[0] });
  })
);

// PUT /api/auth/me  — update name / phone
router.put(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const name = (req.body.name || '').trim();
    const phone = (req.body.phone || '').trim();
    if (name.length < 2) throw httpError(400, 'Enter your full name');
    if (phone && !PHONE_RE.test(phone)) throw httpError(400, 'Enter a valid phone number');

    const { rows } = await pool.query(
      'UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING *',
      [name, phone || null, req.user.id]
    );
    res.json({ user: publicUser(rows[0]) });
  })
);

module.exports = router;
