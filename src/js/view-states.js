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
  // active task info
  {
    group: 'active-task-info',
    states: [ 'on-streak', 'has-target', 'is-sequence' ]
  },
  // task item
  {
    group: 'task',
    states: ['sequence', 'manage-sequence', 'sequence-added', 'collection-only', 'has-target'],
    inverseStates: ['sequence', 'manage-sequence', 'collection-only', 'sequence-added', 'sequence-mode']
  },
  // task lists
  {
    group: 'task-view-mode',
    states: [
      'task', 'mission', 'filter-target', 'has-ETA'
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