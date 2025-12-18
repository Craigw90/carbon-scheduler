/**
 * Tests for CustomTaskModal component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomTaskModal, { type CustomTask } from '../../components/CustomTaskModal';

describe('CustomTaskModal', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <CustomTaskModal {...defaultProps} isOpen={false} />
      );

      expect(screen.queryByText('Create Custom Task')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<CustomTaskModal {...defaultProps} />);

      expect(screen.getByText('Create Custom Task')).toBeInTheDocument();
      expect(screen.getByLabelText('Task Name')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
      expect(screen.getByLabelText('Duration (hours)')).toBeInTheDocument();
      expect(screen.getByLabelText('Energy Consumption (kWh)')).toBeInTheDocument();
      expect(screen.getByText('Icon')).toBeInTheDocument();
    });

    it('should render all category options', () => {
      render(<CustomTaskModal {...defaultProps} />);

      const categorySelect = screen.getByRole('combobox', { name: 'Category' });
      expect(categorySelect).toHaveValue('household');

      // Check all options are present
      expect(screen.getByText('🏠 Household')).toBeInTheDocument();
      expect(screen.getByText('🏢 Office/Commercial')).toBeInTheDocument();
      expect(screen.getByText('🏭 Manufacturing')).toBeInTheDocument();
      expect(screen.getByText('🏪 Retail/Hospitality')).toBeInTheDocument();
    });

    it('should render icon type radio buttons', () => {
      render(<CustomTaskModal {...defaultProps} />);

      expect(screen.getByLabelText('Emoji')).toBeInTheDocument();
      expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
      expect(screen.getByDisplayValue('category')).toBeInTheDocument();
      expect(screen.getByLabelText('None')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable save button when form is invalid', () => {
      render(<CustomTaskModal {...defaultProps} />);

      const saveButton = screen.getByText('Save Task');
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when form is valid', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      // Fill in required fields
      await user.type(screen.getByLabelText('Task Name'), 'Test Task');

      const saveButton = screen.getByText('Save Task');
      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });
    });

    it('should validate task name is required', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const saveButton = screen.getByText('Save Task');
      
      // Try to save without name
      await user.click(saveButton);
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate duration is within range', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Task Name');
      const durationInput = screen.getAllByDisplayValue('2')[1]; // Number input for duration

      await user.type(nameInput, 'Test Task');
      await user.clear(durationInput);
      await user.type(durationInput, '25'); // Invalid: > 24

      const saveButton = screen.getByText('Save Task');
      expect(saveButton).toBeDisabled();
    });

    it('should validate energy consumption based on category', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Task Name');
      const categorySelect = screen.getByRole('combobox', { name: 'Category' });
      const energyInput = screen.getAllByDisplayValue('1')[1]; // Number input for energy

      await user.type(nameInput, 'Test Task');
      await user.selectOptions(categorySelect, 'manufacturing');
      await user.clear(energyInput);
      await user.type(energyInput, '600'); // Invalid: > 500 for manufacturing

      const saveButton = screen.getByText('Save Task');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('should update task name', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Task Name');
      await user.type(nameInput, 'Coffee Machine');

      expect(nameInput).toHaveValue('Coffee Machine');
    });

    it('should update category and adjust energy validation', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const categorySelect = screen.getByRole('combobox', { name: 'Category' });
      await user.selectOptions(categorySelect, 'manufacturing');

      expect(categorySelect).toHaveValue('manufacturing');

      // Check energy range updated
      expect(screen.getByText('500kWh')).toBeInTheDocument();
    });

    it('should sync slider and number inputs for duration', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const durationSlider = screen.getByLabelText('Duration (hours)');
      const durationNumber = screen.getAllByDisplayValue('2')[1]; // Number input

      // Change slider
      fireEvent.change(durationSlider, { target: { value: '5' } });
      expect(durationNumber).toHaveValue(5);

      // Change number input
      await user.clear(durationNumber);
      await user.type(durationNumber, '8');
      expect(durationSlider).toHaveValue('8');
    });

    it('should sync slider and number inputs for energy', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const energySlider = screen.getByLabelText('Energy Consumption (kWh)');
      const energyNumber = screen.getAllByDisplayValue('1')[1]; // Number input

      // Change slider
      fireEvent.change(energySlider, { target: { value: '10' } });
      expect(energyNumber).toHaveValue(10);

      // Change number input
      await user.clear(energyNumber);
      await user.type(energyNumber, '15');
      expect(energySlider).toHaveValue('15');
    });

    it('should handle icon type selection', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const symbolRadio = screen.getByLabelText('Symbol');
      await user.click(symbolRadio);

      expect(symbolRadio).toBeChecked();
      expect(screen.getByText('&')).toBeInTheDocument(); // Should show symbol options
    });

    it('should handle emoji selection', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const emojiButton = screen.getByText('🔧');
      await user.click(emojiButton);

      // Check preview shows selected emoji
      expect(screen.getByText(/🔧.*Task Name/)).toBeInTheDocument();
    });

    it('should handle category icon selection', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const categoryIconRadio = screen.getByDisplayValue('category');
      await user.click(categoryIconRadio);

      // Should show household icon (🏠) in preview
      expect(screen.getByText(/🏠.*Task Name/)).toBeInTheDocument();
    });

    it('should handle no icon selection', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const noneRadio = screen.getByDisplayValue('none');
      await user.click(noneRadio);

      // Should show "(no icon)" in preview
      expect(screen.getByText(/\(no icon\).*Task Name/)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should save valid task', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      // Fill valid form
      await user.type(screen.getByLabelText('Task Name'), 'Test Equipment');
      await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'office');

      const saveButton = screen.getByText('Save Task');
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        id: expect.stringContaining('custom-'),
        name: 'Test Equipment',
        duration_hours: 2, // Default
        energy_kwh: 1, // Default
        icon: '⚡', // Default emoji
        category: 'office',
        is_custom: true,
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset form after successful save', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      // Fill and save form
      const nameInput = screen.getByLabelText('Task Name');
      await user.type(nameInput, 'Test Task');
      await user.click(screen.getByText('Save Task'));

      // Check form is reset (name should be empty)
      expect(nameInput).toHaveValue('');
    });

    it('should close modal on cancel', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CustomTaskModal {...defaultProps} />);

      expect(screen.getByLabelText('Task Name')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
      expect(screen.getByLabelText('Duration (hours)')).toBeInTheDocument();
      expect(screen.getByLabelText('Energy Consumption (kWh)')).toBeInTheDocument();
    });

    it('should have keyboard navigation support', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Task Name');
      nameInput.focus();

      // Tab through form elements
      await user.tab();
      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Duration (hours)')).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid input changes', async () => {
      const user = userEvent.setup();
      render(<CustomTaskModal {...defaultProps} />);

      const durationInput = screen.getAllByDisplayValue('2')[1];

      // Rapid changes
      await user.clear(durationInput);
      await user.type(durationInput, '1');
      await user.type(durationInput, '0');

      expect(durationInput).toHaveValue(10);
    });

    it('should maintain form state when modal reopens', () => {
      const { rerender } = render(
        <CustomTaskModal {...defaultProps} isOpen={false} />
      );

      rerender(<CustomTaskModal {...defaultProps} isOpen={true} />);

      // Form should be reset to defaults
      expect(screen.getByLabelText('Task Name')).toHaveValue('');
      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('household');
    });
  });
});