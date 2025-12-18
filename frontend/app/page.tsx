'use client';

import { useState, useEffect } from 'react';
import { carbonApi, type Task, type CurrentIntensityData, type OptimalTimeResponse } from '../lib/api';

export default function Home() {
  const [postcode, setPostcode] = useState('G1');
  const [selectedTask, setSelectedTask] = useState('');
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [currentIntensity, setCurrentIntensity] = useState<CurrentIntensityData | null>(null);
  const [optimalResult, setOptimalResult] = useState<OptimalTimeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
    loadCurrentIntensity();
  }, []);

  useEffect(() => {
    loadCurrentIntensity();
  }, [postcode]);

  const loadTasks = async () => {
    try {
      const tasksData = await carbonApi.getTasks();
      setTasks(tasksData);
      if (Object.keys(tasksData).length > 0) {
        setSelectedTask(Object.keys(tasksData)[0]);
      }
    } catch (err) {
      setError('Failed to load tasks');
    }
  };

  const loadCurrentIntensity = async () => {
    try {
      const data = await carbonApi.getCurrentIntensity(postcode);
      setCurrentIntensity(data);
    } catch (err) {
      console.error('Failed to load current intensity:', err);
    }
  };

  const handleOptimalTime = async () => {
    if (!selectedTask) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await carbonApi.getOptimalTime(selectedTask, postcode);
      setOptimalResult(result);
    } catch (err) {
      setError('Failed to calculate optimal time');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity < 100) return 'text-green-600';
    if (intensity < 200) return 'text-yellow-600';
    if (intensity < 300) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ⚡ Carbon-Aware Scheduler
          </h1>
          <p className="text-lg text-gray-600">
            Run your tasks when Scotland's grid is greenest. Reduce emissions by up to 93%.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">🌍 Current Carbon Intensity</h2>
            
            <div className="mb-4">
              <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-2">
                Postcode
              </label>
              <input
                type="text"
                id="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. G1, EH1, AB1"
              />
            </div>

            {currentIntensity && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Right now in {currentIntensity.region}:</span>
                  <span className={`text-2xl font-bold ${getIntensityColor(currentIntensity.intensity)}`}>
                    {currentIntensity.intensity}g CO₂/kWh
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">🎯 Schedule Your Task</h2>
            
            <div className="mb-4">
              <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
                What do you want to schedule?
              </label>
              <select
                id="task"
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(tasks).map(([key, task]) => (
                  <option key={key} value={key}>
                    {task.icon} {task.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedTask && tasks[selectedTask] && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600">
                  Duration: {tasks[selectedTask].duration_hours}h • 
                  Energy: {tasks[selectedTask].energy_kwh}kWh
                </div>
              </div>
            )}

            <button
              onClick={handleOptimalTime}
              disabled={loading || !selectedTask}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Calculating...' : 'Find Optimal Time'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {optimalResult && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              {optimalResult.task_icon} Optimal Time for {optimalResult.task_label}
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Best Time to Start</h3>
                <div className="text-xl font-bold text-green-900">
                  {formatDateTime(optimalResult.optimal_window.start_time)}
                </div>
                <div className="text-sm text-green-700">
                  Run until {formatDateTime(optimalResult.optimal_window.end_time)}
                </div>
                <div className="mt-2 text-sm text-green-700">
                  Average intensity: {optimalResult.optimal_window.avg_intensity}g CO₂/kWh
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Carbon Savings</h3>
                <div className="text-xl font-bold text-blue-900">
                  {optimalResult.optimal_window.percentage_saved}% saved
                </div>
                <div className="text-sm text-blue-700">
                  {optimalResult.optimal_window.carbon_saved_grams}g CO₂ less emissions
                </div>
                <div className="mt-2 text-sm text-blue-700">
                  vs running now ({optimalResult.current_intensity}g CO₂/kWh)
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                💡 Based on {optimalResult.forecast_length} hours of carbon intensity forecast data
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
