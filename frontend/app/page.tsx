'use client';

import { useState, useEffect } from 'react';
import { carbonApi, type Task, type CurrentIntensityData, type OptimalTimeResponse } from '../lib/api';
import CustomTaskModal, { type CustomTask } from '../components/CustomTaskModal';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Home() {
  const [postcode, setPostcode] = useState('G1');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [currentIntensity, setCurrentIntensity] = useState<CurrentIntensityData | null>(null);
  const [optimalResult, setOptimalResult] = useState<OptimalTimeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
    loadCurrentIntensity();
    loadCustomTasks();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isValidUKPostcode(postcode)) {
        loadCurrentIntensity();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [postcode]);

  const isValidUKPostcode = (postcode: string): boolean => {
    if (!postcode || postcode.length < 2) return false;
    
    // UK postcode regex pattern
    // Matches: M1 1AA, M60 1NW, GIR 0AA, etc.
    const ukPostcodeRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]?\s?[0-9][A-Z]{2}$|^[A-Z]{1,2}[0-9R][0-9A-Z]?$/i;
    
    // Clean the postcode
    const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
    
    // Check basic pattern first
    if (!ukPostcodeRegex.test(cleanPostcode)) {
      return false;
    }
    
    // For partial postcodes (just area code), check if it's at least 2-4 characters
    if (cleanPostcode.length >= 2 && cleanPostcode.length <= 4) {
      const areaRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]?$/i;
      return areaRegex.test(cleanPostcode);
    }
    
    // For full postcodes, should be 5-7 characters
    return cleanPostcode.length >= 5 && cleanPostcode.length <= 7;
  };

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
      setError(null);
    } catch (err) {
      console.warn('Failed to load current intensity:', err);
      if (err instanceof Error && err.message.includes('Rate limited')) {
        setError('API rate limited - please wait a moment');
        setTimeout(() => loadCurrentIntensity(), 5000);
      }
    }
  };

  const handleOptimalTime = async () => {
    if (!selectedTask) return;
    
    if (!isValidUKPostcode(postcode)) {
      setError('Please enter a valid UK postcode (e.g., PA11 3SY, G1 1AA, EH1 1YZ)');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const taskData = getSelectedTaskData();
      if (!taskData) {
        setError('Task not found');
        return;
      }

      // For custom tasks, we need to use a direct calculation since they're not in the backend
      if ('is_custom' in taskData && taskData.is_custom) {
        // Get forecast data and calculate manually for custom tasks
        const forecast = await carbonApi.getForecast(postcode, 48);
        const currentIntensity = await carbonApi.getCurrentIntensity(postcode);
        
        // Simple optimal window calculation (similar to backend logic)
        const duration = taskData.duration_hours;
        const energy = taskData.energy_kwh;
        
        let bestWindow = null;
        let lowestAvgIntensity = Infinity;
        
        for (let i = 0; i <= forecast.length - Math.ceil(duration * 2); i++) {
          const windowSlots = forecast.slice(i, i + Math.ceil(duration * 2));
          const avgIntensity = windowSlots.reduce((sum, slot) => sum + slot.intensity, 0) / windowSlots.length;
          
          if (avgIntensity < lowestAvgIntensity) {
            lowestAvgIntensity = avgIntensity;
            bestWindow = {
              start_time: windowSlots[0].from,
              end_time: windowSlots[windowSlots.length - 1].to,
              avg_intensity: Math.round(avgIntensity),
              carbon_saved_grams: Math.round((currentIntensity.intensity - avgIntensity) * energy * 1000),
              percentage_saved: Math.round(((currentIntensity.intensity - avgIntensity) / currentIntensity.intensity) * 100)
            };
          }
        }

        if (bestWindow) {
          setOptimalResult({
            task_label: taskData.name,
            task_icon: taskData.icon,
            optimal_window: bestWindow,
            current_intensity: currentIntensity.intensity,
            forecast_length: forecast.length
          });
        }
      } else {
        // Use existing API for preset tasks
        const result = await carbonApi.getOptimalTime(selectedTask, postcode);
        setOptimalResult(result);
      }
    } catch (err) {
      setError('Failed to calculate optimal time');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomTasks = () => {
    const saved = localStorage.getItem('carbon-scheduler-custom-tasks');
    if (saved) {
      setCustomTasks(JSON.parse(saved));
    }
  };

  const saveCustomTask = (task: CustomTask) => {
    const updated = [...customTasks, task];
    setCustomTasks(updated);
    localStorage.setItem('carbon-scheduler-custom-tasks', JSON.stringify(updated));
    setSelectedTask(task.id);
  };

  const deleteCustomTask = (taskId: string) => {
    const updated = customTasks.filter(t => t.id !== taskId);
    setCustomTasks(updated);
    localStorage.setItem('carbon-scheduler-custom-tasks', JSON.stringify(updated));
    if (selectedTask === taskId) {
      setSelectedTask('');
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

  const getFilteredTasks = () => {
    // Combine preset and custom tasks
    const allTasks: Array<[string, Task | CustomTask]> = [
      ...Object.entries(tasks),
      ...customTasks.map(task => [task.id, task] as [string, CustomTask])
    ];

    if (selectedCategory === 'all') {
      return allTasks;
    }
    return allTasks.filter(([_, task]) => task.category === selectedCategory);
  };

  const getSelectedTaskData = () => {
    if (!selectedTask) return null;
    
    // Check preset tasks first
    if (tasks[selectedTask]) {
      return tasks[selectedTask];
    }
    
    // Check custom tasks
    const customTask = customTasks.find(t => t.id === selectedTask);
    return customTask || null;
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryNames = {
      'household': 'Household',
      'office': 'Office/Commercial', 
      'manufacturing': 'Manufacturing',
      'retail': 'Retail/Hospitality'
    };
    return categoryNames[category as keyof typeof categoryNames] || category;
  };

  const getCategoryIcon = (category: string) => {
    const categoryIcons = {
      'household': '🏠',
      'office': '🏢', 
      'manufacturing': '🏭',
      'retail': '🏪'
    };
    return categoryIcons[category as keyof typeof categoryIcons] || '';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with theme toggle */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              ⚡ Carbon-Aware Scheduler
            </h1>
            <p className="text-lg text-gray-600 dark:text-slate-300">
              Run your tasks when Scotland's grid is greenest. Reduce emissions by up to 93%.
            </p>
          </div>
          <div className="ml-4">
            <ThemeToggle />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg dark:shadow-slate-900/20 p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-4">🌍 Current Carbon Intensity</h2>
            
            <div className="mb-4">
              <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Postcode
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 ${
                    postcode.length > 1 && !isValidUKPostcode(postcode) 
                      ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' 
                      : postcode.length > 1 && isValidUKPostcode(postcode)
                      ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="e.g. PA11 3SY, G1 1AA, EH1 1YZ"
                />
                {postcode.length > 1 && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {isValidUKPostcode(postcode) ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </div>
                )}
              </div>
              {postcode.length > 1 && !isValidUKPostcode(postcode) && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">Please enter a valid UK postcode</p>
              )}
            </div>

            {currentIntensity && (
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Right now in {currentIntensity.region}:</span>
                  <span className={`text-2xl font-bold ${getIntensityColor(currentIntensity.intensity)}`}>
                    {currentIntensity.intensity}g CO₂/kWh
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg dark:shadow-slate-900/20 p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-4">🎯 Schedule Your Task</h2>
            
            <div className="mb-4">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Task Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedTask(''); // Reset task selection when category changes
                }}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              >
                <option value="all">📋 All Categories</option>
                <option value="household">{getCategoryIcon('household')} Household</option>
                <option value="office">{getCategoryIcon('office')} Office/Commercial</option>
                <option value="manufacturing">{getCategoryIcon('manufacturing')} Manufacturing</option>
                <option value="retail">{getCategoryIcon('retail')} Retail/Hospitality</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="task" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                What do you want to schedule?
              </label>
              <select
                id="task"
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a task...</option>
                {getFilteredTasks().map(([key, task]) => (
                  <option key={key} value={key}>
                    {task.icon} {'label' in task ? task.label : task.name}
                  </option>
                ))}
              </select>
              {selectedCategory !== 'all' && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Showing {getCategoryDisplayName(selectedCategory)} tasks only
                </p>
              )}
            </div>

            {selectedTask && getSelectedTaskData() && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Duration: {getSelectedTaskData()!.duration_hours}h • 
                    Energy: {getSelectedTaskData()!.energy_kwh}kWh
                    {('is_custom' in getSelectedTaskData()!) && (getSelectedTaskData()! as CustomTask).is_custom && (
                      <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                        ✨ Custom
                      </span>
                    )}
                  </div>
                  {('is_custom' in getSelectedTaskData()!) && (getSelectedTaskData()! as CustomTask).is_custom && (
                    <button
                      onClick={() => deleteCustomTask(selectedTask)}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleOptimalTime}
              disabled={loading || !selectedTask}
              className="w-full bg-blue-600 dark:bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors mb-3"
            >
              {loading ? 'Calculating...' : 'Find Optimal Time'}
            </button>

            <button
              onClick={() => setShowCustomModal(true)}
              className="w-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">⚡</span>
              Add Custom Task
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="text-red-800 dark:text-red-200">{error}</div>
          </div>
        )}

        {optimalResult && (
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg dark:shadow-slate-900/20 p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {optimalResult.task_icon} Optimal Time for {optimalResult.task_label}
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Best Time to Start</h3>
                <div className="text-xl font-bold text-green-900 dark:text-green-100">
                  {formatDateTime(optimalResult.optimal_window.start_time)}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Run until {formatDateTime(optimalResult.optimal_window.end_time)}
                </div>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  Average intensity: {optimalResult.optimal_window.avg_intensity}g CO₂/kWh
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Carbon Savings</h3>
                <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {optimalResult.optimal_window.percentage_saved}% saved
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {optimalResult.optimal_window.carbon_saved_grams}g CO₂ less emissions
                </div>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  vs running now ({optimalResult.current_intensity}g CO₂/kWh)
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                💡 Based on {optimalResult.forecast_length} hours of carbon intensity forecast data
              </p>
            </div>
          </div>
        )}

        <CustomTaskModal
          isOpen={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          onSave={saveCustomTask}
        />
      </div>
    </div>
  );
}
