const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

// Checks the "Authorization: Bearer <token>" header and puts the user on req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Log in to continue' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Log in again.' });
  }
}

// Use after requireAuth: requireRole('admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
