let compoSequence = (function() {
  
  'use strict';
  
  let SELF = {
    // Init,
    // GetActive,
    GetActiveId,
    List,
    // GetById,
    SetActiveById,
    // ToggleActiveById,
    // UnsetActive,
    // Commit,
    Add,
    Pop,
    Commit,
    Stash,
    // UpdateById,
    DeleteById,
    CountAll,
    // custom methods
    // AppendProgressToActiveTracker,
    
    GetAll,
    AddSequence,
    DeleteSequenceByEvt,
  };
  
  let dataTemplate = {
    counter: {
      id: -1,
    },
    activeId: null,
    items: [],
  };
  let data = null;
  
  let local = {
    dataSource: null,
  };
  
  function CountAll() {
    return data.items.length;
  }
  
  function DeleteSequenceByEvt(evt) {
    let targetEl = evt.target;
    let taskEl = targetEl.closest('[data-kind="task"]');
    let seqTaskEl = targetEl.closest('[data-kind="item-sequence-task"]');
    
    if (!taskEl) return;
    if (!seqTaskEl) return;
    
    let id = taskEl.dataset.id;
    let seqId = seqTaskEl.dataset.id;
    
    let item = app.GetTaskById(id);
  }
  
  function GetById() {
    
  }
  
  function GetAll() {
    return data.items;
  }
  
  function AddSequence(taskId) {
    let item = app.GetTaskById(taskId);
    // console.log(item)
    
    let data = {
      id: __idGenerator.next(item.sequenceTasks.counter),
      progress: 0,
      targetTime: 30000, // ms
      title: new Date().getTime().toString(),
    };

    item.sequenceTasks.tasks.push(data);
    Commit();
  }
  
  const __idGenerator = (function() {
      
      function next(counterObj) {
        return `#${++counterObj.id}`;
      }
      
      return {
        next,
      };
      
  })();
  
  function Stash(_data) {
    
    data = clearReference(dataTemplate);
    
    if (!_data) {
      return;
    }
    
    local.dataSource = _data;
    
    let noReferenceData = clearReference(_data);
    for (let key in noReferenceData) {
      if (typeof(data[key]) != 'undefined') {
        data[key] = noReferenceData[key];
      }
    }
    
  }
  
  function Add(title) {
    let id = __idGenerator.next(data.counter);
    let item = {
      id,
      title,
      progressTime: 0,
      targetTime: 0,
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
    let group = data.items.find(x => x.id == id);
    if (group !== undefined) return group;
    
    return null;
  }
    
  function List() {
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
  
  function Pop() {
    let noReferenceData = clearReference(data);
    return noReferenceData;
  }
  
  function Commit() {
    for (let key in clearReference(data)) {
      local.dataSource[key] = data[key];
    }
    local.dataSource = null;
  }
    
  return SELF;
  
})();