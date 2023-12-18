let viewStates = [
  {
    group: 'build',
    states: [
      'dev'
    ]
  },
  {
    group: 'active-task-info',
    states: [
      'on-streak'
    ]
  },
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
      'add', 'edit',
    ],
  },
];