-- Smart Civic Issue Reporting & Resolution Platform
-- PostgreSQL schema

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role          VARCHAR(10) NOT NULL DEFAULT 'citizen'
                CHECK (role IN ('citizen', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Schools and hospitals used by the priority score (Phase 7)
CREATE TABLE IF NOT EXISTS landmarks (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(150) NOT NULL,
  type      VARCHAR(20) NOT NULL CHECK (type IN ('school', 'hospital')),
  latitude  DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  id                   SERIAL PRIMARY KEY,
  complaint_code       VARCHAR(20) NOT NULL UNIQUE,       -- e.g. CIV-2026-00042
  user_id              INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category             VARCHAR(30) NOT NULL
                       CHECK (category IN ('pothole', 'streetlight', 'garbage',
                                           'water_leakage', 'road_damage', 'other')),
  description          TEXT NOT NULL,
  photo_url            TEXT NOT NULL,
  latitude             DOUBLE PRECISION NOT NULL,
  longitude            DOUBLE PRECISION NOT NULL,
  address              TEXT,
  status               VARCHAR(20) NOT NULL DEFAULT 'submitted'
                       CHECK (status IN ('submitted', 'verified', 'assigned', 'in_progress',
                                         'resolved', 'closed', 'reopened', 'rejected')),
  department_id        INT REFERENCES departments(id),

  -- Duplicate detection (Phase 6): a duplicate points to the first report of the issue
  duplicate_of         INT REFERENCES complaints(id) ON DELETE SET NULL,
  duplicate_count      INT NOT NULL DEFAULT 0,

  -- Priority (Phase 7)
  priority_score       NUMERIC(5,1) NOT NULL DEFAULT 0,
  priority_level       VARCHAR(10) NOT NULL DEFAULT 'low'
                       CHECK (priority_level IN ('low', 'medium', 'high')),
  priority_breakdown   JSONB,

  -- Resolution (Phase 8)
  resolution_photo_url TEXT,
  resolution_note      TEXT,
  citizen_confirmed    BOOLEAN,           -- NULL = citizen has not answered yet
  resolved_at          TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_user     ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status   ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_dup      ON complaints(duplicate_of);

-- Every status change is recorded here (complaint history / timeline)
CREATE TABLE IF NOT EXISTS complaint_history (
  id           SERIAL PRIMARY KEY,
  complaint_id INT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL,
  note         TEXT,
  changed_by   INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_complaint ON complaint_history(complaint_id);
