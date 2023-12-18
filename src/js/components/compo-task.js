let compoTask = (function() {
  
  'use strict';
  
  let SELF = {
    GetAll,
    AddSequence,
    DeleteSequenceByEvt,
  };
  
  let local = {
    componentStorageKey: 'compoTabManager',
  };
  
  function DeleteSequenceByEvt(evt) {
    
    let targetEl = evt.target;
    let taskEl = targetEl.closest('[data-kind="task"]');
    let seqTaskEl = targetEl.closest('[data-kind="item-sequence-task"]');
    if (!taskEl) return;
    if (!seqTaskEl) return;
    
    let id = taskEl.dataset.id;
    let seqId = seqTaskEl.dataset.id;
    
    let item = app.GetTaskById(id);
    
    compoSequence.Stash(item.sequenceTasks);

    compoSequence.DeleteById(seqId);
    
    compoSequence.Commit();
    
    appData.StoreTask();    
    
    ui.RefreshListSequenceByTaskId(id);
    
  }
  
  function GetAll() {
    return tasks;
  }
  
  function AddSequence(taskId) {
    let item = app.GetTaskById(taskId);

    compoSequence.Stash(item.sequenceTasks);
    
    let seqItem = compoSequence.Add('example');
    if (compoSequence.CountAll() == 1) {
      compoSequence.SetActiveById(seqItem.id);
    }
    
    compoSequence.Commit();
    Commit();
    
    ui.RefreshListSequenceByTaskId(taskId);
  }
  
  const __idGenerator = (function() {
      
      function next(counterObj) {
        return `#${++counterObj.id}`;
      }
      
      return {
        next,
      };
      
  })();
  
  function Init(noReferenceData) {
    initData(noReferenceData);
  }
  
  function initData(noReferenceData) {
    if (Object.keys(noReferenceData).length == 0) return;
    
    data = noReferenceData;
  }
  
  function Add(title) {
    let id = uuidV4Util.Generate();
    let group = {
      id,
      title,
      progressTime: 0,
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
  
  function Commit() {
    appData.StoreTask();
  }
    
  return SELF;
  
})();