"""
Carbon Intensity API Service
Integrates with UK National Grid Carbon Intensity API
"""
import requests
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from pydantic import BaseModel
import time


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
    _cache = {}
    _last_request_time = 0
    _min_request_interval = 2
    
    @staticmethod 
    def _rate_limit():
        """Apply rate limiting between requests"""
        current_time = time.time()
        time_since_last = current_time - CarbonIntensityService._last_request_time
        if time_since_last < CarbonIntensityService._min_request_interval:
            time.sleep(CarbonIntensityService._min_request_interval - time_since_last)
        CarbonIntensityService._last_request_time = time.time()

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
        # Check cache first
        cache_key = f"forecast_{hours_ahead}"
        cache_expiry = 15 * 60  # 15 minutes
        
        if cache_key in CarbonIntensityService._cache:
            cached_data, cached_time = CarbonIntensityService._cache[cache_key]
            if time.time() - cached_time < cache_expiry:
                return cached_data
        
        try:
            # Rate limiting
            CarbonIntensityService._rate_limit()
            
            # Get current time in ISO format (rounded to next 30 min)
            now = datetime.now(timezone.utc)
            # Round to next half hour
            if now.minute < 30:
                now = now.replace(minute=30, second=0, microsecond=0)
            else:
                now = now.replace(hour=now.hour + 1, minute=0, second=0, microsecond=0)
            
            now_str = now.isoformat() + "Z"
            
            # Use national forecast (regional forecasts are limited)
            url = f"{CarbonIntensityService.BASE_URL}/intensity/{now_str}/fw{hours_ahead}h"
            
            response = requests.get(url, timeout=15, headers={
                'User-Agent': 'Carbon-Scheduler/1.0 (Educational Project)'
            })
            response.raise_for_status()
            
            data = response.json()
            
            # Parse response
            forecast = []
            for slot in data['data']:
                forecast.append(CarbonIntensity(
                    from_time=datetime.fromisoformat(slot['from'].replace('Z', '+00:00')),
                    to_time=datetime.fromisoformat(slot['to'].replace('Z', '+00:00')),
                    intensity=slot['intensity']['forecast']
                ))
            
            # Cache the result
            CarbonIntensityService._cache[cache_key] = (forecast, time.time())
            
            return forecast
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch carbon intensity data: {str(e)}")
    
    @staticmethod
    def get_current_intensity(postcode: str = "G1") -> Dict:
        """Get current carbon intensity for postcode"""
        # Check cache first
        cache_key = f"current_{postcode}"
        cache_expiry = 5 * 60  # 5 minutes
        
        if cache_key in CarbonIntensityService._cache:
            cached_data, cached_time = CarbonIntensityService._cache[cache_key]
            if time.time() - cached_time < cache_expiry:
                return cached_data
        
        try:
            # Rate limiting
            CarbonIntensityService._rate_limit()
            
            url = f"{CarbonIntensityService.BASE_URL}/regional/postcode/{postcode}"
            response = requests.get(url, timeout=15, headers={
                'User-Agent': 'Carbon-Scheduler/1.0 (Educational Project)'
            })
            response.raise_for_status()
            
            data = response.json()
            current = data['data'][0]['data'][0]
            
            result = {
                'intensity': current['intensity']['forecast'],
                'region': data['data'][0]['shortname'],
                'timestamp': datetime.now(timezone.utc)
            }
            
            # Cache the result
            CarbonIntensityService._cache[cache_key] = (result, time.time())
            
            return result
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch current intensity: {str(e)}")


