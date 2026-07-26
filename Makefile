.DEFAULT_GOAL := help

.PHONY: help setup dev watch build test browser verify up down restart logs ps shell package config

help:
	@echo "Portfolio Lite commands"
	@echo "  make setup    Install locked Node dependencies"
	@echo "  make up       Build and start PHP 8.2/Apache at http://localhost:8080"
	@echo "  make down     Stop the local production stack"
	@echo "  make logs     Follow Apache/PHP logs"
	@echo "  make verify   Run typecheck, unit tests, and production build"
	@echo "  make browser  Run browser tests against the container"
	@echo "  make package  Build the Cafe24 upload package"

setup:
	npm ci --ignore-scripts

dev:
	npm run dev

watch:
	npm run watch

build:
	npm run build

test:
	npm test

verify:
	npm run verify

up:
	docker compose up --build --detach --wait
	@node -e "console.log('READY http://localhost:' + (process.env.PORT || '8080'))"

down:
	docker compose down --remove-orphans

restart: down up

logs:
	docker compose logs --follow web

ps:
	docker compose ps

shell:
	docker compose exec web sh

browser:
	npx cross-env PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run test:browser

package:
	npm run package:cafe24

config:
	docker compose config --quiet
