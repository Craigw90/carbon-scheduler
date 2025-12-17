"""
Carbon Intensity API Service
Integrates with UK National Grid Carbon Intensity API
"""
import requests
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel


class CarbonIntensity(BaseModel):
    """Carbon intensity reading for a specific time slot"""
    from_time: datetime
    to_time: datetime
    intensity: int  # gCO2/kWh
    
    
class OptimalWindow(BaseModel):
    """Optimal time window to run a task"""
    start_time: datetime
    end_time: datetime
    avg_intensity: int
    carbon_saved_grams: int
    percentage_saved: int
    current_intensity: int


class CarbonIntensityService:
    """Service for interacting with UK National Grid Carbon Intensity API"""
    
    BASE_URL = "https://api.carbonintensity.org.uk"
    
    @staticmethod
    def get_forecast(postcode: str = "G1", hours_ahead: int = 48) -> List[CarbonIntensity]:
        """
        Fetch carbon intensity forecast for a postcode.
        
        Args:
            postcode: UK postcode (e.g., "G1" for Glasgow)
            hours_ahead: How many hours to forecast (default 48)
            
        Returns:
            List of carbon intensity readings
        """
        try:
            # Get current time in ISO format
            now = datetime.utcnow().isoformat() + "Z"
            
            # Construct API URL
            url = f"{CarbonIntensityService.BASE_URL}/regional/intensity/{now}/PT{hours_ahead}H/postcode/{postcode}"
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Parse response
            forecast = []
            for slot in data['data']['data']:
                forecast.append(CarbonIntensity(
                    from_time=datetime.fromisoformat(slot['from'].replace('Z', '+00:00')),
                    to_time=datetime.fromisoformat(slot['to'].replace('Z', '+00:00')),
                    intensity=slot['intensity']['forecast']
                ))
            
            return forecast
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch carbon intensity data: {str(e)}")
    
    @staticmethod
    def get_current_intensity(postcode: str = "G1") -> Dict:
        """Get current carbon intensity for postcode"""
        try:
            url = f"{CarbonIntensityService.BASE_URL}/regional/postcode/{postcode}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            current = data['data'][0]['data'][0]
            
            return {
                'intensity': current['intensity']['forecast'],
                'region': data['data'][0]['shortname'],
                'timestamp': datetime.utcnow()
            }
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch current intensity: {str(e)}")


# Predefined task configurations
TASK_PRESETS = {
    'washing-machine': {
        'label': 'Washing Machine',
        'duration_hours': 2,
        'energy_kwh': 1.5,
        'icon': '🧺'
    },
    'dishwasher': {
        'label': 'Dishwasher',
        'duration_hours': 2,
        'energy_kwh': 1.8,
        'icon': '🍽️'
    },
    'tumble-dryer': {
        'label': 'Tumble Dryer',
        'duration_hours': 1,
        'energy_kwh': 2.5,
        'icon': '👕'
    },
    'ev-charging': {
        'label': 'EV Charging (7kW)',
        'duration_hours': 4,
        'energy_kwh': 28,
        'icon': '🚗'
    },
    'server-backup': {
        'label': 'Server Backup',
        'duration_hours': 3,
        'energy_kwh': 0.5,
        'icon': '💾'
    },
    'hot-water': {
        'label': 'Hot Water Heater',
        'duration_hours': 1,
        'energy_kwh': 3.0,
        'icon': '🚿'
    },
    'pool-pump': {
        'label': 'Pool Pump',
        'duration_hours': 4,
        'energy_kwh': 1.2,
        'icon': '🏊'
    },
}


def find_optimal_window(
    forecast: List[CarbonIntensity],
    duration_hours: int,
    energy_kwh: float
) -> OptimalWindow:
    """
    Find the greenest window to run a task.
    
    Args:
        forecast: List of carbon intensity forecasts
        duration_hours: How long the task takes
        energy_kwh: How much energy the task uses
        
    Returns:
        OptimalWindow with best time to run task
    """
    if len(forecast) < duration_hours:
        raise ValueError("Forecast period too short for task duration")
    
    # Current intensity (if running now)
    current_intensity = forecast[0].intensity
    
    # Find best contiguous window
    best_window = None
    lowest_avg_intensity = float('inf')
    
    # Slide through forecast to find best window
    for i in range(len(forecast) - duration_hours + 1):
        window = forecast[i:i + duration_hours]
        
        # Calculate average intensity for this window
        avg_intensity = sum(slot.intensity for slot in window) / len(window)
        
        if avg_intensity < lowest_avg_intensity:
            lowest_avg_intensity = avg_intensity
            
            # Calculate carbon emissions
            carbon_now = current_intensity * energy_kwh  # kgCO2
            carbon_optimal = avg_intensity * energy_kwh   # kgCO2
            carbon_saved = carbon_now - carbon_optimal
            percentage_saved = (carbon_saved / carbon_now) * 100 if carbon_now > 0 else 0
            
            best_window = OptimalWindow(
                start_time=window[0].from_time,
                end_time=window[-1].to_time,
                avg_intensity=int(avg_intensity),
                carbon_saved_grams=int(carbon_saved * 1000),  # Convert kg to grams
                percentage_saved=int(percentage_saved),
                current_intensity=current_intensity
            )
    
    if best_window is None:
        raise Exception("Could not find optimal window")
    
    return best_window
