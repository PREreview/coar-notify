.PHONY: build build-image check fix format lint mailcatcher smoke-test start start-services test typecheck

IMAGE_TAG=prereview-coar-notify

node_modules: package.json package-lock.json
	npm install
	touch node_modules

.env:
	cp .env.dist .env

build: node_modules
	npx tsc --project tsconfig.build.json

build-image:
	docker build --target prod --tag ${IMAGE_TAG} .

check: format lint test typecheck

fix: node_modules
	npx eslint . --fix --max-warnings 0
	npx prettier --ignore-unknown --write '**'

format: node_modules
	npx prettier --ignore-unknown --check '**'

lint: node_modules
	npx eslint . --max-warnings 0

typecheck: node_modules
	npx tsc --noEmit

test: node_modules
	npx vitest run

smoke-test: SHELL := /usr/bin/env bash
smoke-test: build-image start-services
	REDIS_PORT=$(shell docker compose port redis 6379 | awk -F":" '{print $$2}') scripts/smoke-test.sh ${IMAGE_TAG}

start: .env node_modules start-services
	REDIS_URL=redis://$(shell docker compose port redis 6379) SMTP_URL=smtp://$(shell docker compose port mailcatcher 1025) node_modules/.bin/tsx watch --clear-screen=false --require dotenv/config src

start-services:
	docker compose up --detach

mailcatcher: node_modules start-services
	npx open-cli http://$(shell docker compose port mailcatcher 1080 | sed 's/0\.\0\.0\.0/localhost/')
