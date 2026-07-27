SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help install up test lint typecheck build check deploy deploy-worker deploy-frontend tail clean

help:
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install the locked Node.js dependencies
	npm ci

up: ## Run the Vite frontend and local Worker together
	@test -f .env || (echo "Missing .env; copy .env.example and add credentials." && exit 1)
	npm run dev

test: ## Run frontend and Worker unit tests
	npm test

lint: ## Run ESLint
	npm run lint

typecheck: ## Validate TypeScript and generated Worker bindings
	npm run types:check
	npm run typecheck

build: ## Build the frontend and dry-run the Worker bundle
	npm run build

check: ## Run every local quality gate
	npm run check

deploy-worker: ## Deploy the Cloudflare Worker (secrets must already exist)
	npm run deploy:worker

deploy-frontend: ## Dispatch and wait for the GitHub Pages workflow
	gh workflow run pages.yml --ref main
	@for attempt in {1..15}; do \
		run_id="$$(gh run list --workflow pages.yml --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId')"; \
		if [ -n "$$run_id" ]; then gh run watch "$$run_id" --exit-status; exit $$?; fi; \
		sleep 1; \
	done; \
	echo "Could not find the dispatched Pages workflow run."; exit 1

deploy: ## Check, deploy the Worker, then deploy GitHub Pages
	@git diff --quiet && git diff --cached --quiet || (echo "Commit local changes before deployment." && exit 1)
	@git fetch origin main --quiet
	@test "$$(git rev-parse HEAD)" = "$$(git rev-parse origin/main)" || (echo "Push the current commit to origin/main first." && exit 1)
	npm run check
	$(MAKE) deploy-worker
	$(MAKE) deploy-frontend

tail: ## Stream production Worker logs
	npm run tail

clean: ## Remove generated build, coverage, and local Worker cache files
	rm -rf dist dist-worker coverage .wrangler
