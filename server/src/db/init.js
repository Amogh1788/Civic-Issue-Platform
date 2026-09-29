// Creates all tables. Run with: npm run db:init
// Pass --reset to drop everything first (deletes all data!).
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function init() {
  const reset = process.argv.includes('--reset');
  try {
    if (reset) {
      await pool.query(`
        DROP TABLE IF EXISTS complaint_history, complaints, landmarks, departments, users CASCADE;
      `);
      console.log('Dropped existing tables');
    }
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Database schema is ready');
  } catch (err) {
    console.error('Failed to create schema:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

init();
