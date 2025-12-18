/**
 * Tests for API client functions
 */
import { carbonApi, type Task, type CurrentIntensityData, type OptimalTimeResponse } from '../../lib/api';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('carbonApi', () => {
  const mockResponse = (data: any, status = 200) => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    } as Response);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('getCurrentIntensity', () => {
    it('should fetch current intensity successfully', async () => {
      const mockData = {
        data: {
          intensity: 150,
          region: 'Scotland',
          timestamp: '2023-12-18T12:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce(mockResponse(mockData));

      const result = await carbonApi.getCurrentIntensity('G1');

      expect(result).toEqual(mockData.data);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/carbon/current?postcode=G1',
        { signal: undefined }
      );
    });

    it('should use default postcode when not provided', async () => {
      const mockData = {
        data: {
          intensity: 120,
          region: 'Scotland',
          timestamp: '2023-12-18T12:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce(mockResponse(mockData));

      const result = await carbonApi.getCurrentIntensity();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/carbon/current?postcode=G1',
        { signal: undefined }
      );
    });

    it('should handle rate limiting with retry', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 429));

      const promise = carbonApi.getCurrentIntensity('G1');

      await expect(promise).rejects.toThrow('Rate limited - please wait a moment');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 500));

      await expect(carbonApi.getCurrentIntensity('G1')).rejects.toThrow(
        'HTTP 500: Failed to fetch current intensity'
      );
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('AbortError'));
      Object.defineProperty(Error.prototype, 'name', { value: 'AbortError' });

      await expect(carbonApi.getCurrentIntensity('G1')).rejects.toThrow('Request timed out');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(carbonApi.getCurrentIntensity('G1')).rejects.toThrow('Network error');
    });
  });

  describe('getForecast', () => {
    it('should fetch forecast successfully', async () => {
      const mockForecastData = [
        {
          from: '2023-12-18T12:00:00Z',
          to: '2023-12-18T12:30:00Z',
          intensity: 100
        },
        {
          from: '2023-12-18T12:30:00Z',
          to: '2023-12-18T13:00:00Z',
          intensity: 120
        }
      ];

      const mockData = {
        data: { forecast: mockForecastData }
      };

      mockFetch.mockResolvedValueOnce(mockResponse(mockData));

      const result = await carbonApi.getForecast('G1', 24);

      expect(result).toEqual(mockForecastData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/carbon/forecast?postcode=G1&hours=24',
        { signal: undefined }
      );
    });

    it('should use default parameters', async () => {
      const mockData = { data: { forecast: [] } };
      mockFetch.mockResolvedValueOnce(mockResponse(mockData));

      await carbonApi.getForecast();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/carbon/forecast?postcode=G1&hours=48',
        { signal: undefined }
      );
    });

    it('should handle forecast API errors', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 404));

      await expect(carbonApi.getForecast('G1', 24)).rejects.toThrow(
        'HTTP 404: Failed to fetch forecast'
      );
    });

    it('should handle rate limiting for forecast', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 429));

      await expect(carbonApi.getForecast('G1', 24)).rejects.toThrow(
        'Rate limited - please wait a moment'
      );
    });
  });

  describe('getOptimalTime', () => {
    it('should calculate optimal time successfully', async () => {
      const mockOptimalResponse = {
        task_label: 'Washing Machine',
        task_icon: '🧺',
        optimal_window: {
          start_time: '2023-12-18T14:00:00Z',
          end_time: '2023-12-18T16:00:00Z',
          avg_intensity: 80,
          carbon_saved_grams: 300,
          percentage_saved: 25
        },
        current_intensity: 150,
        forecast_length: 96
      };

      mockFetch.mockResolvedValueOnce(mockResponse(mockOptimalResponse));

      const result = await carbonApi.getOptimalTime('washing-machine', 'G1');

      expect(result).toEqual(mockOptimalResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/carbon/optimal-time',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_type: 'washing-machine',
            postcode: 'G1'
          }),
          signal: expect.any(AbortSignal)
        }
      );
    });

    it('should use default postcode for optimal time', async () => {
      const mockResponse = {
        task_label: 'Test Task',
        task_icon: '⚡',
        optimal_window: {
          start_time: '2023-12-18T14:00:00Z',
          end_time: '2023-12-18T16:00:00Z',
          avg_intensity: 100,
          carbon_saved_grams: 200,
          percentage_saved: 20
        },
        current_intensity: 120,
        forecast_length: 96
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await carbonApi.getOptimalTime('dishwasher');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            task_type: 'dishwasher',
            postcode: 'G1'
          })
        })
      );
    });

    it('should handle invalid task type error', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ detail: 'Invalid task type' }, 400));

      await expect(carbonApi.getOptimalTime('invalid-task', 'G1')).rejects.toThrow(
        'HTTP 400: Failed to calculate optimal time'
      );
    });

    it('should handle optimal time calculation errors', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 500));

      await expect(carbonApi.getOptimalTime('washing-machine', 'G1')).rejects.toThrow(
        'HTTP 500: Failed to calculate optimal time'
      );
    });
  });

  describe('getTasks', () => {
    it('should fetch available tasks successfully', async () => {
      const mockTasksData = {
        'washing-machine': {
          label: 'Washing Machine',
          duration_hours: 2,
          energy_kwh: 1.5,
          icon: '🧺',
          category: 'household' as const,
          key: 'washing-machine'
        },
        'dishwasher': {
          label: 'Dishwasher',
          duration_hours: 2,
          energy_kwh: 1.8,
          icon: '🍽️',
          category: 'household' as const,
          key: 'dishwasher'
        }
      };

      const mockData = {
        success: true,
        data: mockTasksData
      };

      mockFetch.mockResolvedValueOnce(mockResponse(mockData));

      const result = await carbonApi.getTasks();

      expect(result).toEqual(mockTasksData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/carbon/tasks',
        { signal: undefined }
      );
    });

    it('should handle tasks API errors', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 503));

      await expect(carbonApi.getTasks()).rejects.toThrow(
        'HTTP 503: Failed to fetch tasks'
      );
    });

    it('should handle rate limiting for tasks', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 429));

      await expect(carbonApi.getTasks()).rejects.toThrow(
        'Rate limited - please wait a moment'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle timeout consistently across all methods', async () => {
      const timeoutError = new Error('timeout');
      Object.defineProperty(timeoutError, 'name', { value: 'AbortError' });
      mockFetch.mockRejectedValue(timeoutError);

      await expect(carbonApi.getCurrentIntensity()).rejects.toThrow('Request timed out');
      await expect(carbonApi.getForecast()).rejects.toThrow('Request timed out');
      await expect(carbonApi.getOptimalTime('test')).rejects.toThrow('Request timed out');
      await expect(carbonApi.getTasks()).rejects.toThrow('Request timed out');
    });

    it('should propagate unknown errors', async () => {
      const unknownError = new Error('Unknown network error');
      mockFetch.mockRejectedValue(unknownError);

      await expect(carbonApi.getCurrentIntensity()).rejects.toThrow('Unknown network error');
    });
  });

  describe('API URL configuration', () => {
    it('should use environment API URL when available', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';

      // Re-import the module to pick up the new environment variable
      jest.resetModules();
      const { carbonApi: newCarbonApi } = require('../../lib/api');

      mockFetch.mockResolvedValueOnce(mockResponse({ data: {} }));

      await newCarbonApi.getCurrentIntensity();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/carbon/current?postcode=G1',
        expect.any(Object)
      );

      // Restore original environment
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    });
  });
});