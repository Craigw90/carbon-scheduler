/**
 * Tests for main page component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../../app/page';
import * as api from '../../lib/api';

// Mock the API module
jest.mock('../../lib/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock the CustomTaskModal component
jest.mock('../../components/CustomTaskModal', () => {
  return function MockCustomTaskModal({ isOpen, onClose, onSave }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="custom-task-modal">
        <button onClick={onClose}>Close Modal</button>
        <button
          onClick={() =>
            onSave({
              id: 'custom-test',
              name: 'Test Custom Task',
              duration_hours: 2,
              energy_kwh: 5,
              icon: '⚡',
              category: 'household',
              is_custom: true,
            })
          }
        >
          Save Test Task
        </button>
      </div>
    );
  };
});

describe('Home Page', () => {
  const mockTasksData = {
    'washing-machine': {
      key: 'washing-machine',
      label: 'Washing Machine',
      duration_hours: 2,
      energy_kwh: 1.5,
      icon: '🧺',
      category: 'household' as const,
    },
    'dishwasher': {
      key: 'dishwasher',
      label: 'Dishwasher',
      duration_hours: 2,
      energy_kwh: 1.8,
      icon: '🍽️',
      category: 'household' as const,
    },
    'server-backup': {
      key: 'server-backup',
      label: 'Server Backup',
      duration_hours: 3,
      energy_kwh: 2.5,
      icon: '💾',
      category: 'office' as const,
    },
  };

  const mockCurrentIntensity = {
    intensity: 150,
    region: 'Scotland',
    timestamp: '2023-12-18T12:00:00Z',
  };

  const mockOptimalResult = {
    task_label: 'Washing Machine',
    task_icon: '🧺',
    optimal_window: {
      start_time: '2023-12-18T14:00:00Z',
      end_time: '2023-12-18T16:00:00Z',
      avg_intensity: 80,
      carbon_saved_grams: 300,
      percentage_saved: 25,
    },
    current_intensity: 150,
    forecast_length: 96,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.carbonApi.getTasks.mockResolvedValue(mockTasksData);
    mockApi.carbonApi.getCurrentIntensity.mockResolvedValue(mockCurrentIntensity);
    localStorage.clear();
  });

  describe('Initial Render', () => {
    it('should render page title and description', () => {
      render(<Home />);

      expect(screen.getByText('⚡ Carbon-Aware Scheduler')).toBeInTheDocument();
      expect(
        screen.getByText(/Run your tasks when Scotland's grid is greenest/)
      ).toBeInTheDocument();
    });

    it('should render carbon intensity section', () => {
      render(<Home />);

      expect(screen.getByText('🌍 Current Carbon Intensity')).toBeInTheDocument();
      expect(screen.getByLabelText('Postcode')).toBeInTheDocument();
    });

    it('should render task scheduling section', () => {
      render(<Home />);

      expect(screen.getByText('🎯 Schedule Your Task')).toBeInTheDocument();
      expect(screen.getByLabelText('Task Category')).toBeInTheDocument();
      expect(screen.getByText('What do you want to schedule?')).toBeInTheDocument();
    });

    it('should render custom task button', () => {
      render(<Home />);

      expect(screen.getByText('Add Custom Task')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should load tasks on mount', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(mockApi.carbonApi.getTasks).toHaveBeenCalled();
      });

      // Should show tasks in dropdown
      expect(screen.getByText('🧺 Washing Machine')).toBeInTheDocument();
      expect(screen.getByText('🍽️ Dishwasher')).toBeInTheDocument();
    });

    it('should load current intensity on mount', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(mockApi.carbonApi.getCurrentIntensity).toHaveBeenCalledWith('G1');
      });

      await waitFor(() => {
        expect(screen.getByText('150g CO₂/kWh')).toBeInTheDocument();
        expect(screen.getByText(/Right now in Scotland:/)).toBeInTheDocument();
      });
    });
  });

  describe('Postcode Input', () => {
    it('should validate UK postcodes', async () => {
      const user = userEvent.setup();
      render(<Home />);

      const postcodeInput = screen.getByLabelText('Postcode');

      // Valid postcode
      await user.clear(postcodeInput);
      await user.type(postcodeInput, 'G1 1AA');
      expect(screen.getByText('✓')).toBeInTheDocument();

      // Invalid postcode
      await user.clear(postcodeInput);
      await user.type(postcodeInput, 'INVALID');
      expect(screen.getByText('✗')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid UK postcode')).toBeInTheDocument();
    });

    it('should debounce API calls for valid postcodes', async () => {
      const user = userEvent.setup();
      render(<Home />);

      const postcodeInput = screen.getByLabelText('Postcode');

      // Clear and type new postcode
      await user.clear(postcodeInput);
      await user.type(postcodeInput, 'M1 1AA');

      // Should not call API immediately
      expect(mockApi.carbonApi.getCurrentIntensity).toHaveBeenCalledTimes(1); // Initial call only

      // Wait for debounce
      await waitFor(
        () => {
          expect(mockApi.carbonApi.getCurrentIntensity).toHaveBeenCalledWith('M1 1AA');
        },
        { timeout: 1000 }
      );
    });

    it('should not call API for invalid postcodes', async () => {
      const user = userEvent.setup();
      render(<Home />);

      const postcodeInput = screen.getByLabelText('Postcode');
      const initialCalls = mockApi.carbonApi.getCurrentIntensity.mock.calls.length;

      await user.clear(postcodeInput);
      await user.type(postcodeInput, 'INVALID');

      // Wait to ensure no additional API calls
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(mockApi.carbonApi.getCurrentIntensity).toHaveBeenCalledTimes(initialCalls);
    });
  });

  describe('Task Selection', () => {
    it('should filter tasks by category', async () => {
      const user = userEvent.setup();
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('🧺 Washing Machine')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText('Task Category');
      await user.selectOptions(categorySelect, 'office');

      // Should show only office tasks
      expect(screen.getByText('💾 Server Backup')).toBeInTheDocument();
      expect(screen.queryByText('🧺 Washing Machine')).not.toBeInTheDocument();
    });

    it('should show all tasks when "all" category selected', async () => {
      const user = userEvent.setup();
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('🧺 Washing Machine')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText('Task Category');
      await user.selectOptions(categorySelect, 'office');
      await user.selectOptions(categorySelect, 'all');

      // Should show all tasks
      expect(screen.getByText('🧺 Washing Machine')).toBeInTheDocument();
      expect(screen.getByText('💾 Server Backup')).toBeInTheDocument();
    });

    it('should display task details when selected', async () => {
      const user = userEvent.setup();
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('🧺 Washing Machine')).toBeInTheDocument();
      });

      const taskSelect = screen.getByDisplayValue('Select a task...');
      await user.selectOptions(taskSelect, 'washing-machine');

      expect(screen.getByText('Duration: 2h • Energy: 1.5kWh')).toBeInTheDocument();
    });
  });

  describe('Optimal Time Calculation', () => {
    it('should calculate optimal time for selected task', async () => {
      const user = userEvent.setup();
      mockApi.carbonApi.getOptimalTime.mockResolvedValue(mockOptimalResult);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('🧺 Washing Machine')).toBeInTheDocument();
      });

      // Select task and calculate
      const taskSelect = screen.getByDisplayValue('Select a task...');
      await user.selectOptions(taskSelect, 'washing-machine');

      const findButton = screen.getByText('Find Optimal Time');
      await user.click(findButton);

      expect(mockApi.carbonApi.getOptimalTime).toHaveBeenCalledWith('washing-machine', 'G1');

      await waitFor(() => {
        expect(screen.getByText('🧺 Optimal Time for Washing Machine')).toBeInTheDocument();
        expect(screen.getByText('25% saved')).toBeInTheDocument();
        expect(screen.getByText('300g CO₂ less emissions')).toBeInTheDocument();
      });
    });

    it('should show loading state during calculation', async () => {
      const user = userEvent.setup();
      mockApi.carbonApi.getOptimalTime.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockOptimalResult), 100))
      );

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('🧺 Washing Machine')).toBeInTheDocument();
      });

      const taskSelect = screen.getByDisplayValue('Select a task...');
      await user.selectOptions(taskSelect, 'washing-machine');

      const findButton = screen.getByText('Find Optimal Time');
      await user.click(findButton);

      expect(screen.getByText('Calculating...')).toBeInTheDocument();
    });

    it('should validate postcode before calculation', async () => {
      const user = userEvent.setup();
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('🧺 Washing Machine')).toBeInTheDocument();
      });

      // Set invalid postcode
      const postcodeInput = screen.getByLabelText('Postcode');
      await user.clear(postcodeInput);
      await user.type(postcodeInput, 'INVALID');

      const taskSelect = screen.getByDisplayValue('Select a task...');
      await user.selectOptions(taskSelect, 'washing-machine');

      const findButton = screen.getByText('Find Optimal Time');
      await user.click(findButton);

      expect(
        screen.getByText(/Please enter a valid UK postcode/)
      ).toBeInTheDocument();
      expect(mockApi.carbonApi.getOptimalTime).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      mockApi.carbonApi.getOptimalTime.mockRejectedValue(new Error('API Error'));

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('🧺 Washing Machine')).toBeInTheDocument();
      });

      const taskSelect = screen.getByDisplayValue('Select a task...');
      await user.selectOptions(taskSelect, 'washing-machine');

      const findButton = screen.getByText('Find Optimal Time');
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to calculate optimal time')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Tasks', () => {
    it('should open custom task modal', async () => {
      const user = userEvent.setup();
      render(<Home />);

      const customButton = screen.getByText('Add Custom Task');
      await user.click(customButton);

      expect(screen.getByTestId('custom-task-modal')).toBeInTheDocument();
    });

    it('should save custom task to localStorage', async () => {
      const user = userEvent.setup();
      render(<Home />);

      const customButton = screen.getByText('Add Custom Task');
      await user.click(customButton);

      const saveButton = screen.getByText('Save Test Task');
      await user.click(saveButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'carbon-scheduler-custom-tasks',
        expect.stringContaining('Test Custom Task')
      );
    });

    it('should display saved custom tasks', async () => {
      const user = userEvent.setup();
      
      // Pre-populate localStorage
      const customTasks = [
        {
          id: 'custom-1',
          name: 'My Custom Task',
          duration_hours: 3,
          energy_kwh: 4,
          icon: '⚡',
          category: 'household',
          is_custom: true,
        },
      ];
      localStorage.setItem('carbon-scheduler-custom-tasks', JSON.stringify(customTasks));

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('⚡ My Custom Task')).toBeInTheDocument();
      });
    });

    it('should allow deleting custom tasks', async () => {
      const user = userEvent.setup();
      
      // Pre-populate localStorage with custom task
      const customTasks = [
        {
          id: 'custom-1',
          name: 'My Custom Task',
          duration_hours: 3,
          energy_kwh: 4,
          icon: '⚡',
          category: 'household',
          is_custom: true,
        },
      ];
      localStorage.setItem('carbon-scheduler-custom-tasks', JSON.stringify(customTasks));

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('⚡ My Custom Task')).toBeInTheDocument();
      });

      // Select the custom task to show details
      const taskSelect = screen.getByDisplayValue('Select a task...');
      await user.selectOptions(taskSelect, 'custom-1');

      // Delete button should be visible
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'carbon-scheduler-custom-tasks',
        '[]'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle task loading errors', async () => {
      mockApi.carbonApi.getTasks.mockRejectedValue(new Error('Tasks API Error'));

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
      });
    });

    it('should handle current intensity errors gracefully', async () => {
      mockApi.carbonApi.getCurrentIntensity.mockRejectedValue(new Error('Rate limited'));

      render(<Home />);

      // Should not crash, just log warning
      expect(screen.getByText('⚡ Carbon-Aware Scheduler')).toBeInTheDocument();
    });
  });
});