SHELL := /bin/zsh

.PHONY: help server client

help:
	@echo "Available targets:"
	@echo "  make server   Run backend (uvicorn, loads .env)"
	@echo "  make client   Run frontend (Vite, real backend mode)"

server:
	python3 -m uvicorn apps.server.app:app --host 0.0.0.0 --port 8000 --reload --env-file .env

client:
	cd apps/client && VITE_USE_MOCKS=false VITE_API_BASE_URL=http://localhost:8000 npm run dev
