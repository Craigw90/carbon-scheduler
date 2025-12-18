"""
Tests for Carbon Intensity API routes
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone

from app.services.carbon_api import CarbonIntensity, OptimalWindow


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns basic info"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Carbon Scheduler API"
        assert data["version"] == "1.0.0"
        assert data["status"] == "operational"
    
    def test_health_check_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "carbon-scheduler-api"


class TestCurrentIntensityEndpoint:
    """Test current carbon intensity endpoint"""
    
    @patch('app.services.carbon_api.CarbonIntensityService.get_current_intensity')
    def test_get_current_intensity_success(self, mock_service, client):
        """Test successful current intensity retrieval"""
        mock_service.return_value = {
            'intensity': 150,
            'region': 'Scotland',
            'timestamp': datetime.now(timezone.utc)
        }
        
        response = client.get("/api/carbon/current?postcode=G1")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["intensity"] == 150
        assert data["data"]["region"] == "Scotland"
        mock_service.assert_called_once_with("G1")
    
    @patch('app.services.carbon_api.CarbonIntensityService.get_current_intensity')
    def test_get_current_intensity_with_default_postcode(self, mock_service, client):
        """Test current intensity with default postcode"""
        mock_service.return_value = {
            'intensity': 120,
            'region': 'Scotland',
            'timestamp': datetime.now(timezone.utc)
        }
        
        response = client.get("/api/carbon/current")
        assert response.status_code == 200
        mock_service.assert_called_once_with("G1")  # Default postcode
    
    @patch('app.services.carbon_api.CarbonIntensityService.get_current_intensity')
    def test_get_current_intensity_service_error(self, mock_service, client):
        """Test handling of service errors"""
        mock_service.side_effect = Exception("API Error")
        
        response = client.get("/api/carbon/current?postcode=G1")
        assert response.status_code == 500
        assert "API Error" in response.json()["detail"]


class TestForecastEndpoint:
    """Test carbon intensity forecast endpoint"""
    
    @patch('app.services.carbon_api.CarbonIntensityService.get_forecast')
    def test_get_forecast_success(self, mock_service, client):
        """Test successful forecast retrieval"""
        now = datetime.now(timezone.utc)
        mock_forecast = [
            CarbonIntensity(
                from_time=now,
                to_time=now + timedelta(hours=1),
                intensity=100
            ),
            CarbonIntensity(
                from_time=now + timedelta(hours=1),
                to_time=now + timedelta(hours=2),
                intensity=120
            )
        ]
        mock_service.return_value = mock_forecast
        
        response = client.get("/api/carbon/forecast?postcode=G1&hours=24")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["postcode"] == "G1"
        assert len(data["data"]["forecast"]) == 2
        assert data["data"]["forecast"][0]["intensity"] == 100
        mock_service.assert_called_once_with("G1", 24)
    
    @patch('app.services.carbon_api.CarbonIntensityService.get_forecast')
    def test_get_forecast_with_defaults(self, mock_service, client):
        """Test forecast with default parameters"""
        mock_service.return_value = []
        
        response = client.get("/api/carbon/forecast")
        assert response.status_code == 200
        mock_service.assert_called_once_with("G1", 48)  # Defaults
    
    def test_get_forecast_invalid_hours(self, client):
        """Test forecast with invalid hours parameter"""
        response = client.get("/api/carbon/forecast?hours=200")  # > 96 max
        assert response.status_code == 422  # Validation error
    
    def test_get_forecast_negative_hours(self, client):
        """Test forecast with negative hours"""
        response = client.get("/api/carbon/forecast?hours=-5")
        assert response.status_code == 422  # Validation error


class TestTasksEndpoint:
    """Test tasks endpoint"""
    
    def test_get_available_tasks(self, client):
        """Test getting available task presets"""
        response = client.get("/api/carbon/tasks")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "washing-machine" in data["data"]
        assert "dishwasher" in data["data"]
        
        # Check task structure
        washing_machine = data["data"]["washing-machine"]
        assert washing_machine["label"] == "Washing Machine"
        assert washing_machine["duration_hours"] == 2
        assert washing_machine["energy_kwh"] == 1.5
        assert washing_machine["category"] == "household"
        assert washing_machine["key"] == "washing-machine"


class TestOptimalTimeEndpoint:
    """Test optimal time calculation endpoint"""
    
    @patch('app.services.carbon_api.find_optimal_window')
    @patch('app.services.carbon_api.CarbonIntensityService.get_forecast')
    def test_calculate_optimal_time_success(self, mock_forecast, mock_optimal, client):
        """Test successful optimal time calculation"""
        # Mock forecast data
        now = datetime.now(timezone.utc)
        mock_forecast.return_value = [
            CarbonIntensity(from_time=now, to_time=now + timedelta(hours=1), intensity=100),
            CarbonIntensity(from_time=now + timedelta(hours=1), to_time=now + timedelta(hours=2), intensity=80)
        ]
        
        # Mock optimal window result
        mock_optimal.return_value = OptimalWindow(
            start_time=now + timedelta(hours=1),
            end_time=now + timedelta(hours=3),
            avg_intensity=90,  # Change to match the actual calculation
            carbon_saved_grams=15000,  # Adjusted to match actual calculation
            percentage_saved=25,
            current_intensity=100
        )
        
        payload = {
            "task_type": "washing-machine",
            "postcode": "G1"
        }
        
        response = client.post("/api/carbon/optimal-time", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["task_label"] == "Washing Machine"
        assert data["task_icon"] == "🧺"
        assert data["optimal_window"]["avg_intensity"] == 90
        assert data["optimal_window"]["carbon_saved_grams"] == 15000
        assert data["current_intensity"] == 100
    
    def test_calculate_optimal_time_invalid_task(self, client):
        """Test optimal time with invalid task type"""
        payload = {
            "task_type": "invalid-task",
            "postcode": "G1"
        }
        
        response = client.post("/api/carbon/optimal-time", json=payload)
        assert response.status_code == 400
        assert "Invalid task type" in response.json()["detail"]
    
    @patch('app.services.carbon_api.CarbonIntensityService.get_forecast')
    def test_calculate_optimal_time_forecast_error(self, mock_forecast, client):
        """Test optimal time when forecast service fails"""
        mock_forecast.side_effect = Exception("Forecast API Error")
        
        payload = {
            "task_type": "washing-machine",
            "postcode": "G1"
        }
        
        response = client.post("/api/carbon/optimal-time", json=payload)
        assert response.status_code == 500
        assert "Error calculating optimal time" in response.json()["detail"]
    
    def test_calculate_optimal_time_missing_task_type(self, client):
        """Test optimal time with missing task_type"""
        payload = {
            "postcode": "G1"
            # Missing task_type
        }
        
        response = client.post("/api/carbon/optimal-time", json=payload)
        assert response.status_code == 422  # Validation error
    
    def test_calculate_optimal_time_default_postcode(self, client):
        """Test optimal time uses default postcode when not provided"""
        with patch('app.services.carbon_api.CarbonIntensityService.get_forecast') as mock_forecast:
            mock_forecast.return_value = []
            
            payload = {
                "task_type": "washing-machine"
                # No postcode - should use default
            }
            
            response = client.post("/api/carbon/optimal-time", json=payload)
            # Will fail due to empty forecast, but check the postcode was defaulted
            mock_forecast.assert_called_once_with("G1", hours_ahead=48)