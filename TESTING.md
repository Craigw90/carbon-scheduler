# 🧪 Testing Guide

This document outlines the testing strategy and setup for the Carbon Scheduler project.

## 📊 Current Test Coverage

| Component | Coverage | Target |
|-----------|----------|--------|
| Backend   | 80%+     | 70%    |
| Frontend  | 75%+     | 65%    |

## 🛠 Quick Start

### Run All Tests
```bash
make test
```

### Run Individual Components
```bash
# Backend only
make test-backend

# Frontend only  
make test-frontend

# Watch mode (frontend)
make test-watch
```

### Pre-commit Checks
```bash
# Format, lint, and test everything
make pre-commit

# Full pre-push validation
make pre-push
```

## 🧪 Backend Testing (Python/FastAPI)

### Test Structure
```
backend/tests/
├── conftest.py              # Shared fixtures and configuration
├── test_carbon_routes.py    # API endpoint tests
└── test_carbon_api_service.py # Business logic tests
```

### Running Backend Tests
```bash
cd backend

# Basic test run
pytest

# With coverage
pytest --cov=app

# With HTML coverage report
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/test_carbon_routes.py

# Specific test function
pytest tests/test_carbon_routes.py::test_get_current_intensity_success
```

### Test Configuration
- **Framework**: pytest + httpx (for FastAPI)
- **Coverage**: pytest-cov
- **Mocking**: pytest-mock + responses (for external APIs)
- **Config**: `pytest.ini` and `.coveragerc`

### Key Test Areas
- ✅ API endpoint functionality
- ✅ Error handling and validation
- ✅ Carbon calculation algorithms
- ✅ UK Carbon Intensity API integration (mocked)
- ✅ Rate limiting and caching

## ⚛️ Frontend Testing (React/TypeScript)

### Test Structure
```
frontend/__tests__/
├── lib/
│   └── api.test.ts           # API client tests
├── components/
│   └── CustomTaskModal.test.tsx  # Component tests
└── app/
    └── page.test.tsx         # Main page integration tests
```

### Running Frontend Tests
```bash
cd frontend

# Basic test run
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test file
npm test -- api.test.ts
```

### Test Configuration
- **Framework**: Jest + React Testing Library
- **Environment**: jsdom
- **Config**: `jest.config.js` and `jest.setup.js`

### Key Test Areas
- ✅ API client functions and error handling
- ✅ Component rendering and interactions
- ✅ Form validation and user input
- ✅ Custom task management
- ✅ Postcode validation
- ✅ LocalStorage persistence

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/main.yml`) runs on every push to main:

### 1. Backend Tests (🐍)
- Python environment setup
- Dependency installation
- Linting with flake8
- Type checking with mypy
- Test execution with coverage
- Coverage upload to Codecov

### 2. Frontend Tests (⚛️)
- Node.js environment setup
- Dependency installation
- ESLint linting
- TypeScript type checking
- Test execution with coverage
- Coverage upload to Codecov

### 3. Build Verification (🏗️)
- Frontend production build
- Backend startup verification
- Integration smoke tests

### 4. Security Scanning (🔒)
- npm audit for frontend dependencies
- bandit security scan for backend
- Vulnerability reporting

### 5. Deployment (🚀)
- Deploy to Railway (backend) - when configured
- Deploy to Vercel (frontend) - when configured
- Health checks on deployed services

## 📈 Coverage Requirements

### Backend Coverage Targets
- **Overall**: 70% minimum
- **Critical paths**: 90%+
  - API endpoints
  - Carbon calculation logic
  - Error handling

### Frontend Coverage Targets
- **Overall**: 65% minimum
- **Critical components**: 80%+
  - API client
  - Main page component
  - Custom task modal

## 🐛 Writing Tests

### Backend Test Example
```python
def test_get_current_intensity_success(self, mock_service, client):
    """Test successful current intensity retrieval"""
    mock_service.return_value = {
        'intensity': 150,
        'region': 'Scotland',
        'timestamp': datetime.utcnow()
    }
    
    response = client.get("/api/carbon/current?postcode=G1")
    assert response.status_code == 200
    assert response.json()["data"]["intensity"] == 150
```

### Frontend Test Example
```typescript
it('should validate UK postcodes', async () => {
  const user = userEvent.setup();
  render(<Home />);

  const postcodeInput = screen.getByLabelText('Postcode');
  await user.type(postcodeInput, 'G1 1AA');
  
  expect(screen.getByText('✓')).toBeInTheDocument();
});
```

## 🚨 Troubleshooting

### Common Issues

**Backend test failures**
```bash
# Clear Python cache
find backend -name "*.pyc" -delete
find backend -type d -name "__pycache__" -delete

# Reinstall dependencies
cd backend && pip install -r requirements.txt
```

**Frontend test failures**
```bash
# Clear Jest cache
cd frontend && npm test -- --clearCache

# Reinstall dependencies
cd frontend && rm -rf node_modules && npm install
```

**Coverage issues**
```bash
# Generate fresh coverage reports
make clean
make test
```

### Debugging Tests

**Backend debugging**
```bash
# Run tests with verbose output
pytest -v -s

# Run specific test with debugging
pytest -v -s tests/test_carbon_routes.py::test_get_current_intensity_success

# Drop into debugger on failure
pytest --pdb
```

**Frontend debugging**
```bash
# Run tests in debug mode
npm test -- --verbose

# Run with debugging output
DEBUG_PRINT_LIMIT=0 npm test
```

## 📝 Test Maintenance

### Adding New Tests
1. Follow existing naming conventions
2. Use shared fixtures from `conftest.py` (backend) or mocks (frontend)
3. Test both success and error cases
4. Add meaningful assertions
5. Update coverage thresholds if needed

### Updating Tests
1. Run tests after code changes: `make test`
2. Update mocks when APIs change
3. Keep test data realistic and up-to-date
4. Maintain test isolation (no shared state)

### Performance
- Backend tests: ~30 seconds
- Frontend tests: ~15 seconds
- Total CI pipeline: ~5 minutes

## 🎯 Best Practices

1. **Test pyramid**: More unit tests, fewer integration tests
2. **Mock external APIs**: Use `responses` (backend) and `jest.mock` (frontend)
3. **Test behavior, not implementation**: Focus on what the code does
4. **Meaningful test names**: Describe what is being tested
5. **Arrange-Act-Assert**: Clear test structure
6. **Keep tests fast**: Mock expensive operations
7. **Test edge cases**: Error conditions, boundary values
8. **Maintain test independence**: Each test should run in isolation

## 🔗 Related Files

- `backend/pytest.ini` - Backend test configuration
- `frontend/jest.config.js` - Frontend test configuration
- `codecov.yml` - Coverage reporting configuration
- `.github/workflows/main.yml` - CI/CD pipeline
- `Makefile` - Development commands