"""
Pytest configuration and shared fixtures for Carbon Scheduler tests
"""
import pytest
from starlette.testclient import TestClient
from datetime import datetime, timedelta, timezone
from typing import List, Dict
import responses

from app.main import app
from app.services.carbon_api import CarbonIntensity


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def mock_carbon_intensity_data():
    """Mock carbon intensity forecast data for testing"""
    now = datetime.now(timezone.utc)
    return [
        CarbonIntensity(
            from_time=now + timedelta(hours=i),
            to_time=now + timedelta(hours=i + 0.5),
            intensity=100 + (i * 10)  # Increasing intensity over time
        )
        for i in range(48)  # 48 half-hour slots
    ]


@pytest.fixture
def mock_current_intensity():
    """Mock current carbon intensity data"""
    return {
        'intensity': 150,
        'region': 'Scotland',
        'timestamp': datetime.now(timezone.utc)
    }


@pytest.fixture
def sample_task_preset():
    """Sample task preset for testing"""
    return {
        'label': 'Test Washing Machine',
        'duration_hours': 2,
        'energy_kwh': 1.5,
        'icon': '🧺',
        'category': 'household'
    }


@pytest.fixture
def mock_uk_carbon_api():
    """Mock the UK Carbon Intensity API responses"""
    with responses.RequestsMock() as rsps:
        # Mock current intensity endpoint
        rsps.add(
            responses.GET,
            "https://api.carbonintensity.org.uk/regional/postcode/G1",
            json={
                "data": [{
                    "shortname": "Scotland",
                    "data": [{
                        "intensity": {"forecast": 150}
                    }]
                }]
            },
            status=200
        )
        
        # Mock forecast endpoint
        forecast_data = []
        base_time = datetime.now(timezone.utc)
        for i in range(96):  # 48 hours * 2 (30-min slots)
            start_time = base_time + timedelta(minutes=30 * i)
            end_time = start_time + timedelta(minutes=30)
            forecast_data.append({
                "from": start_time.isoformat() + "Z",
                "to": end_time.isoformat() + "Z",
                "intensity": {
                    "forecast": 100 + (i * 2)  # Gradually increasing intensity
                }
            })
        
        rsps.add(
            responses.GET,
            responses.matchers.urlencoded_params_matcher({
                # This will match any forecast URL with fw48h pattern
            }),
            json={"data": forecast_data},
            status=200
        )
        
        yield rsps


@pytest.fixture
def optimal_time_request_payload():
    """Sample optimal time request payload"""
    return {
        "task_type": "washing-machine",
        "postcode": "G1"
    }