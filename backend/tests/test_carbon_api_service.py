"""
Tests for Carbon API Service business logic
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone
import requests
import time

from app.services.carbon_api import (
    CarbonIntensityService,
    CarbonIntensity,
    OptimalWindow,
    find_optimal_window,
    TASK_PRESETS
)


class TestCarbonIntensity:
    """Test CarbonIntensity model"""
    
    def test_carbon_intensity_creation(self):
        """Test CarbonIntensity model creation"""
        now = datetime.now(timezone.utc)
        later = now + timedelta(hours=1)
        
        intensity = CarbonIntensity(
            from_time=now,
            to_time=later,
            intensity=150
        )
        
        assert intensity.from_time == now
        assert intensity.to_time == later
        assert intensity.intensity == 150


class TestOptimalWindow:
    """Test OptimalWindow model"""
    
    def test_optimal_window_creation(self):
        """Test OptimalWindow model creation"""
        now = datetime.now(timezone.utc)
        later = now + timedelta(hours=2)
        
        window = OptimalWindow(
            start_time=now,
            end_time=later,
            avg_intensity=120,
            carbon_saved_grams=500,
            percentage_saved=25,
            current_intensity=160
        )
        
        assert window.start_time == now
        assert window.end_time == later
        assert window.avg_intensity == 120
        assert window.carbon_saved_grams == 500
        assert window.percentage_saved == 25
        assert window.current_intensity == 160


class TestTaskPresets:
    """Test task preset configurations"""
    
    def test_task_presets_exist(self):
        """Test that key task presets are defined"""
        assert "washing-machine" in TASK_PRESETS
        assert "dishwasher" in TASK_PRESETS
        assert "ev-charging-home" in TASK_PRESETS
        assert "robot-vacuum-home" in TASK_PRESETS
    
    def test_task_preset_structure(self):
        """Test that task presets have required fields"""
        for task_key, task in TASK_PRESETS.items():
            assert "label" in task
            assert "duration_hours" in task
            assert "energy_kwh" in task
            assert "icon" in task
            assert "category" in task
            
            # Validate data types and ranges
            assert isinstance(task["duration_hours"], (int, float))
            assert isinstance(task["energy_kwh"], (int, float))
            assert task["duration_hours"] > 0
            assert task["energy_kwh"] > 0
            assert task["category"] in ["household", "office", "manufacturing", "retail"]
    
    def test_business_categories_represented(self):
        """Test that all business categories have tasks"""
        categories = set()
        for task in TASK_PRESETS.values():
            categories.add(task["category"])
        
        expected_categories = {"household", "office", "manufacturing", "retail"}
        assert categories == expected_categories
    
    def test_robot_vacuum_in_all_categories(self):
        """Test that robot vacuums exist across categories as requested"""
        robot_tasks = [
            task_key for task_key in TASK_PRESETS.keys()
            if "robot" in task_key.lower() or "vacuum" in task_key.lower()
        ]
        
        assert len(robot_tasks) >= 3  # Should have multiple robot vacuum variants
        
        # Check specific robot vacuum tasks exist
        assert "robot-vacuum-home" in TASK_PRESETS
        assert "robot-vacuum-office" in TASK_PRESETS or "commercial-robot-vacuum" in TASK_PRESETS


class TestCarbonIntensityService:
    """Test CarbonIntensityService methods"""
    
    def test_rate_limiting(self):
        """Test that rate limiting is applied"""
        # Reset the class variables
        CarbonIntensityService._last_request_time = 0
        
        start_time = time.time()
        CarbonIntensityService._rate_limit()
        first_call_time = time.time()
        
        CarbonIntensityService._rate_limit()
        second_call_time = time.time()
        
        # Second call should be delayed by at least the minimum interval
        time_diff = second_call_time - first_call_time
        assert time_diff >= CarbonIntensityService._min_request_interval
    
    @patch('requests.get')
    def test_get_current_intensity_success(self, mock_get):
        """Test successful current intensity retrieval"""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "data": [{
                "shortname": "Scotland",
                "data": [{
                    "intensity": {"forecast": 150}
                }]
            }]
        }
        mock_get.return_value = mock_response
        
        result = CarbonIntensityService.get_current_intensity("G1")
        
        assert result["intensity"] == 150
        assert result["region"] == "Scotland"
        assert "timestamp" in result
        mock_get.assert_called_once()
    
    @patch('requests.get')
    def test_get_current_intensity_api_error(self, mock_get):
        """Test current intensity API error handling"""
        # Clear cache to ensure fresh request
        CarbonIntensityService._cache.clear()
        mock_get.side_effect = requests.exceptions.RequestException("API Error")
        
        with pytest.raises(Exception) as exc_info:
            CarbonIntensityService.get_current_intensity("G1")
        
        assert "Failed to fetch current intensity" in str(exc_info.value)
    
    @patch('requests.get')
    def test_get_forecast_success(self, mock_get):
        """Test successful forecast retrieval"""
        # Use naive datetime to avoid timezone issues in mock
        now = datetime(2023, 12, 18, 12, 0, 0)
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "data": [
                {
                    "from": now.isoformat() + "Z",
                    "to": (now + timedelta(hours=1)).isoformat() + "Z",
                    "intensity": {"forecast": 100}
                },
                {
                    "from": (now + timedelta(hours=1)).isoformat() + "Z",
                    "to": (now + timedelta(hours=2)).isoformat() + "Z",
                    "intensity": {"forecast": 120}
                }
            ]
        }
        mock_get.return_value = mock_response
        
        result = CarbonIntensityService.get_forecast("G1", 24)
        
        assert len(result) == 2
        assert isinstance(result[0], CarbonIntensity)
        assert result[0].intensity == 100
        assert result[1].intensity == 120
    
    def test_get_forecast_caching(self):
        """Test that forecast results are cached"""
        with patch('requests.get') as mock_get:
            mock_response = MagicMock()
            mock_response.raise_for_status.return_value = None
            mock_response.json.return_value = {"data": []}
            mock_get.return_value = mock_response
            
            # Clear cache first
            CarbonIntensityService._cache.clear()
            
            # First call should hit the API
            CarbonIntensityService.get_forecast("G1", 24)
            assert mock_get.call_count == 1
            
            # Second call should use cache (within cache expiry)
            CarbonIntensityService.get_forecast("G1", 24)
            assert mock_get.call_count == 1  # Still only 1 API call
    
    @patch('requests.get')
    def test_get_forecast_api_error(self, mock_get):
        """Test forecast API error handling"""
        mock_get.side_effect = requests.exceptions.RequestException("Forecast API Error")
        
        with pytest.raises(Exception) as exc_info:
            CarbonIntensityService.get_forecast("G1", 48)
        
        assert "Failed to fetch carbon intensity data" in str(exc_info.value)


class TestFindOptimalWindow:
    """Test optimal window finding algorithm"""
    
    def test_find_optimal_window_success(self):
        """Test finding optimal window with valid data"""
        now = datetime.now(timezone.utc)
        forecast = [
            CarbonIntensity(from_time=now, to_time=now + timedelta(hours=1), intensity=200),
            CarbonIntensity(from_time=now + timedelta(hours=1), to_time=now + timedelta(hours=2), intensity=100),
            CarbonIntensity(from_time=now + timedelta(hours=2), to_time=now + timedelta(hours=3), intensity=80),
            CarbonIntensity(from_time=now + timedelta(hours=3), to_time=now + timedelta(hours=4), intensity=90),
        ]
        
        # Task that takes 2 hours and uses 2 kWh
        window = find_optimal_window(forecast, duration_hours=2, energy_kwh=2.0)
        
        assert isinstance(window, OptimalWindow)
        # Should pick hours 2-4 (intensity 80+90=170, avg=85) over hours 1-3 (100+80=180, avg=90)
        assert window.avg_intensity == 85  # (80 + 90) / 2
        assert window.current_intensity == 200  # First slot intensity
        
        # Carbon savings calculation
        current_emissions = 200 * 2.0  # 400g CO2
        optimal_emissions = 85 * 2.0   # 170g CO2  
        expected_savings = (current_emissions - optimal_emissions) * 1000  # Convert to grams
        assert window.carbon_saved_grams == int(expected_savings)
    
    def test_find_optimal_window_insufficient_forecast(self):
        """Test error when forecast is too short for task duration"""
        now = datetime.now(timezone.utc)
        forecast = [
            CarbonIntensity(from_time=now, to_time=now + timedelta(hours=1), intensity=100)
        ]
        
        with pytest.raises(ValueError) as exc_info:
            find_optimal_window(forecast, duration_hours=2, energy_kwh=1.0)
        
        assert "Forecast period too short" in str(exc_info.value)
    
    def test_find_optimal_window_single_slot(self):
        """Test optimal window when only one slot available"""
        now = datetime.now(timezone.utc)
        forecast = [
            CarbonIntensity(from_time=now, to_time=now + timedelta(hours=1), intensity=150)
        ]
        
        window = find_optimal_window(forecast, duration_hours=1, energy_kwh=1.5)
        
        assert window.avg_intensity == 150
        assert window.current_intensity == 150
        assert window.carbon_saved_grams == 0  # No savings when only one option
        assert window.percentage_saved == 0
    
    def test_find_optimal_window_all_same_intensity(self):
        """Test optimal window when all intensities are the same"""
        now = datetime.now(timezone.utc)
        forecast = [
            CarbonIntensity(from_time=now + timedelta(hours=i), 
                          to_time=now + timedelta(hours=i+1), 
                          intensity=100)
            for i in range(5)
        ]
        
        window = find_optimal_window(forecast, duration_hours=2, energy_kwh=1.0)
        
        assert window.avg_intensity == 100
        assert window.carbon_saved_grams == 0  # No savings when all same
        # Should pick the first available window
        assert window.start_time == forecast[0].from_time
    
    def test_find_optimal_window_decreasing_intensity(self):
        """Test optimal window picks the lowest intensity period"""
        now = datetime.now(timezone.utc)
        forecast = [
            CarbonIntensity(from_time=now + timedelta(hours=i), 
                          to_time=now + timedelta(hours=i+1), 
                          intensity=200 - (i * 20))  # Decreasing: 200, 180, 160, 140, 120
            for i in range(5)
        ]
        
        window = find_optimal_window(forecast, duration_hours=2, energy_kwh=1.0)
        
        # Should pick the last 2 hours (intensity 140 + 120 = avg 130)
        assert window.avg_intensity == 130
        assert window.start_time == forecast[3].from_time  # 4th slot (index 3)
        
        # Carbon savings should be significant
        current_emissions = 200 * 1.0  # First slot (kg CO2)
        optimal_emissions = 130 * 1.0  # Optimal window (kg CO2)
        expected_savings = (current_emissions - optimal_emissions) * 1000  # Convert to grams
        assert window.carbon_saved_grams == int(expected_savings)