.PHONY: install test lint run-backend run-frontend clean

install:
	cd backend && pip install -r requirements.txt -r requirements-dev.txt
	cd frontend && npm install

test:
	cd backend && pytest -v --cov=app

lint:
	cd backend && ruff check .
	cd frontend && npm run lint

run-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

run-frontend:
	cd frontend && npm run dev

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf backend/.pytest_cache backend/.coverage
