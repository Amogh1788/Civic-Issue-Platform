// Adds the admin account, departments and sample landmarks.
// Safe to run more than once. Run with: npm run db:seed
const bcrypt = require('bcryptjs');
const pool = require('./pool');
const { adminEmail, adminPassword } = require('../config');

const departments = [
  'Roads & Potholes',
  'Street Lighting',
  'Solid Waste Management',
  'Water Supply',
  'General Maintenance',
];

// SAMPLE landmarks around Vile Parle, Mumbai.
// Replace these with real schools/hospitals from your area
// (right-click a spot in Google Maps to copy its coordinates).
const landmarks = [
  { name: 'Sample School A', type: 'school', latitude: 19.1030, longitude: 72.8370 },
  { name: 'Sample School B', type: 'school', latitude: 19.0990, longitude: 72.8440 },
  { name: 'Sample School C', type: 'school', latitude: 19.1120, longitude: 72.8410 },
  { name: 'Sample Hospital A', type: 'hospital', latitude: 19.1060, longitude: 72.8350 },
  { name: 'Sample Hospital B', type: 'hospital', latitude: 19.0960, longitude: 72.8480 },
];

async function seed() {
  try {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Municipal Admin', $1, $2, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [adminEmail.toLowerCase(), hash]
    );

    for (const name of departments) {
      await pool.query(
        'INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    }

    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM landmarks');
    if (rows[0].count === 0) {
      for (const l of landmarks) {
        await pool.query(
          'INSERT INTO landmarks (name, type, latitude, longitude) VALUES ($1, $2, $3, $4)',
          [l.name, l.type, l.latitude, l.longitude]
        );
      }
    }

    console.log('Seed complete');
    console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
