// db/sqlc/store.go

package db

import (
	"context"
	"database/sql"
)

// Store defines all database methods we use in EduSphere.
type Store interface {
	Querier
}

// SQLStore provides all functions to execute DB queries and transactions.
type SQLStore struct {
	db *sql.DB
	*Queries
}

// NewStore creates a new store.
func NewStore(db *sql.DB) Store {
	return &SQLStore{
		db:      db,
		Queries: New(db),
	}
}

// execTx runs a function within a database transaction.
func (store *SQLStore) execTx(ctx context.Context, fn func(*Queries) error) error {
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	q := New(tx)
	err = fn(q)
	if err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return rbErr
		}
		return err
	}
	return tx.Commit()
}
