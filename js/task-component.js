export let compoTask = (function() {
  
  'use strict';
  
  let SELF = {
    Init,
    TaskCommit,
    GetAll,
    GetById,
    GetAllByParentId,
    AddSequence,
    UpdateSequence,
    DeleteSequenceByEvt,
    GetTotalPriorityPointByParentTaskId,
    StartTimerByTaskId,
  };
  
  let data = {
    items: [],
  };
  
  async function StartTimerByTaskId(id) {
    let task = GetById(id);
    
    // check sequence tasks
    compoSequence.Stash(task.sequenceTasks);
    
    try {
      
      let sequence = compoSequence.GetActive();
      
      if (sequence) {
        startTimerByTaskSequence(sequence);
      } else {
        startTimerByTask(task);
      }
      
    } catch (err) {
      console.error(err);
    }
    
    compoSequence.Pop();
  }
  
  function startTimerByTaskSequence(task) {
    if (task.progressTime >= task.targetTime) return;
    
    let seconds = (task.targetTime - task.progressTime) / 1000;
    androidClient.StartTimer(seconds, task.title);
    setTimer(task.targetTime - task.progressTime);
  }
  
  function startTimerByTask(task) {
    if (task.progress >= task.target) return;
    
    let seconds = (task.target * 60 * 1000 - task.progressTime) / 1000;
    androidClient.StartTimer(seconds, task.title);
    setTimer(task.target * 60 * 1000 - task.progressTime);
  }
  
  function GetTotalPriorityPointByParentTaskId(parentTaskId) {
    let total = 0;
    for (let task of tasks) {
      if (task.parentId == parentTaskId && typeof(task.ratio) == 'number') {
        total += task.ratio;
      }
    }
    return total;
  }
  
  async function DeleteSequenceByEvt(evt) {
    
    let targetEl = evt.target;
    let taskEl = targetEl.closest('[data-kind="task"]');
    let seqTaskEl = targetEl.closest('[data-kind="item-sequence-task"]');
    if (!taskEl) return;
    if (!seqTaskEl) return;
    
    let id = taskEl.dataset.id;
    let seqId = seqTaskEl.dataset.id;
    
    let item = app.GetTaskById(id);
    
    compoSequence.Stash(item.sequenceTasks);
    
    setActiveSequenceBeforeDeletionOnId(seqId);
    compoSequence.DeleteById(seqId);
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();    
    
    ui.RefreshListSequenceByTaskId(id);
    
  }
  
  function setActiveSequenceBeforeDeletionOnId(id) {
    if (compoSequence.CountAll() < 2) return null;
    
    let seqActiveId = compoSequence.GetActiveId();
    if (seqActiveId != id) return null;
    
    let item = null;
    let lastItemIndex = compoSequence.CountAll() - 1;
    let itemIndex = compoSequence.GetIndexById(id);
    
    if (itemIndex == lastItemIndex) {
      item = compoSequence.GetPrevious();
    } else {
      item = compoSequence.GetNext();
    }
    compoSequence.SetActiveById(item.id);
    
    return item;
  }
  
  function GetAll() {
    return tasks;
  }
  
  function GetAllByParentId(parentId) {
    return tasks.filter(task => task.parentId == parentId);
  }
  
  function AddSequence(title, durationTime, taskId) {
    let item = app.GetTaskById(taskId);

    compoSequence.Stash(item.sequenceTasks);
    
    let seqItem = compoSequence.Add(title, durationTime);
    if (compoSequence.CountAll() == 1) {
      compoSequence.SetActiveById(seqItem.id);
    }
    
    compoSequence.Commit();
    appData.TaskStoreTask();
  }
  
  function UpdateSequence(title, durationTime, taskId, seqId) {
    let item = app.GetTaskById(taskId);

    compoSequence.Stash(item.sequenceTasks);
    
    compoSequence.UpdateById({
      title,
      targetTime: durationTime,
    }, seqId);
    
    compoSequence.Commit();
    appData.TaskStoreTask();
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
    let item = tasks.find(x => x.id == id);
    if (item !== undefined) return item;
    
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
  
  async function TaskCommit() {
    await chrome.storage.local.set({ 'tasks': data.items });
  }
    
  return SELF;
  
})();