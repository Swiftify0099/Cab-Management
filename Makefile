.PHONY: help up down build logs ps clean migrate shell-db shell-redis seed

# ============================================================
# CabBooking SuperApp — Makefile
# ============================================================

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# ============================================================
# DOCKER
# ============================================================
up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

build: ## Build all Docker images
	docker compose build

logs: ## Tail logs from all services
	docker compose logs -f

logs-%: ## Tail logs from specific service (e.g. make logs-auth-service)
	docker compose logs -f $*

ps: ## Show running containers
	docker compose ps

restart-%: ## Restart specific service (e.g. make restart-booking-service)
	docker compose restart $*

# ============================================================
# DATABASE
# ============================================================
migrate: ## Run Alembic migrations for all services
	@for svc in auth-service booking-service matching-service payment-service parcel-service hotel-service notification-service analytics-service admin-service; do \
		echo "Migrating $$svc..."; \
		docker compose exec $$svc alembic upgrade head; \
	done

migrate-%: ## Run migrations for specific service (e.g. make migrate-auth-service)
	docker compose exec $* alembic upgrade head

rollback-%: ## Rollback last migration (e.g. make rollback-auth-service)
	docker compose exec $* alembic downgrade -1

shell-db: ## Open psql shell
	docker compose exec postgres psql -U ${POSTGRES_USER:-cabooking_user} -d ${POSTGRES_DB:-cabooking}

# ============================================================
# REDIS
# ============================================================
shell-redis: ## Open Redis CLI
	docker compose exec redis redis-cli

flush-redis: ## Flush all Redis keys (CAUTION)
	docker compose exec redis redis-cli FLUSHALL

# ============================================================
# DEVELOPMENT
# ============================================================
seed: ## Seed database with test data
	docker compose exec auth-service python -m app.scripts.seed

install-admin: ## Install admin web dependencies
	cd apps/admin-web && npm install

install-customer-web: ## Install customer web dependencies
	cd apps/customer-web && npm install

dev-admin: ## Run admin web in dev mode
	cd apps/admin-web && npm run dev

dev-customer-web: ## Run customer web in dev mode
	cd apps/customer-web && npm run dev

# ============================================================
# TESTING
# ============================================================
test: ## Run all backend tests
	@for svc in auth-service booking-service matching-service payment-service parcel-service hotel-service; do \
		echo "Testing $$svc..."; \
		docker compose exec $$svc pytest tests/ -v; \
	done

test-%: ## Run tests for specific service (e.g. make test-auth-service)
	docker compose exec $* pytest tests/ -v --tb=short

# ============================================================
# CLEANUP
# ============================================================
clean: ## Stop containers and remove volumes (CAUTION: data loss)
	docker compose down -v --remove-orphans

prune: ## Docker system prune
	docker system prune -f
