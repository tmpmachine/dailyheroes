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
    states: ['sequence', 'manage-sequence', 'sequence-added', 'collection-only'],
    inverseStates: ['sequence', 'manage-sequence', 'collection-only', 'sequence-added', 'sequence-mode']
  },
  // task lists
  {
    group: 'task-view-mode',
    states: [
      'task', 'mission', 'filter-target',
    ],
    inverseStates: [
      'filter-target',
    ],
  },
  // features
  {
    group: 'features',
    states: [
      'tracker-overlay', 'interactive-sequence-task-pick',
    ],
    inverseStates: [
      'interactive-sequence-task-pick',  
    ]
  },
  {
    group: 'auth',
    states: [
      'authorized',
    ],
  },
  // app screens
  {
    group: 'screens',
    states: [
      'home', 'settings', 'trackers', 'priority-mapper', 'collections', 'by-threshold',
    ],
  },
  {
    group: 'platform',
    states: [
      'web',
    ],
  },
  // form task
  {
    group: 'form-task',
    states: [
      'add', 'edit', 'collection-only',
    ],
    inverseStates: [
      'collection-only',
    ],
  },
  {
    group: 'form-task-sequence',
    states: [
      'add', 'edit', 'linked-task',
    ],
  },
];