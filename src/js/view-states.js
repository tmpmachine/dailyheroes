let viewStates = [
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
];