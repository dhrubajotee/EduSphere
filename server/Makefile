# To create and manage a local PostgreSQL database using Docker
postgres:
	docker run --name postgres18rc1 -p 5432:5432 -e POSTGRES_USER=root -e POSTGRES_PASSWORD=secret -d postgres:18rc1-alpine

# To Create a new database named simple_bank
createdb: 
	docker exec -it postgres18rc1 createdb --username=root --owner=root simple_bank

# To Drop the database named simple_bank
dropdb: 
	docker exec -it postgres18rc1 dropdb simple_bank

# To enter the PostgreSQL interactive terminal
psql:
	docker exec -it postgres18rc1 psql -U root -d simple_bank

# To create migration files using the migrate tool. Here, we are creating an initial migration file named init_schema. Later use new name for new migration files.
migratenew:
	migrate create -ext sql -dir db/migration -seq init_schema

# To run database migrations using the migrate tool located at db/migration directory locally.
migrateup:
	migrate -path db/migration -database "postgresql://root:secret@localhost:5432/simple_bank?sslmode=disable" -verbose up

# To run only the first migration file
migrateup1:
	migrate -path db/migration -database "postgresql://root:secret@localhost:5432/simple_bank?sslmode=disable" -verbose up 1	

migratedown:
	migrate -path db/migration -database "postgresql://root:secret@localhost:5432/simple_bank?sslmode=disable" -verbose down

# To run only the first down migration file
migratedown1:
	migrate -path db/migration -database "postgresql://root:secret@localhost:5432/simple_bank?sslmode=disable" -verbose down 1

# To generate Go code from SQL queries using sqlc
sqlc:
	sqlc generate

# To generate mock implementations of the Store interface using mockgen
mock:
	mockgen -package mockdb -destination db/mock/store.go github.com/nibir1/go-fiber-postgres-REST-boilerplate/db/sqlc Store

# To seed the database with initial course data
seedCourses:
	go run db/seed/seed_courses.go

# To run Go tests with verbose output and code coverage
test:
	go test -v -cover ./...

# To test the local web search API endpoint
websearch-test:
	@echo "Testing Brave web search endpoint..."
	curl -s -H "X-Subscription-Token: $(BRAVE_API_KEY)" \
	     "http://localhost:8080/api/websearch?q=AI+scholarships" | jq

# To test the Brave Search API directly
brave-direct-test:
	@echo "Querying Brave Search API directly..."
	curl -s -H "X-Subscription-Token: ${BRAVE_API_KEY}" \
	     "https://api.search.brave.com/res/v1/web/search?q=AI+scholarships" | jq


# To run the Go server application
server:
	go run main.go

# To generate Swagger documentation
swagger:
	swag init

# Force rebuild to ensure dependencies are fresh
build:
	docker-compose build --no-cache
	docker-compose up -d
	@echo "✅ Application running at http://localhost:3000"

up:
	docker-compose up -d
	@echo "✅ Application running at http://localhost:3000"

down:
	docker-compose down

logs:
	docker-compose logs -f

# Nuclear option: wipes database data too
clean:
	docker-compose down -v
	docker system prune -f

# Debugging helper
shell-backend:
	docker-compose exec backend /bin/bash

.PHONY: postgres createdb dropdb psql migratenew migrateup migrateup1 migratedown migratedown1 sqlc mock test server swagger seedCourses websearch-test brave-direct-test build up down logs clean shell-backend