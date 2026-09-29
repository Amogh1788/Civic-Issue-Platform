const { Pool, types } = require('pg');
const { databaseUrl } = require('../config');

// PostgreSQL NUMERIC (type id 1700) comes back as a string by default; return a number instead
types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value)));

const pool = new Pool({ connectionString: databaseUrl });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

module.exports = pool;
