# Carbon Scheduler Development Makefile
.PHONY: help install test lint clean dev build deploy

# Default target
help:
	@echo "🚀 Carbon Scheduler Development Commands"
	@echo ""
	@echo "📦 Setup:"
	@echo "  install          Install all dependencies (frontend + backend)"
	@echo "  install-backend  Install Python dependencies"
	@echo "  install-frontend Install Node.js dependencies"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  test             Run all tests (frontend + backend)"
	@echo "  test-backend     Run backend tests with coverage"
	@echo "  test-frontend    Run frontend tests with coverage"
	@echo "  test-watch       Run frontend tests in watch mode"
	@echo ""
	@echo "🔍 Code Quality:"
	@echo "  lint             Run all linters (frontend + backend)"
	@echo "  lint-backend     Run backend linting (flake8, mypy)"
	@echo "  lint-frontend    Run frontend linting (ESLint)"
	@echo "  format           Format all code"
	@echo "  format-backend   Format backend code with black"
	@echo "  format-frontend  Format frontend code with prettier"
	@echo ""
	@echo "🚀 Development:"
	@echo "  dev              Start both frontend and backend in dev mode"
	@echo "  dev-backend      Start backend development server"
	@echo "  dev-frontend     Start frontend development server"
	@echo ""
	@echo "🏗️  Build & Deploy:"
	@echo "  build            Build frontend for production"
	@echo "  build-check      Verify builds work correctly"
	@echo "  deploy-check     Run pre-deployment checks"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  clean            Clean build artifacts and caches"
	@echo "  clean-backend    Clean backend artifacts"
	@echo "  clean-frontend   Clean frontend artifacts"

# Installation
install: install-backend install-frontend
	@echo "✅ All dependencies installed"

install-backend:
	@echo "📦 Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "✅ Backend dependencies installed"

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm ci
	@echo "✅ Frontend dependencies installed"

# Testing
test: test-backend test-frontend
	@echo "✅ All tests completed"

test-backend:
	@echo "🧪 Running backend tests..."
	cd backend && python -m pytest --cov=app --cov-report=html --cov-report=term-missing
	@echo "✅ Backend tests completed"

test-frontend:
	@echo "🧪 Running frontend tests..."
	cd frontend && npm run test:coverage
	@echo "✅ Frontend tests completed"

test-watch:
	@echo "👀 Running frontend tests in watch mode..."
	cd frontend && npm run test:watch

# Linting
lint: lint-backend lint-frontend
	@echo "✅ All linting completed"

lint-backend:
	@echo "🔍 Linting backend..."
	cd backend && python -m flake8 app
	cd backend && python -m mypy app --ignore-missing-imports
	@echo "✅ Backend linting completed"

lint-frontend:
	@echo "🔍 Linting frontend..."
	cd frontend && npm run lint
	cd frontend && npx tsc --noEmit
	@echo "✅ Frontend linting completed"

# Formatting
format: format-backend format-frontend
	@echo "✅ All code formatted"

format-backend:
	@echo "🎨 Formatting backend code..."
	cd backend && python -m black app tests
	cd backend && python -m isort app tests
	@echo "✅ Backend code formatted"

format-frontend:
	@echo "🎨 Formatting frontend code..."
	cd frontend && npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"
	@echo "✅ Frontend code formatted"

# Development
dev:
	@echo "🚀 Starting development servers..."
	@echo "Backend will be at: http://localhost:8000"
	@echo "Frontend will be at: http://localhost:3000"
	@echo "Press Ctrl+C to stop both servers"
	# Run both servers in parallel
	(cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) & \
	(cd frontend && npm run dev) & \
	wait

dev-backend:
	@echo "🚀 Starting backend development server..."
	cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "🚀 Starting frontend development server..."
	cd frontend && npm run dev

# Building
build:
	@echo "🏗️ Building frontend..."
	cd frontend && npm run build
	@echo "✅ Build completed"

build-check: lint test build
	@echo "🔍 Running build verification..."
	# Test backend startup
	cd backend && timeout 5 python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 || test $$? = 124
	@echo "✅ Build check passed"

deploy-check: build-check
	@echo "🚀 Running pre-deployment checks..."
	@echo "✅ Ready for deployment"

# Cleaning
clean: clean-backend clean-frontend
	@echo "✅ All artifacts cleaned"

clean-backend:
	@echo "🧹 Cleaning backend artifacts..."
	cd backend && find . -type d -name "__pycache__" -delete
	cd backend && find . -name "*.pyc" -delete
	cd backend && rm -rf htmlcov coverage.xml .coverage
	cd backend && rm -rf .pytest_cache
	@echo "✅ Backend cleaned"

clean-frontend:
	@echo "🧹 Cleaning frontend artifacts..."
	cd frontend && rm -rf .next
	cd frontend && rm -rf coverage
	cd frontend && rm -rf dist
	@echo "✅ Frontend cleaned"

# Quick commands for common workflows
quick-test: test-backend
	@echo "⚡ Quick backend tests completed"

pre-commit: format lint test
	@echo "✅ Pre-commit checks completed - ready to commit!"

pre-push: clean pre-commit build-check
	@echo "✅ Pre-push checks completed - ready to push!"

# Security
security-scan:
	@echo "🔒 Running security scans..."
	cd frontend && npm audit --audit-level=moderate
	cd backend && pip install bandit && bandit -r app
	@echo "✅ Security scan completed"

# Database (if using in future)
db-reset:
	@echo "🗄️ Database operations not implemented yet"

# Docker commands (if using)
docker-build:
	@echo "🐳 Docker operations not implemented yet"

# Help for specific components
help-test:
	@echo "🧪 Testing Commands:"
	@echo "  make test              - Run all tests"
	@echo "  make test-backend      - Run backend tests with coverage" 
	@echo "  make test-frontend     - Run frontend tests with coverage"
	@echo "  make test-watch        - Run frontend tests in watch mode"

help-dev:
	@echo "🚀 Development Commands:"
	@echo "  make dev               - Start both servers"
	@echo "  make dev-backend       - Start only backend"
	@echo "  make dev-frontend      - Start only frontend"