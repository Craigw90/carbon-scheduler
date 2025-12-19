'use client';

import { useState } from 'react';

interface CustomTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: CustomTask) => void;
}

export interface CustomTask {
  id: string;
  name: string;
  duration_hours: number;
  energy_kwh: number;
  icon: string;
  category: 'household' | 'office' | 'manufacturing' | 'retail';
  is_custom: boolean;
}

export default function CustomTaskModal({ isOpen, onClose, onSave }: CustomTaskModalProps) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(2);
  const [energy, setEnergy] = useState(1);
  const [durationInput, setDurationInput] = useState('2');
  const [energyInput, setEnergyInput] = useState('1');
  const [category, setCategory] = useState<CustomTask['category']>('household');
  const [iconType, setIconType] = useState<'emoji' | 'text' | 'category' | 'none'>('emoji');
  const [customIcon, setCustomIcon] = useState('⚡');

  const emojiOptions = [
    '⚡', '🔧', '🏭', '💡', '🤖', '🖥️', '🔋', '💾', '🌡️', '❄️', 
    '🔥', '💨', '⚙️', '🎨', '📄', '🚐', '🧺', '🍽️', '🍞', '🧊',
    '🥘', '☕', '💧', '🚿', '🏊', '🌿', '♻️', '🔌', '🛠️', '⚗️'
  ];

  const textSymbols = ['&', '@', '#', '*', '+', '=', '$', '%', '^', '!'];

  const getCategoryIcon = (cat: string) => {
    const icons = { 'household': '🏠', 'office': '🏢', 'manufacturing': '🏭', 'retail': '🏪' };
    return icons[cat as keyof typeof icons];
  };

  const getEnergyValidation = () => {
    const ranges = {
      'household': { min: 1, max: 50 },
      'office': { min: 1, max: 100 },
      'manufacturing': { min: 1, max: 500 },
      'retail': { min: 1, max: 200 }
    };
    return ranges[category];
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    // Validate duration and energy are valid numbers >= 1
    const finalDuration = parseInt(durationInput);
    const finalEnergy = parseInt(energyInput);
    const validation = getEnergyValidation();
    
    if (isNaN(finalDuration) || finalDuration < 1 || finalDuration > 24) return;
    if (isNaN(finalEnergy) || finalEnergy < Math.ceil(validation.min) || finalEnergy > validation.max) return;

    let finalIcon = '';
    switch (iconType) {
      case 'emoji':
        finalIcon = customIcon;
        break;
      case 'text':
        finalIcon = customIcon;
        break;
      case 'category':
        finalIcon = getCategoryIcon(category);
        break;
      case 'none':
        finalIcon = '';
        break;
    }

    const newTask: CustomTask = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      duration_hours: finalDuration,
      energy_kwh: finalEnergy,
      icon: finalIcon,
      category,
      is_custom: true
    };

    onSave(newTask);
    
    // Reset form
    setName('');
    setDuration(2);
    setEnergy(1);
    setDurationInput('2');
    setEnergyInput('1');
    setCategory('household');
    setIconType('emoji');
    setCustomIcon('⚡');
    onClose();
  };

  const validation = getEnergyValidation();
  
  const isValidForm = () => {
    if (!name.trim()) return false;
    const durationNum = parseInt(durationInput);
    const energyNum = parseInt(energyInput);
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 24) return false;
    if (isNaN(energyNum) || energyNum < Math.ceil(validation.min) || energyNum > validation.max) return false;
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">Create Custom Task</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="task-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Task Name
            </label>
            <input
              id="task-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 3D Printer, Coffee Machine, Pool Filter"
            />
          </div>

          <div>
            <label htmlFor="task-category" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              id="task-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CustomTask['category'])}
              className="w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="household">🏠 Household</option>
              <option value="office">🏢 Office/Commercial</option>
              <option value="manufacturing">🏭 Manufacturing</option>
              <option value="retail">🏪 Retail/Hospitality</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-duration-range" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Duration (hours)
            </label>
            <div className="flex gap-3 items-center">
              <input
                id="task-duration-range"
                type="range"
                min="1"
                max="24"
                step="1"
                value={duration}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  setDuration(newValue);
                  setDurationInput(newValue.toString());
                }}
                className="flex-1"
              />
              <input
                id="task-duration-number"
                type="number"
                min="1"
                max="24"
                value={durationInput}
                onChange={(e) => {
                  setDurationInput(e.target.value);
                  const numValue = parseInt(e.target.value);
                  if (!isNaN(numValue) && numValue >= 1 && numValue <= 24) {
                    setDuration(numValue);
                  }
                }}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded text-center"
              />
              <span className="text-sm text-gray-600 dark:text-slate-400">hours</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
              <span>1h</span>
              <span>24h</span>
            </div>
          </div>

          <div>
            <label htmlFor="task-energy-range" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Energy Consumption (kWh)
            </label>
            <div className="flex gap-3 items-center">
              <input
                id="task-energy-range"
                type="range"
                min={Math.ceil(validation.min)}
                max={validation.max}
                step="1"
                value={energy}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  setEnergy(newValue);
                  setEnergyInput(newValue.toString());
                }}
                className="flex-1"
              />
              <input
                id="task-energy-number"
                type="number"
                min={Math.ceil(validation.min)}
                max={validation.max}
                value={energyInput}
                onChange={(e) => {
                  setEnergyInput(e.target.value);
                  const numValue = parseInt(e.target.value);
                  if (!isNaN(numValue) && numValue >= Math.ceil(validation.min) && numValue <= validation.max) {
                    setEnergy(numValue);
                  }
                }}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded text-center"
              />
              <span className="text-sm text-gray-600 dark:text-slate-400">kWh</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
              <span>{Math.ceil(validation.min)}kWh</span>
              <span>{validation.max}kWh</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Typical range for {category} equipment
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Icon
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="emoji"
                    checked={iconType === 'emoji'}
                    onChange={(e) => setIconType(e.target.value as any)}
                    className="mr-1"
                  />
                  Emoji
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="text"
                    checked={iconType === 'text'}
                    onChange={(e) => setIconType(e.target.value as any)}
                    className="mr-1"
                  />
                  Symbol
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="category"
                    checked={iconType === 'category'}
                    onChange={(e) => setIconType(e.target.value as any)}
                    className="mr-1"
                  />
                  Category
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="none"
                    checked={iconType === 'none'}
                    onChange={(e) => setIconType(e.target.value as any)}
                    className="mr-1"
                  />
                  None
                </label>
              </div>

              {iconType === 'emoji' && (
                <div className="grid grid-cols-10 gap-1 max-h-20 overflow-y-auto border border-gray-300 dark:border-slate-600 rounded p-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setCustomIcon(emoji)}
                      className={`p-1 text-lg hover:bg-gray-100 dark:hover:bg-slate-600 rounded ${
                        customIcon === emoji ? 'bg-blue-100' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {iconType === 'text' && (
                <div className="flex gap-1 flex-wrap">
                  {textSymbols.map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => setCustomIcon(symbol)}
                      className={`px-2 py-1 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 ${
                        customIcon === symbol ? 'bg-blue-100' : ''
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={iconType === 'text' ? customIcon : ''}
                    onChange={(e) => setCustomIcon(e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded text-center"
                    maxLength={4}
                    placeholder="ABC"
                  />
                </div>
              )}

              <div className="text-sm text-gray-500 dark:text-slate-400">
                Preview: {iconType === 'category' ? getCategoryIcon(category) : iconType === 'none' ? '(no icon)' : customIcon} {name || 'Task Name'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValidForm()}
            className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-slate-600"
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}