-- db/query/recommendation.sql
-- name: CreateRecommendation :one
INSERT INTO recommendations (
  user_username, transcript_id, summary, payload
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListRecommendations :many
SELECT id, user_username, transcript_id, summary, created_at
FROM recommendations
WHERE user_username = $1
ORDER BY id DESC;

-- name: GetRecommendation :one
SELECT * FROM recommendations WHERE id = $1 LIMIT 1;

-- name: UpdateRecommendationPayload :one
UPDATE recommendations
SET payload = $1
WHERE id = $2 AND user_username = $3
RETURNING *;