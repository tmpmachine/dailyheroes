let viewStates = [
  {
    group: 'build',
    states: [
      'dev'
    ]
  },
  {
    group: 'sequence-item',
    states: [
      'linked-task'
    ]
  },
  {
    group: 'active-task-info',
    states: [
      'on-streak'
    ]
  },
  // task item
  {
    group: 'task',
    states: ['sequence', 'manage-sequence'],
    inverseStates: ['sequence', 'manage-sequence']
  },
  // task lists
  {
    group: 'task-view-mode',
    states: [
      'task',
      'mission',
      'filter-target',
    ],
    inverseStates: [
      'filter-target',
    ],
  },
  {
    group: 'features',
    states: [
      'tracker-overlay',
    ],
  },
  {
    group: 'auth',
    states: [
      'authorized',
    ],
  },
  {
    group: 'screens',
    states: [
      'home',
      'settings',
      'trackers',
      'priority-mapper',
    ],
  },
  {
    group: 'platform',
    states: [
      'web',
    ],
  },
  {
    group: 'form-task',
    states: [
      'add', 'edit',
    ],
  },
  {
    group: 'form-task-sequence',
    states: [
      'add', 'edit', 'linked-task',
    ],
  },
];