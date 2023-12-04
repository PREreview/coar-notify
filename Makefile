.PHONY: fix format

node_modules: package.json package-lock.json
	npm install
	touch node_modules

fix: node_modules
	npx prettier --ignore-unknown --write '**'

format: node_modules
	npx prettier --ignore-unknown --check '**'
