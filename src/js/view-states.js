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
      'linked-task', 'track-progress'
    ]
  },
  // active task info
  {
    group: 'active-task-info',
    states: [ 'has-target', 'is-sequence', 'has-ETA' ]
  },
  // task item
  {
    group: 'task',
    states: ['sequence', 'manage-sequence', 'sequence-added', 'collection-only', 'has-target', 'is-collection', 'toolbarExpanded'],
    inverseStates: ['sequence', 'manage-sequence', 'collection-only', 'sequence-added', 'sequence-mode', 'is-collection']
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
      'tracker-overlay', 'interactive-sequence-task-pick', 'search-bar',
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
      'home', 'settings', 'trackers', 'priority-mapper', 'collections', 'by-threshold', 'task-detail'
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