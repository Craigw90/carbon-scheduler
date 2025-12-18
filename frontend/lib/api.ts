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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const carbonApi = {
  async getCurrentIntensity(postcode: string = 'G1'): Promise<CurrentIntensityData> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/carbon/current?postcode=${postcode}`, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        if (response.status === 429) {
          await delay(2000);
          throw new Error('Rate limited - please wait a moment');
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch current intensity`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  },

  async getForecast(postcode: string = 'G1', hours: number = 48): Promise<CarbonIntensity[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/carbon/forecast?postcode=${postcode}&hours=${hours}`, {
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) {
        if (response.status === 429) {
          await delay(3000);
          throw new Error('Rate limited - please wait a moment');
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch forecast`);
      }
      const result = await response.json();
      return result.data.forecast;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  },

  async getOptimalTime(taskType: string, postcode: string = 'G1'): Promise<OptimalTimeResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/carbon/optimal-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_type: taskType,
          postcode: postcode
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) {
        if (response.status === 429) {
          await delay(3000);
          throw new Error('Rate limited - please wait a moment');
        }
        throw new Error(`HTTP ${response.status}: Failed to calculate optimal time`);
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  },

  async getTasks(): Promise<Record<string, Task>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/carbon/tasks`, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        if (response.status === 429) {
          await delay(2000);
          throw new Error('Rate limited - please wait a moment');
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch tasks`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }
};