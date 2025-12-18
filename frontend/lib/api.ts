/**
 * API Client for Carbon Scheduler Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CarbonIntensity {
  from: string;
  to: string;
  intensity: number;
}

export interface CurrentIntensityData {
  intensity: number;
  region: string;
  timestamp: string;
}

export interface OptimalWindow {
  start_time: string;
  end_time: string;
  avg_intensity: number;
  carbon_saved_grams: number;
  percentage_saved: number;
}

export interface Task {
  key: string;
  label: string;
  duration_hours: number;
  energy_kwh: number;
  icon: string;
}

export interface OptimalTimeResponse {
  task_label: string;
  task_icon: string;
  optimal_window: OptimalWindow;
  current_intensity: number;
  forecast_length: number;
}

export const carbonApi = {
  async getCurrentIntensity(postcode: string = 'G1'): Promise<CurrentIntensityData> {
    const response = await fetch(`${API_BASE_URL}/api/carbon/current?postcode=${postcode}`);
    if (!response.ok) {
      throw new Error('Failed to fetch current intensity');
    }
    const result = await response.json();
    return result.data;
  },

  async getForecast(postcode: string = 'G1', hours: number = 48): Promise<CarbonIntensity[]> {
    const response = await fetch(`${API_BASE_URL}/api/carbon/forecast?postcode=${postcode}&hours=${hours}`);
    if (!response.ok) {
      throw new Error('Failed to fetch forecast');
    }
    const result = await response.json();
    return result.data.forecast;
  },

  async getOptimalTime(taskType: string, postcode: string = 'G1'): Promise<OptimalTimeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/carbon/optimal-time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_type: taskType,
        postcode: postcode
      })
    });
    if (!response.ok) {
      throw new Error('Failed to calculate optimal time');
    }
    return response.json();
  },

  async getTasks(): Promise<Record<string, Task>> {
    const response = await fetch(`${API_BASE_URL}/api/carbon/tasks`);
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    const result = await response.json();
    return result.data;
  }
};