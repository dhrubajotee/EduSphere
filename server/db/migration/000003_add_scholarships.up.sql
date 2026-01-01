-- db/migration/000003_add_scholarships.up.sql
-- Scholarships (per-user recommendations from web search + AI)
CREATE TABLE scholarships (
  id BIGSERIAL PRIMARY KEY,
  user_username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  match_score DOUBLE PRECISION,
  link TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX ON scholarships (user_username);
