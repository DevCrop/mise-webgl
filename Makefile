.DEFAULT_GOAL := help

.PHONY: help setup verify package test docs changeset

help:
	@echo "MISE WebGL monorepo"
	@echo "  make setup      Install locked Node dependencies"
	@echo "  make verify     Run framework, web-foundation, and package gates"
	@echo "  make package    Build and verify mise-webgl release tarball"
	@echo "  make test       Run mise-webgl unit tests"
	@echo "  make docs       Build static documentation for GitHub Pages"
	@echo "  make changeset  Record a semver changeset"

setup:
	npm ci --ignore-scripts

verify:
	npm run verify

package:
	npm run package:mise

test:
	npm test

docs:
	npm run build:docs

changeset:
	npm run changeset
