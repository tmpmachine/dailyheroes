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
    TaskAddTotalProgressByTaskId,
    
    // sequence
    AddSequence,
    UpdateSequence,
    GetSequenceById,
    TaskDeleteSequenceById,
    FocusSequenceById,
    TaskResetSequenceById,
    TaskResetSequenceCountByTaskId,
    TaskResetSequenceByTaskId,
    
    TaskResetTasksTargetTime,
    GetTaskQuotaTimeById,
    TaskGetActive,
    GetFormattedData,
  };
  
  let dataModel = {
    id: '',
    progress: 0,
    progressTime: 0,
    totalProgressTime: 0,
    
    // used by time balancing
    durationTime: 0,
    targetTime: 0,
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
  };
  
  async function GetFormattedData(item) {
    
    let activeTask = await compoTask.TaskGetActive();
    // let item = compoTask.GetById(id);
    
    let activeTimerDistance = await getActiveTimerDistance(); // minutes
    let activeTimerDistanceTime = await getActiveTimerDistanceTime(); // milliseconds
    
    let liveProgress = 0;
    let liveProgressTime = 0;
    if (activeTask && item.id == activeTask.id) {
      liveProgress = activeTimerDistance;
      liveProgressTime = activeTimerDistanceTime;
    }
    
    let durationTime = item.durationTime - item.progressTime - liveProgressTime;
    let progressMinutesLeft = msToMinutes(item.progressTime);
  
    // # set ratio time left string
    let ratioTimeLeftStr = '';
    let targetCapTimeStr = '';
    
    if (item.targetCapTime > 0) {
      targetCapTimeStr = helper.ToTimeString(item.targetCapTime, 'hms');
    }
    
    // ## handle if self task
    if (item.ratio > 0 || item.targetTime > 0)
    {
      {
        let targetTime = item.targetTime;
        if (activeTask && activeTask.id == item.id) {
          targetTime = Math.max(0, targetTime - activeTimerDistanceTime);
        }
        if (targetTime > 0) {
          ratioTimeLeftStr = `${ secondsToHMS(msToSeconds(targetTime)) }`;
        }
      }
      
      // ## handle if other task
      if (activeTask && activeTask.id != item.id && item.ratio > 0 && item.targetTime > 0) {
        
        let targetTime = item.targetTime;
        
        // calculate active task progress and target difference
        try {
  
          let addedTime = activeTimerDistanceTime;
          let ratio = activeTask.ratio;
          if (ratio > 0) {
            let excessTime = activeTask.targetTime - addedTime;
            if (excessTime < 0) {
              
              let remainingRatio = 100 - ratio;
              let timeToDistribute = ( addedTime *  ( remainingRatio / 100 ) ) / ( ratio / 100 );
            
              let addedTargetTime = Math.round(timeToDistribute * (item.ratio / remainingRatio));
              targetTime = addOrInitNumber(targetTime, addedTargetTime);
            }
          }
          
          if (isSubTaskOf(activeTask.parentId, item.id)) {
            targetTime -= activeTimerDistanceTime;
          }
          
        } catch (e) {
          console.error(e);
        }
        
        if (targetTime > 0) {
          ratioTimeLeftStr = `${ secondsToHMS(msToSeconds(targetTime)) }`;
        }
        
      }
    
    }
    
    // ROP info
    let ratioStr = '';
    if (item.ratio) {
      let totalPriorityPoint = compoTask.GetTotalPriorityPointByParentTaskId(item.parentId);
      let rop = Math.round(item.ratio / totalPriorityPoint * 10000) / 100;
      ratioStr = `ROP ${rop}%`;
    }
    
    // show mission path
    let missionPath = '';
    let isMissionView =  true;
    let isTopPath = isTopMissionPath(item.id);
    if (isMissionView && isTopPath || IsShowTargetTimeOnly()) {
      ratioStr = '';
      missionPath = getAndComputeMissionPath(item.parentId);
    }
    
    
    // show total task progress (self + child tasks)
    let totalProgressStr = '';
    {
      let totalMsProgressChildTask = sumAllChildProgress(item.id);
      let totalProgressTime = item.totalProgressTime + totalMsProgressChildTask;
      if (totalProgressTime > 0) {
        totalProgressStr = `${helper.ToTimeString(totalProgressTime, 'hms')}`;
      }
    }

    let durationTimeStr = helper.ToTimeString(durationTime, 'hms');
    let fillData = {...item, ...{
      // targetString: minutesToHoursAndMinutes(item.target),
      // rankLabel: ` | Rank #${rankLabel}`,
      missionPath,
      ratio: ratioStr,
      ratioTimeLeftStr,
      durationTimeStr: helper.ToTimeString(item.durationTime, 'hms'),
      targetCapTimeStr,
      totalProgressStr,
      targetString: (durationTimeStr.trim().length > 0 ? `${durationTimeStr} left` : ''),
      allocatedTimeString: minutesToHoursAndMinutes(item.target),
      progress: progressMinutesLeft ? minutesToHoursAndMinutes(progressMinutesLeft) : '0m',
    }};


    // set note progress time label
    if (fillData.note) {
      fillData.note.map(item => {
        if (item.totalProgressTime) {
          item.progressTimeLabel = minutesToHoursAndMinutes(msToMinutes(item.totalProgressTime));
        }
        return item;
      });
    }

    let percentageProgress = 0;
    let percentageProgressTime = 0;
    if (item.target) {
      percentageProgress = Math.min(100, Math.floor((msToMinutes(item.progressTime) + liveProgress)/item.target*10000)/100);
      percentageProgressTime = Math.min(100, Math.floor((item.progressTime + liveProgressTime) / minutesToMs(item.target) * 10000) / 100);
      // fillData.completionPercentage = `(${percentageProgressTime}%)`;
      if (percentageProgressTime == 100) {
        fillData.completionPercentage = `(completed)`;
      }
    }

    if (fillData.note) {
      let index = 0;
      fillData.note = fillData.note.map(x => { x.index = index; index++; return x})
    }

    return fillData;
    
  }
  
  async function TaskGetActive() {
    let data = await window.service.GetData(['activeTask']);
    if (data.activeTask) {
      let activeTask = tasks.find(x => x.id == data.activeTask);
      if (activeTask) {
        return activeTask;
      }  
    }
    return null;
  }

  function GetTaskQuotaTimeById(id) {
    
    let task = GetById(id);
    
    if (task.parentId == '') {
      return task.targetTime;
    }
    
    let parentTask = GetById(task.parentId);
    let safeLoop = 30;
    
    while (parentTask.parentId != '' && safeLoop > 0) {
      parentTask = GetById(parentTask.parentId);
      safeLoop -= 1;
    }
    
    return parentTask.targetTime;
  }

  
  async function TaskAddTotalProgressByTaskId(id, addedTime) {
    let task = GetById(id);
    if (!task) return;
  
    if (typeof(task.totalProgressTime) == 'undefined') {
      task.totalProgressTime = 0;  
    }
    task.totalProgressTime += addedTime;
    task.targetCapTime = Math.max(0, addOrInitNumber(task.targetCapTime, -1 * addedTime));
      
    await taskApplyNecessaryTaskUpdates(task, addedTime);
      
    app.AddProgressTimeToRootMission(task.parentId, addedTime);
  }

  async function TaskResetTasksTargetTime() {
    for (let task of tasks) {
      task.targetTime = 0;
      task.progress = 0;
      task.progressTime = 0;
      task.totalProgressTime = 0;
    }
  }
  
  async function ResetProgressById(id) {
    let task = tasks.find(x => x.id == id);
    task.progressTime = 0;
    task.finishCountProgress = task.finishCount;
    // loadSearch();
    
    return task;
  }
  
  async function StartTimerByTaskId(id, timerOptions) {
    let task = GetById(id);
    
    // check sequence tasks
    compoSequence.Stash(task.sequenceTasks);
    
    try {
      
      let sequence = compoSequence.GetActive();
      
      if (sequence) {
        
        // reset sequence (counter, progress) if user repeat it manually
        if (sequence.counter.repeatCount == sequence.repeatCount) {
          sequence.counter.repeatCount = 0;
        }
        if (sequence.targetCapTime > 0 && sequence.progressCapTime >= sequence.targetCapTime) {
          sequence.progressCapTime = 0;
          sequence.progressTime = 0;
        }
        
        compoSequence.Commit();
        await appData.TaskStoreTask();
        
        startTimerByTaskSequence(task, sequence, timerOptions);
      } else {
        startTimerByTask(task, timerOptions);
      }
      
    } catch (err) {
      console.error(err);
    }
    
    compoSequence.Pop();
  }
  
  function startTimerByTaskSequence(task, item, timerOptions) {
    if (item.progressTime >= item.targetTime) return;
    
    let taskTitle = item.title;
    let targetTime = item.targetTime;
    let progressTime = item.progressTime;

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
    } else {
      
      if (item.targetCapTime > 0) {
        let capTimeLeft = item.targetCapTime - item.progressCapTime;
        
        // set timer using the rest of target cap time if cap time is lower than timer
        if (capTimeLeft < item.targetTime) {
          targetTime = capTimeLeft;
          progressTime = 0;
        }
      }
      
    }
    
    let alarmDuration = targetTime - progressTime;
    
    if (task.targetCapTime > 0 && task.targetCapTime < alarmDuration) {
      alarmDuration = task.targetCapTime;
    }
    
    {
      let seconds = alarmDuration / 1000;
      
      androidClient.StartTimer(seconds, item.title);
      setTimer(alarmDuration);
    }
    
    // todo : allow close when another sequence is started
    // globalNotification[`${taskId}@${item.id}`] = new Notification(`${taskTitle}`, {
    //   body: `${secondsToHMS(msToSeconds(item.targetTime))} left`, 
    //   tag: 'active-sequence-task',
    //   requireInteraction: false,
    // });
    
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(`${taskTitle}`, {
        body: `${helper.ToTimeString(alarmDuration, 'hms')} left`,
        tag: 'active-sequence-task',
      });
    });
    
  }
  
  function startTimerByTask(task, timerOptions) {
    let alarmDuration = (task.durationTime - task.progressTime);
    
    if (task.targetCapTime > 0 && task.targetCapTime < alarmDuration) {
      alarmDuration = task.targetCapTime;
    }
    
    {
      let seconds = alarmDuration / 1000;
      androidClient.StartTimer(seconds, task.title);
      setTimer(alarmDuration);
    }
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
      progressCapTime: 0,
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
  
  async function TaskResetSequenceByTaskId(taskId) {
    
    let item = app.GetTaskById(taskId);
    
    compoSequence.Stash(item.sequenceTasks);
    
    compoSequence.ResetSequenceTasksProgress();
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();    
    
  }
  
  async function FocusSequenceById(taskId, seqId) {
    
    let item = app.GetTaskById(taskId);
    
    compoSequence.Stash(item.sequenceTasks);
    
    compoSequence.SetActiveById(seqId);
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();    
    
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
    let {title, durationTime, repeatCount, targetCapTime} = inputData;
    let item = app.GetTaskById(taskId);

    compoSequence.Stash(item.sequenceTasks);
    
    let seqItem = compoSequence.Add(title, durationTime, repeatCount, targetCapTime);
    if (compoSequence.CountAll() == 1) {
      compoSequence.SetActiveById(seqItem.id);
    }
    
    compoSequence.Commit();
    appData.TaskStoreTask();
  }
  
  function UpdateSequence(inputData, taskId, seqId) {
    let {title, durationTime, repeatCount, targetCapTime} = inputData;
    let item = app.GetTaskById(taskId);

    compoSequence.Stash(item.sequenceTasks);
    
    compoSequence.UpdateById({
      title,
      repeatCount,
      targetTime: durationTime,
      targetCapTime,
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