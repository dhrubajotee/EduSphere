-- server/db/query/course.sql

-- name: CreateCourse :one
INSERT INTO courses (
  code, name, language, grading_scale, organiser,
  learning_outcomes, prerequisites, teacher_name, teacher_email, course_link
) VALUES (
  $1,   $2,   $3,       $4,            $5,
  $6,               $7,           $8,          $9,           $10
)
RETURNING *;

-- name: ListCourses :many
SELECT * FROM courses
ORDER BY id
LIMIT $1;

-- name: ListAllCourses :many
SELECT * FROM courses ORDER BY id ASC;
