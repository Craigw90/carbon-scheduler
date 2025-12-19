"""
Task Presets Configuration
Predefined task configurations organized by business categories
"""

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
