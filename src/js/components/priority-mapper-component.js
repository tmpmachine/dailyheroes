let compoPriorityMapper = (function() {
  
  'use strict';
  
  let SELF = {
    Init,
    Stash,
    Commit,
    // GetActive,
    // GetActiveId,
    GetAll,
    // GetById,
    // SetActiveById,
    // ToggleActiveById,
    // UnsetActive,
    // Add,
    UpdateById,
    GetParentTaskId,
    // DeleteById,
  };
  
  let data = {
    parentTaskId: '',
    items: [],
  };
  
  let linkedData = {
    tasks: [],
  };
  
  function Init(noReferenceData) {
    initData(noReferenceData);
  }
  
  function initData(noReferenceData) {
    if (Object.keys(noReferenceData).length == 0) return;
    
    data = noReferenceData;
  }
  
  function Add(title) {
    let id = uuidV4Util.Generate();
    let item = {
      id,
      title,
      progressTime: 0,
    };
    data.items.push(item);
    
    return item;
  }
  
  function SetActiveById(id) {
    let item = GetById(id);
    if (item == null) return false;
  
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
    let delIndex = getItemIndexById(id);
    if (delIndex < 0) return null;
    
    let item = data.items.splice(delIndex, 1);
    let activeId = GetActiveId();
    
    if (data.items.length == 0 || item[0].id == activeId) {
      UnsetActive();
    }
    
    return item;
  }
  
  function UpdateById(incomingData, id) {
    let item = GetById(id);
    if (!item) return null;
    
    for (let key in incomingData) {
      if (typeof(item[key]) != 'undefined' && typeof(item[key]) == typeof(incomingData[key])) {
        item[key] = incomingData[key];
      }
    }
    
    return item;
  }
  
  function UnsetActive() {
    data.activeId = null;
  }
  
  function getItemIndexById(id) {
    return data.items.findIndex(item => item.id == id);
  }
  
  function generateId() {
    return (new Date()).getTime().toString();
  }
    
  function clearReference(data) {
    return JSON.parse(JSON.stringify(data));
  }
  
  function GetById(id) {
    let item = data.items.find(x => x.id == id);
    if (item !== undefined) return item;
    
    return null;
  }
    
  function GetAll() {
    return data.items;
  }
    
  function GetActive() {
    return GetById(GetActiveId());
  }
  
  function GetActiveId() {
    return data.activeId;
  }
  
  function AppendProgressToActiveTracker(time) {
    let item = GetActive();
    if (!item) return false;
    
    item.progressTime += time;
    return true;    
  }
  
  function GetParentTaskId() {
    return data.parentTaskId;
  }
  
  function Stash(activeTaskParentId) {
    linkedData.parentTask = compoTask.GetById(activeTaskParentId);
    linkedData.tasks = compoTask.GetAllByParentId(activeTaskParentId).filter(x => x.type != 'M');
    
    data.parentTaskId = linkedData.parentTask ? linkedData.parentTask.id : '';
    data.items = clearReference(linkedData.tasks);
  }
  
  function Commit() {
    for (let i=0; i<data.items.length; i++) {
      linkedData.tasks[i].ratio = data.items[i].ratio;
    }
    
    // clear data reference
    linkedData.parentTask = null;
    linkedData.tasks = null;
  }
    
  return SELF;
  
})();