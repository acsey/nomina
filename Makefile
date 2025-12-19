.PHONY: help dev prod build up down logs shell migrate seed clean

# Variables
DC = docker compose
DC_DEV = docker compose -f docker-compose.dev.yml

help: ## Mostrar ayuda
	@echo "Sistema de Nómina - Comandos disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Desarrollo
dev: ## Iniciar en modo desarrollo
	$(DC_DEV) up --build

dev-d: ## Iniciar en modo desarrollo (detached)
	$(DC_DEV) up --build -d

dev-down: ## Detener modo desarrollo
	$(DC_DEV) down

dev-logs: ## Ver logs de desarrollo
	$(DC_DEV) logs -f

# Producción
prod: ## Iniciar en modo producción
	$(DC) up --build -d

prod-down: ## Detener modo producción
	$(DC) down

# Build
build: ## Construir imágenes de producción
	$(DC) build

build-dev: ## Construir imágenes de desarrollo
	$(DC_DEV) build

# Logs
logs: ## Ver logs de producción
	$(DC) logs -f

logs-backend: ## Ver logs del backend
	$(DC) logs -f backend

logs-frontend: ## Ver logs del frontend
	$(DC) logs -f frontend

# Shell
shell-backend: ## Abrir shell en backend
	$(DC) exec backend sh

shell-db: ## Abrir shell en PostgreSQL
	$(DC) exec db psql -U nomina -d nomina_db

# Base de datos
migrate: ## Ejecutar migraciones
	$(DC) exec backend npx prisma migrate deploy

migrate-dev: ## Crear migración de desarrollo
	$(DC_DEV) exec backend npx prisma migrate dev

seed: ## Ejecutar seed de datos
	$(DC) exec backend npx prisma db seed

studio: ## Abrir Prisma Studio
	$(DC_DEV) exec backend npx prisma studio

# Limpieza
clean: ## Limpiar contenedores y volúmenes
	$(DC) down -v --remove-orphans
	$(DC_DEV) down -v --remove-orphans

clean-all: ## Limpiar todo incluyendo imágenes
	$(DC) down -v --remove-orphans --rmi all
	$(DC_DEV) down -v --remove-orphans --rmi all

# Estado
ps: ## Ver estado de contenedores
	$(DC) ps

ps-dev: ## Ver estado de contenedores (desarrollo)
	$(DC_DEV) ps
