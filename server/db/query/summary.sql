-- db/query/summary.sql
-- name: CreateSummary :one
INSERT INTO summaries (
  user_username, recommendation_id, summary_text, pdf_path
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListSummaries :many
SELECT *
FROM summaries
WHERE user_username = $1
ORDER BY created_at DESC;

-- name: GetSummary :one
SELECT *
FROM summaries
WHERE id = $1
  AND user_username = $2
LIMIT 1;

-- name: DeleteSummary :exec
DELETE FROM summaries
WHERE id = $1
  AND user_username = $2;
