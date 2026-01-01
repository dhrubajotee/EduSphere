-- db/migration/000002_courses_recos.up.sql

-- Courses master table
CREATE TABLE courses (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  language VARCHAR,
  grading_scale VARCHAR,
  organiser VARCHAR,
  learning_outcomes TEXT,
  prerequisites TEXT,
  teacher_name VARCHAR,
  teacher_email VARCHAR,
  course_link TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ON courses(code);

-- Transcripts (uploads)
CREATE TABLE transcripts (
  id BIGSERIAL PRIMARY KEY,
  user_username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  text_extracted TEXT,              -- full extracted text
  meta JSONB DEFAULT '{}'::jsonb,   -- extra metadata (pages, ocr_used, etc.)
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Recommendations (one row per run)
CREATE TABLE recommendations (
  id BIGSERIAL PRIMARY KEY,
  user_username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  transcript_id BIGINT REFERENCES transcripts(id) ON DELETE SET NULL,
  summary TEXT,                     -- short text summary we show in UI
  payload JSONB NOT NULL,           -- full JSON (top courses with scores/rationales, scholarships later)
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Saved summaries (AI text + downloadable PDFs)
CREATE TABLE summaries (
  id BIGSERIAL PRIMARY KEY,
  user_username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  recommendation_id BIGINT REFERENCES recommendations(id) ON DELETE CASCADE, -- now optional
  summary_text TEXT,                           -- new: store AI-generated summary text
  pdf_path TEXT,                               -- still used for generated PDF file path
  created_at TIMESTAMP NOT NULL DEFAULT now()
);


-- Helpful indexes
CREATE INDEX ON transcripts(user_username);
CREATE INDEX ON recommendations(user_username);
CREATE INDEX ON summaries(user_username);