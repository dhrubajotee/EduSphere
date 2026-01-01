// db/sqlc/nullable.go
package db

import "database/sql"

func Int64ToNull(v int64) sql.NullInt64 {
	return sql.NullInt64{Int64: v, Valid: true}
}
