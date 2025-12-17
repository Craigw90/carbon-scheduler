"""
Carbon Intensity API Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel

from app.services.carbon_api import (
    CarbonIntensityService,
    find_optimal_window,
    TASK_PRESETS
)

router = APIRouter(prefix="/api/carbon", tags=["carbon"])


class OptimalTimeRequest(BaseModel):
    task_type: str
    postcode: Optional[str] = "G1"


class OptimalTimeResponse(BaseModel):
    task_label: str
    task_icon: str
    optimal_window: dict
    current_intensity: int
    forecast_length: int


@router.get("/current")
async def get_current_intensity(postcode: str = Query(default="G1", description="UK Postcode")):
    """
    Get current carbon intensity for a postcode.
    
    Example: GET /api/carbon/current?postcode=G1
    """
    try:
        data = CarbonIntensityService.get_current_intensity(postcode)
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast")
async def get_forecast(
    postcode: str = Query(default="G1", description="UK Postcode"),
    hours: int = Query(default=48, ge=1, le=96, description="Hours ahead to forecast")
):
    """
    Get carbon intensity forecast for next N hours.
    
    Example: GET /api/carbon/forecast?postcode=G1&hours=48
    """
    try:
        forecast = CarbonIntensityService.get_forecast(postcode, hours)
        
        return {
            "success": True,
            "data": {
                "postcode": postcode,
                "forecast": [
                    {
                        "from": slot.from_time.isoformat(),
                        "to": slot.to_time.isoformat(),
                        "intensity": slot.intensity
                    }
                    for slot in forecast
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimal-time")
async def calculate_optimal_time(request: OptimalTimeRequest) -> OptimalTimeResponse:
    """
    Calculate the optimal time to run a task to minimize carbon emissions.
    
    Example:
    POST /api/carbon/optimal-time
    {
        "task_type": "washing-machine",
        "postcode": "G1"
    }
    """
    try:
        # Validate task type
        if request.task_type not in TASK_PRESETS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid task type. Valid options: {list(TASK_PRESETS.keys())}"
            )
        
        task = TASK_PRESETS[request.task_type]
        
        # Get carbon intensity forecast
        forecast = CarbonIntensityService.get_forecast(request.postcode, hours_ahead=48)
        
        # Find optimal window
        optimal_window = find_optimal_window(
            forecast=forecast,
            duration_hours=task['duration_hours'],
            energy_kwh=task['energy_kwh']
        )
        
        return OptimalTimeResponse(
            task_label=task['label'],
            task_icon=task['icon'],
            optimal_window={
                "start_time": optimal_window.start_time.isoformat(),
                "end_time": optimal_window.end_time.isoformat(),
                "avg_intensity": optimal_window.avg_intensity,
                "carbon_saved_grams": optimal_window.carbon_saved_grams,
                "percentage_saved": optimal_window.percentage_saved,
            },
            current_intensity=optimal_window.current_intensity,
            forecast_length=len(forecast)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating optimal time: {str(e)}")


@router.get("/tasks")
async def get_available_tasks():
    """
    Get list of all available task presets.
    
    Example: GET /api/carbon/tasks
    """
    return {
        "success": True,
        "data": {
            task_key: {
                **task_data,
                "key": task_key
            }
            for task_key, task_data in TASK_PRESETS.items()
        }
    }
