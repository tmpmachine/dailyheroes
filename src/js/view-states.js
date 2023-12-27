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
    inverseStates: ['sequence', 'manage-sequence', 'collection-only']
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
  // app screens
  {
    group: 'screens',
    states: [
      'home', 'settings', 'trackers', 'priority-mapper', 'collections', 
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
      'add', 'edit', 'mission-tab',
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