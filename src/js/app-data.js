let storageName = 'appdata-NzkwMTI0NA';

window.lsdb = new Lsdb(storageName, {
  root: {
    viewMode: 'mission', // tasks, mission
    isCompactView: false,
    
    start: null,
    history: 0,
    historyTime: 0,
    activeTask: '',
    
    // in minutes
    globalTimer: 7, 
    targetThreshold: 10,
    
    
    isFilterTaskByTargetTime: false,
    isSortByTotalProgress: false,
    
    // navigation
    activeGroupId: '',
    topMostMissionPath: '',
    
    search: '',
    labelFilter: '',
    scheduledTime: 0,
    tasks: [],
    missionIds: [],
    groups: [],
    
    // component's data
    compoMission: {},
    compoTracker: {},
    
    components: {
      compoGsiChrome: {},
      compoTargetTrackers: {},
    },
    
  },
  groups: {
    id: '',
    name: '',
    parentId: '',
  },
  task: {
    id: '',
    progress: 0,
    progressTime: 0,
    totalProgressTime: 0,
    
    // used by time balancing
    targetTime: 0,
    targetCapTime: 0,
    ratio: 0,

    lastUpdated: 0,
    untracked: false,
    activeSubTaskId: null,
    type: '',
    
    sequenceTasks: {
      counter: {
        id: -1,
      },
      activeId: null,
      items: [],
    },
  },
});


let appSettings = (function() {
  
  let SELF = {
    Save,
    SetComponentData,
    GetComponentData,
    GetNoRefComponentData,
    TaskStoreTask,
    GetActiveTaskParentId,
  };
  
  
  async function TaskStoreTask() {
    await window.service.SetData({ 
      'tasks': compoTask.GetAll() 
    });
  }
  
  function Save() {
    lsdb.save();
  }
  
  function GetActiveTaskParentId() {
    return lsdb.data.activeGroupId;
  }
  
  function clearReference(data) {
    return JSON.parse(JSON.stringify(data));
  }
  
  function SetComponentData(componentKey, noReferenceData) {
    if (!lsdb.data.components[componentKey]) return false;
    
    lsdb.data.components[componentKey] = noReferenceData;
    return true;
  }
  
  function GetComponentData(componentKey) {
    if (!lsdb.data.components[componentKey]) return null;

    return clearReference(lsdb.data.components[componentKey]);
  }
  
  function GetNoRefComponentData(componentKey) {
    return GetComponentData(componentKey);
  }
  
  return SELF;
  
})();

let appData = appSettings;