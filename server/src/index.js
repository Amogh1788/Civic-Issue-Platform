const express = require('express');
const cors = require('cors');
const config = require('./config');
const pool = require('./db/pool');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const complaintRoutes = require('./routes/complaint.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: '100kb' }));

// Quick check that the server and database are both up
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', database: 'not connected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`API running on http://localhost:${config.port}`);
  });
}

module.exports = app;