SHELL := /bin/sh

PNPM := pnpm
COMPOSE := docker compose
API_PACKAGE := @xtechjs/api
WEB_PACKAGE := @xtechjs/web

.DEFAULT_GOAL := help

.PHONY: help install dev db-up db-down up down rebuild ps logs logs-api logs-web shell-api shell-web shell-db shell-redis migrate test test-api test-web typecheck typecheck-api typecheck-web build build-api build-web clean

help: ## Muestra los objetivos disponibles

	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Instala las dependencias del workspace
	$(PNPM) install --ignore-scripts

dev: ## Inicia API y frontend en desarrollo local
	$(PNPM) dev

db-up: ## Inicia PostgreSQL y Redis para desarrollo local
	$(COMPOSE) up -d postgres redis

db-down: ## Detiene PostgreSQL y Redis sin eliminar datos
	$(COMPOSE) stop postgres redis

up: ## Construye e inicia la pila Docker completa
	$(COMPOSE) up --build -d

down: ## Detiene la pila Docker y conserva los volumenes
	$(COMPOSE) down

rebuild: ## Reconstruye y reinicia la pila Docker completa
	$(COMPOSE) up --build --force-recreate -d

ps: ## Muestra el estado de los servicios Docker
	$(COMPOSE) ps

logs: ## Sigue los logs de todos los servicios Docker
	$(COMPOSE) logs -f

logs-api: ## Sigue los logs del servicio API
	$(COMPOSE) logs -f api

logs-web: ## Sigue los logs del servicio frontend
	$(COMPOSE) logs -f web

shell-api: ## Abre una shell en el contenedor de API
	$(COMPOSE) exec api sh

shell-web: ## Abre una shell en el contenedor de frontend
	$(COMPOSE) exec web sh

shell-db: ## Abre psql en PostgreSQL usando las variables de .env
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-xtechjs} -d $${POSTGRES_DB:-xtechjs}

shell-redis: ## Abre redis-cli en Redis
	$(COMPOSE) exec redis redis-cli

migrate: ## Ejecuta las migraciones de la API en la pila Docker
	$(COMPOSE) exec api node dist/shared/infrastructure/persistence/data-source.js

test: test-api test-web ## Ejecuta todas las verificaciones de pruebas

test-api: ## Ejecuta las pruebas del backend
	$(PNPM) --filter $(API_PACKAGE) test

test-web: ## Ejecuta la comprobacion del frontend (no hay runner de tests aun)
	$(PNPM) --filter $(WEB_PACKAGE) typecheck

typecheck: ## Ejecuta la comprobacion de tipos de todo el workspace
	$(PNPM) typecheck

typecheck-api: ## Ejecuta la comprobacion de tipos del backend
	$(PNPM) --filter $(API_PACKAGE) typecheck

typecheck-web: ## Ejecuta la comprobacion de tipos del frontend
	$(PNPM) --filter $(WEB_PACKAGE) typecheck

build: ## Compila API y frontend para produccion
	$(PNPM) build

build-api: ## Compila la API para produccion
	$(PNPM) --filter $(API_PACKAGE) build

build-web: ## Compila el frontend para produccion
	$(PNPM) --filter $(WEB_PACKAGE) build

clean: ## Elimina los artefactos de compilacion locales
	rm -rf apps/api/dist apps/web/dist