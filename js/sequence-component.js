export let compoSequence = (function() {
  
  'use strict';
  
  let SELF = {
    Stash,
    Commit,
    Pop,
    GetById,
    GetActive,
    GetActiveId,
    SetActiveById,
    Add,
    AddLinkedTask,
    UpdateById,
    DeleteById,
    CountAll,
    GetAll,
    GetNext,
    GetPrevious,
    GetIndexById,
    ResetSequenceTasksProgress,
    ResetRepeatCountById,
    GetLowestCompletedCount,
    IncrementCompletedCounterById,
  };
  
  let dataTemplate = {
    counter: {
      id: -1,
    },
    activeId: null,
    items: [],
  };
  let data = null;
  
  let dataModel = {
    items: {
      id: null,
      linkedTaskId: null,
      title: null,
      progressTime: 0,
      targetTime: 0,
      repeatCount: 0,
      enabled: true,
      counter: {
        repeatCount: 0,
        completed: 0,
      }
    }
  };
  
  let local = {
    dataSource: null,
  };
  
  function CountAll() {
    return data.items.length;
  }
  
  function GetAll() {
    return data.items;
  }
  
  function ResetSequenceTasksProgress() {
    let items = GetAll();
    for (let item of items) {
      item = GetById(item.id);
      item.counter.repeatCount = 0;
      item.counter.completed = 0;
      item.progressCapTime = 0;
      item.progressTime = 0;
    }
  }
  
  function ResetRepeatCountById(id) {
    let item = GetById(id);
    if (!item) return;
    
    item.counter.repeatCount = 0;
  }
  
  const __idGenerator = (function() {
      
      function next(counterObj) {
        return `#${++counterObj.id}`;
      }
      
      return {
        next,
      };
      
  })();
  
  function Add(title, durationTime, repeatCount, targetTime) {
    let linkedTaskId = null;
    let targetCapTime = targetTime;
    let item = addItem(title, durationTime, repeatCount, linkedTaskId, targetCapTime);
    return item;
  }
  
  function AddLinkedTask(taskId, durationTime) {
    let linkedTaskId = taskId;
    let title = null;
    let repeatCount = 0;
    let targetCapTime = 0;
    let item = addItem(title, durationTime, repeatCount, linkedTaskId, targetCapTime);
    return item;
  }
  
  function addItem(title, durationTime, repeatCount, linkedTaskId, targetCapTime) {
    let id = __idGenerator.next(data.counter);
    let lowestCompleteCount = GetLowestCompletedCount();
    
    let item = {
      id,
      linkedTaskId,
      title,
      repeatCount,
      progressTime: 0,
      progressCapTime: 0,
      targetTime: durationTime,
      targetCapTime,
      counter: {
        repeatCount: 0,
        completed: lowestCompleteCount,
      }
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
    
    if (item.linkedTaskId) {
      // linked task title must not be changed
      delete incomingData['title'];
    }
    
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
    if (item === undefined) return null;
    
    // reflect data model
    for (let key in dataModel.items) {
      if (typeof(item[key]) == 'undefined') {
        if (typeof(dataModel[key]) == 'object') {
          item[key] = clearReference(dataModel.items[key]);
        } else {
          item[key] = dataModel.items[key];
        }
      }
    }
    
    return item;
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
  
  function IsEmpty() {
    return (GetAll().length == 0);
  }
  
  function GetNext() {
    
    if (IsEmpty()) return null;
    
    let item = GetActive();
    if (item == null) {
      return GetByIndex(0);
    }
      
    let activeItemIndex = GetIndexById(item.id);
    let lastItemIndex = CountAll() - 1;
    let nextItemIndex = Math.min(lastItemIndex, activeItemIndex + 1);
    // allow endless navigation
    if (activeItemIndex + 1 > lastItemIndex) {
      nextItemIndex = 0;
    }
    let nextItem = GetByIndex(nextItemIndex);
      
    return nextItem;
  }
  
  function GetPrevious() {
    
    if (IsEmpty()) return null;
    
    let item = GetActive();
    if (item == null) {
      let lastItemIndex = CountAll() - 1;
      return GetByIndex(lastItemIndex);
    }
      
    let activeItemIndex = GetIndexById(item.id);
    let prevItemIndex = Math.max(0, activeItemIndex - 1);
    // allow endless navigation
    if (activeItemIndex - 1 < 0) {
      prevItemIndex = CountAll() - 1;
    }
    let prevItem = GetByIndex(prevItemIndex);
      
    return prevItem;
  }
  
  function GetByIndex(index) {
    let items = GetAll();
    return items[index];
  }
  
  function GetLowestCompletedCount() {
    let items = GetAll();
    let lowestCompleteCount = items.reduce((min, obj) => (obj.counter.completed < min ? obj.counter.completed : min), Infinity);
    return lowestCompleteCount;
  }

  function IncrementCompletedCounterById(id) {
    let item = GetById(id);
    if (!item) return;

    if (typeof(item.counter?.completed) != 'undefined') {
      item.counter.completed += 1;
    } else {
      item.counter.completed = 1;
    }
  }
  
  function GetIndexById(id) {
    let items = GetAll();
    return items.findIndex(item => item.id == id);
  }
  
  
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
  
  function Commit() {
    for (let key in clearReference(data)) {
      local.dataSource[key] = data[key];
    }
    local.dataSource = null;
  }
  
  function Pop() {
    local.dataSource = null;
  }
    
  return SELF;
  
})();