-- db/query/transcript.sql
-- name: CreateTranscript :one
INSERT INTO transcripts (
  user_username, file_path, text_extracted, meta
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListTranscripts :many
SELECT id, user_username, file_path, created_at
FROM transcripts
WHERE user_username = $1
ORDER BY id DESC;

-- name: GetTranscript :one
SELECT * FROM transcripts WHERE id = $1 LIMIT 1;