# Predefined task configurations organized by business categories
TASK_PRESETS = {
    # Household Tasks
    'washing-machine': {
        'label': 'Washing Machine',
        'duration_hours': 2,
        'energy_kwh': 1.5,
        'icon': '🧺',
        'category': 'household'
    },
    'dishwasher': {
        'label': 'Dishwasher',
        'duration_hours': 2,
        'energy_kwh': 1.8,
        'icon': '🍽️',
        'category': 'household'
    },
    'tumble-dryer': {
        'label': 'Tumble Dryer',
        'duration_hours': 1,
        'energy_kwh': 2.5,
        'icon': '👕',
        'category': 'household'
    },
    'ev-charging-home': {
        'label': 'EV Charging (Home 7kW)',
        'duration_hours': 4,
        'energy_kwh': 28,
        'icon': '🚗',
        'category': 'household'
    },
    'hot-water': {
        'label': 'Hot Water Heater',
        'duration_hours': 1,
        'energy_kwh': 3.0,
        'icon': '🚿',
        'category': 'household'
    },
    'pool-pump': {
        'label': 'Pool Pump',
        'duration_hours': 4,
        'energy_kwh': 1.2,
        'icon': '🏊',
        'category': 'household'
    },
    'robot-vacuum-home': {
        'label': 'Robot Vacuum (Home)',
        'duration_hours': 1.5,
        'energy_kwh': 0.075,
        'icon': '🤖',
        'category': 'household'
    },
    
    # Office/Commercial Tasks
    'server-backup': {
        'label': 'Server Backup',
        'duration_hours': 3,
        'energy_kwh': 2.5,
        'icon': '💾',
        'category': 'office'
    },
    'data-center-maintenance': {
        'label': 'Data Center Maintenance',
        'duration_hours': 6,
        'energy_kwh': 45,
        'icon': '🖥️',
        'category': 'office'
    },
    'hvac-preheating': {
        'label': 'Office HVAC Pre-heating',
        'duration_hours': 2,
        'energy_kwh': 12,
        'icon': '🌡️',
        'category': 'office'
    },
    'hvac-cooling': {
        'label': 'Office HVAC Cooling',
        'duration_hours': 3,
        'energy_kwh': 18,
        'icon': '❄️',
        'category': 'office'
    },
    'document-scanning': {
        'label': 'Bulk Document Scanning',
        'duration_hours': 4,
        'energy_kwh': 3.2,
        'icon': '📄',
        'category': 'office'
    },
    'battery-charging': {
        'label': 'UPS Battery Charging',
        'duration_hours': 8,
        'energy_kwh': 15,
        'icon': '🔋',
        'category': 'office'
    },
    'commercial-ev-charging': {
        'label': 'Fleet EV Charging (22kW)',
        'duration_hours': 3,
        'energy_kwh': 66,
        'icon': '🚐',
        'category': 'office'
    },
    'robot-vacuum-office': {
        'label': 'Commercial Robot Vacuum',
        'duration_hours': 2,
        'energy_kwh': 0.15,
        'icon': '🤖',
        'category': 'office'
    },
    
    # Manufacturing Tasks  
    'injection-molding': {
        'label': 'Injection Molding Press',
        'duration_hours': 6,
        'energy_kwh': 85,
        'icon': '🏭',
        'category': 'manufacturing'
    },
    'industrial-oven': {
        'label': 'Industrial Oven',
        'duration_hours': 4,
        'energy_kwh': 120,
        'icon': '🔥',
        'category': 'manufacturing'
    },
    'kiln-firing': {
        'label': 'Kiln Firing Cycle',
        'duration_hours': 8,
        'energy_kwh': 200,
        'icon': '⚱️',
        'category': 'manufacturing'
    },
    'air-compressor': {
        'label': 'Industrial Air Compressor',
        'duration_hours': 2,
        'energy_kwh': 25,
        'icon': '💨',
        'category': 'manufacturing'
    },
    'cnc-machining': {
        'label': 'CNC Machine Operation',
        'duration_hours': 4,
        'energy_kwh': 32,
        'icon': '⚙️',
        'category': 'manufacturing'
    },
    'welding-operation': {
        'label': 'Automated Welding Line',
        'duration_hours': 3,
        'energy_kwh': 45,
        'icon': '🔧',
        'category': 'manufacturing'
    },
    'heat-treatment': {
        'label': 'Metal Heat Treatment',
        'duration_hours': 6,
        'energy_kwh': 95,
        'icon': '🌡️',
        'category': 'manufacturing'
    },
    'powder-coating': {
        'label': 'Powder Coating Oven',
        'duration_hours': 2,
        'energy_kwh': 35,
        'icon': '🎨',
        'category': 'manufacturing'
    },
    'industrial-robot-vacuum': {
        'label': 'Industrial Floor Cleaner',
        'duration_hours': 3,
        'energy_kwh': 0.8,
        'icon': '🤖',
        'category': 'manufacturing'
    },
    
    # Retail/Hospitality Tasks
    'commercial-dishwasher': {
        'label': 'Commercial Dishwasher',
        'duration_hours': 2,
        'energy_kwh': 8.5,
        'icon': '🍽️',
        'category': 'retail'
    },
    'industrial-laundry': {
        'label': 'Commercial Laundry',
        'duration_hours': 3,
        'energy_kwh': 22,
        'icon': '🧺',
        'category': 'retail'
    },
    'bakery-oven': {
        'label': 'Commercial Bakery Oven',
        'duration_hours': 4,
        'energy_kwh': 65,
        'icon': '🍞',
        'category': 'retail'
    },
    'refrigeration-defrost': {
        'label': 'Refrigeration Defrost Cycle',
        'duration_hours': 1.5,
        'energy_kwh': 12,
        'icon': '❄️',
        'category': 'retail'
    },
    'food-prep-equipment': {
        'label': 'Food Preparation Equipment',
        'duration_hours': 2,
        'energy_kwh': 15,
        'icon': '🥘',
        'category': 'retail'
    },
    'warehouse-lighting': {
        'label': 'Warehouse Lighting System',
        'duration_hours': 12,
        'energy_kwh': 48,
        'icon': '💡',
        'category': 'retail'
    },
    'cold-storage': {
        'label': 'Cold Storage Room',
        'duration_hours': 6,
        'energy_kwh': 85,
        'icon': '🧊',
        'category': 'retail'
    },
    'retail-robot-vacuum': {
        'label': 'Store Robot Vacuum',
        'duration_hours': 2.5,
        'energy_kwh': 0.2,
        'icon': '🤖',
        'category': 'retail'
    }
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
