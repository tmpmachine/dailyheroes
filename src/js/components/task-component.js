let compoTask = (function() {
  
  'use strict';
  
  let SELF = {
    Add,
    GetAll,
    GetById,
    GetAllByParentId,
    GetTotalPriorityPointByParentTaskId,
    StartTimerByTaskId,
    ResetProgressById,
    AddTotalProgressByTaskId,
    
    // sequence
    AddSequence,
    UpdateSequence,
    GetSequenceById,
    TaskDeleteSequenceById,
    FocusSequenceById,
    TaskResetSequenceById,
    TaskResetSequenceCountByTaskId,
  };
  
  async function AddTotalProgressByTaskId(id, addedTime) {
    let task = GetById(id);
    if (!task) return;
  
    if (typeof(task.totalProgressTime) == 'undefined') {
      task.totalProgressTime = 0;  
    }
    task.totalProgressTime += addedTime;
      
    await taskApplyNecessaryTaskUpdates(task, addedTime);
      
    app.AddProgressTimeToRootMission(task.parentId, addedTime);
  }

  
  async function ResetProgressById(id) {
    let task = tasks.find(x => x.id == id);
    task.progress = 0;
    task.progressTime = 0;
    task.finishCountProgress = task.finishCount;
    await appData.TaskStoreTask();
    await app.TaskListTask();  
    loadSearch();
  }
  
  async function StartTimerByTaskId(id, timerOptions) {
    let task = GetById(id);
    
    // check sequence tasks
    compoSequence.Stash(task.sequenceTasks);
    
    try {
      
      let sequence = compoSequence.GetActive();
      
      if (sequence) {
        
        if (sequence.counter.repeatCount == sequence.repeatCount) {
          sequence.counter.repeatCount = 0;
        }
        compoSequence.Commit();
        await appData.TaskStoreTask();
        
        startTimerByTaskSequence(task.id, sequence, timerOptions);
      } else {
        startTimerByTask(task, timerOptions);
      }
      
    } catch (err) {
      console.error(err);
    }
    
    compoSequence.Pop();
  }
  
  function startTimerByTaskSequence(taskId, item, timerOptions) {
    if (item.progressTime >= item.targetTime) return;
    
    let taskTitle = item.title;
    let targetTime = item.targetTime;

    // get linked task title
    if (item.linkedTaskId) {
      let linkedTask = GetById(item.linkedTaskId);
      if (linkedTask) {
        taskTitle = linkedTask.title;
        
        if (timerOptions && timerOptions.isStartAvailableTime) {
          if (linkedTask.targetTime > 0) {
            targetTime = linkedTask.targetTime;
          }
        }
        
      }
    }
    
    
    let seconds = (targetTime - item.progressTime) / 1000;
    androidClient.StartTimer(seconds, item.title);
    setTimer(targetTime - item.progressTime);
    
    // todo : allow close when another sequence is started
    // globalNotification[`${taskId}@${item.id}`] = new Notification(`${taskTitle}`, {
    //   body: `${secondsToHMS(msToSeconds(item.targetTime))} left`, 
    //   tag: 'active-sequence-task',
    //   requireInteraction: false,
    // });
    
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(`${taskTitle}`, {
        body: `${secondsToHMS(msToSeconds(item.targetTime))} left`,
        tag: 'active-sequence-task',
      });
    });
    
  }
  
  function startTimerByTask(task, timerOptions) {
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
  
  
  async function TaskDeleteSequenceById(taskId, seqId) {
    
    let item = app.GetTaskById(taskId);
    
    compoSequence.Stash(item.sequenceTasks);
    
    setActiveSequenceBeforeDeletionOnId(seqId);
    compoSequence.DeleteById(seqId);
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();
    
  }
  
  
  async function TaskResetSequenceById(taskId, seqId) {
    
    let item = app.GetTaskById(taskId);
    
    compoSequence.Stash(item.sequenceTasks);
    
    compoSequence.UpdateById({
      progressTime: 0,
    }, seqId);
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();    
    
    ui.RefreshListSequenceByTaskId(taskId);
    
  }
  
  async function TaskResetSequenceCountByTaskId(taskId) {
    
    let item = app.GetTaskById(taskId);
    
    compoSequence.Stash(item.sequenceTasks);
    
    let seqId = compoSequence.GetActiveId();
    compoSequence.ResetRepeatCountById(seqId);
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();    
    
    ui.RefreshListSequenceByTaskId(taskId);
    
  }
  
  async function FocusSequenceById(taskId, seqId) {
    
    let item = app.GetTaskById(taskId);
    
    compoSequence.Stash(item.sequenceTasks);
    
    compoSequence.SetActiveById(seqId);
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();    
    
    ui.RefreshListSequenceByTaskId(taskId);
    
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
  
  function AddSequence(inputData, taskId) {
    let {title, durationTime, repeatCount} = inputData;
    let item = app.GetTaskById(taskId);

    compoSequence.Stash(item.sequenceTasks);
    
    let seqItem = compoSequence.Add(title, durationTime, repeatCount);
    if (compoSequence.CountAll() == 1) {
      compoSequence.SetActiveById(seqItem.id);
    }
    
    compoSequence.Commit();
    appData.TaskStoreTask();
  }
  
  function UpdateSequence(inputData, taskId, seqId) {
    let {title, durationTime, repeatCount} = inputData;
    let item = app.GetTaskById(taskId);

    compoSequence.Stash(item.sequenceTasks);
    
    compoSequence.UpdateById({
      title,
      repeatCount,
      targetTime: durationTime,
    }, seqId);
    
    compoSequence.Commit();
    appData.TaskStoreTask();
  }
  
  function GetSequenceById(taskId, seqId) {
    
    let task = app.GetTaskById(taskId);
    
    compoSequence.Stash(task.sequenceTasks);
    let sequenceTask = compoSequence.GetById(seqId);
    compoSequence.Pop();
    
    return sequenceTask;
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
  
  function Add(inputData) {

    let id = uuidV4Util.Generate();
    let item = {...lsdb.new('task', {
      id,
    }), ...inputData};
    tasks.splice(0, 0, item);

    return item;
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
    
  return SELF;
  
})();