.PHONY: fix format start typecheck

node_modules: package.json package-lock.json
	npm install
	touch node_modules

fix: node_modules
	npx prettier --ignore-unknown --write '**'

format: node_modules
	npx prettier --ignore-unknown --check '**'

typecheck: node_modules
	npx tsc --noEmit

start: node_modules
	npx tsx src
