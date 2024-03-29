let compoTracker = (function() {
  
  'use strict';
  
  let SELF = {
    // generic methods
    Init,
    GetActive,
    GetActiveId,
    List,
    GetAll,
    GetById,
    SetActiveById,
    ToggleActiveById,
    UnsetActive,
    Commit,
    Add,
    UpdateById,
    DeleteById,
    
    // custom methods
    AppendProgressToActiveTracker,
    UpdateActiveTrackerProgress,
  };
  
  let data = {
    activeId: null,
    items: [],
    // this model version : 2
    /* items[]
      {
        id: '',
        title: '',
        progressTime: 0,
        isActive: false,
      }
    */
  };
  
  let dataModel = {
    version: 2,
    items: {
      id: '',
      title: '',
      progressTime: 0,
      isActive: false,
    }
  };
  
  function UpdateActiveTrackerProgress(distanceTime) {
    AppendProgressToActiveTracker(distanceTime);
    Commit();
  }
  
  function initData() {
    let appDataManager = app.GetDataManager();
    
    if (Object.keys(appDataManager.data.compoTracker).length == 0) return;
    
    data = clearReference(appDataManager.data.compoTracker);
  }
  
  function Commit() {
    let appDataManager = app.GetDataManager();
    appDataManager.data.compoTracker = clearReference(data);
  }
  
  function Add(title) {
    let id = uuidV4Util.Generate();
    let group = {
      id,
      title,
      progressTime: 0,
      isActive: false,
    };
    data.items.push(group);
    
    return group;
  }
  
  function SetActiveById(id) {
    let group = GetById(id);
    if (group == null) return false;
  
    data.activeId = id;
    
    return true;
  }
  
  function ToggleActiveById(id) {
    let activeId = GetActiveId();
    if (activeId === id) {
      UnsetActive();
    } else {
      return SetActiveById(id);
    }
    
    return true;
  }
  
  function DeleteById(id) {
    let delIndex = getGroupIndexById(id);
    if (delIndex < 0) return null;
    
    let item = data.items.splice(delIndex, 1);
    let activeId = GetActiveId();
    
    if (data.items.length == 0 || item[0].id == activeId) {
      UnsetActive();
    }
    
    return item;
  }
  
  function UpdateById(id, incomingData, modelCheck = true) {
    let item = GetById(id);
    if (!item) return null;
    
    for (let key in incomingData) {
      if (!modelCheck || ( typeof(item[key]) != 'undefined' && typeof(item[key]) == typeof(incomingData[key]) )) {
        item[key] = incomingData[key];
      }
    }
    
    return item;
  }
  
  function UnsetActive() {
    data.activeId = null;
  }
  
  function getGroupIndexById(id) {
    return data.items.findIndex(item => item.id == id);
  }
  
  function generateId() {
    return (new Date()).getTime().toString();
  }
  
  function Init() {
    initData();
  }
    
  function clearReference(data) {
    return JSON.parse(JSON.stringify(data));
  }
  
  function GetById(id) {
    let group = data.items.find(x => x.id == id);
    if (group !== undefined) return group;
    
    return null;
  }
    
  function List() {
    return data.items;
  }
  
  function GetAll() {
    return List();
  }
  
  function GetActive() {
    return GetById(GetActiveId());
  }
  
  function GetActiveId() {
    return data.activeId;
  }
  
  function AppendProgressToActiveTracker(time) {
    let items = GetAll();
    for (let item of items) {
      if (item.isActive) {
        item.progressTime += time;
      }
    }
  }
    
  return SELF;
  
})();