require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in server/.env (copy .env.example to .env first)`);
    process.exit(1);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@civic.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
  duplicateRadius: Number(process.env.DUPLICATE_RADIUS_METERS) || 50,
};
