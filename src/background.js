import { compoSequence } from '/js/sequence-component.js';
import { helper } from '/js/helper.js';

let iconAlarm = '../icons/128.png';

chrome.runtime.onInstalled.addListener(() => { });

chrome.alarms.onAlarm.addListener(alarmHandler);

self.addEventListener("notificationclick", handleNotificationClick, false);

async function handleNotificationClick(event) {
  event.notification.close();
  switch (event.action) {
    case 'stop':
      taskStopOffscreenDocument('audio.html');
      await stopByNotification();
      await setStopAlarmIcon();
      break;
    case 'start-next-sequence': 
      await startNextSequence(); 
      break;
    case 'take-a-break':
      await takeBreakTime();
      break;
    case 'restart':
      await restartTask();
      break;
    case 'restart-sequence':
      await restartSequenceTask();
      break;
    case '3m':
      startNewAlarmInMinutes(3);
      break;
    case '7m':
      startNewAlarmInMinutes(7);
      break;
    case '12m':
      startNewAlarmInMinutes(12);
      break;
    case '20m':
      startNewAlarmInMinutes(20);
      break;
  }
}

async function playAudio(path) {  
  clearTimeout(stopAudioTimeout);
  await taskStopOffscreenDocument(path);
  await setupOffscreenDocument(path);
}

let stopAudioTimeout;
function stopAudioAfter(path) {
  stopAudioTimeout = setTimeout(() => {
    taskStopOffscreenDocument(path);
  }, 10200);
}

let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one 
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'notification',
    });
    await creating;
    creating = null;
  }
}

async function taskStopOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one 
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    chrome.offscreen.closeDocument(
        // callback?: function,
    );
    return;
  }
}


async function reduceCountActiveTask() {
  let data = await chrome.storage.local.get(['activeTask']);
  if (data.activeTask) {
    let tasks = await getTask();
    let activeTask = tasks.find(x => x.id == data.activeTask);
    if (activeTask) {
      activeTask.finishCountProgress -= 1;
      if (activeTask.finishCountProgress > 0) {
        activeTask.progressTime = 0;
      }
      await storeTask(tasks);
    }
  }
}

async function updateProgressActiveTask(addedMinutes, distanceTime) {
  
  let repeatCountData = null;
  
  let hasTargetCap = false;
  let hasRepeatcount = false;
  let isRepeatEnded = false;
  let isTargetCapEnded = false;
  
  let data = await chrome.storage.local.get(['activeTask']);
  if (!data.activeTask) return;
  
  let tasks = await getTask();
  let activeTask = tasks.find(x => x.id == data.activeTask);
  if (!activeTask) return;
  
  
  let isUpdateCurrentActiveTask = true;
  let previousSequenceTaskTitle = null;
  let changeTask = false;
  
  // set active next sequence task
  compoSequence.Stash(activeTask.sequenceTasks);
  let sequenceTask = compoSequence.GetActive();
  
  if (sequenceTask) {
    
    let linkedTask = null;
    
    if (sequenceTask.linkedTaskId) {
      linkedTask = GetTaskById(tasks, sequenceTask.linkedTaskId);
      if (linkedTask) {
        previousSequenceTaskTitle = linkedTask.title;
        
        if (linkedTask.targetCapTime > 0) {
          hasTargetCap = true;
        }

        isUpdateCurrentActiveTask = false;
        linkedTask.totalProgressTime += distanceTime;
        await taskApplyNecessaryTaskUpdates(linkedTask, distanceTime, tasks);
      }
    }
  
    let isFinished = false;
    
    sequenceTask.progressTime += distanceTime;
    if (sequenceTask.progressCapTime < sequenceTask.targetCapTime) {
      sequenceTask.progressCapTime += distanceTime;
    }
    // reset sequence if finished
    if (sequenceTask.progressTime >= sequenceTask.targetTime) {
      sequenceTask.progressTime = 0;
      if (sequenceTask.targetCapTime === 0) {
        isFinished = true;
      }
    }
    if (sequenceTask.targetCapTime > 0 && sequenceTask.progressCapTime >= sequenceTask.targetCapTime) {
      isFinished = true;
    }
    
    // update repeat count
    let isRepeat = (isFinished && sequenceTask.repeatCount > 0 && sequenceTask.counter.repeatCount < sequenceTask.repeatCount);
    
    if (isRepeat) {
      
      hasRepeatcount = true;
      
      sequenceTask.counter.repeatCount += 1;
      sequenceTask.progressCapTime = 0; // reset progress cap time

      if (sequenceTask.counter.repeatCount == sequenceTask.repeatCount) {
        changeTask = true;
        isRepeatEnded = true;
      }
      
      repeatCountData = {
        counter: {
          repeatCount: sequenceTask.counter.repeatCount,
        },
        repeatCount: sequenceTask.repeatCount,
      };
      
    } else {
      
      sequenceTask.counter.repeatCount = 0;
      
      if (isFinished) {
        changeTask = true;
      }
      
      if (linkedTask) {
        if (linkedTask.targetCapTime > 0) {
          changeTask = false;
        } else {
          isTargetCapEnded = true;
        }
      }
      
    }
    
    
  }
  
  if (isUpdateCurrentActiveTask) {
    
    activeTask.progressTime += distanceTime;
    // activeTask.targetCapTime = addOrInitNumber(activeTask.targetCapTime, -1 * distanceTime);
    
    if (typeof(activeTask.totalProgressTime) == 'undefined') {
      activeTask.totalProgressTime = 0;  
    }
    activeTask.totalProgressTime += distanceTime;
    
    // apply target time balancing
    await taskApplyNecessaryTaskUpdates(activeTask, distanceTime, tasks);
  }
  
  
  if (sequenceTask && changeTask) {
    let nextItem = compoSequence.GetNext();
    compoSequence.SetActiveById(nextItem.id);
    
    /*let seqIndex = compoSequence.GetIndexById(nextItem.id);
    if (seqIndex == 0) {
      compoSequence.ResetSequenceTasksProgress();
    }*/
  }
  
  compoSequence.Commit();
  
  // store task history to accumultas the progress on parent mission later
  {
    let data = await chrome.storage.local.get(['taskProgressHistory']);
    let historyData = {
      parentId: activeTask.parentId,
      progressTime: distanceTime,
    };
    if (data.taskProgressHistory == undefined) {
      data.taskProgressHistory = [];
    }
    data.taskProgressHistory.push(historyData);
    
    await chrome.storage.local.set({
    	taskProgressHistory: data.taskProgressHistory,
    });
  }
  
  await storeTask(tasks);
  
  return {
    previousSequenceTaskTitle,
    repeatCountData,
    states: {
      hasTargetCap,
      hasRepeatcount,
      isTargetCapEnded,
      isRepeatEnded,
    }
  };
}

async function taskApplyNecessaryTaskUpdates(task, distanceTime, tasks) {
  // update all parent target time
  await taskApplyAllParentTargetTime(task.parentId, distanceTime, tasks);
  // apply target time balancing
  await TaskApplyTargetTimeBalanceInGroup(task, distanceTime, tasks);
}

function GetTaskById(tasks, id) {
  return tasks.find(x => x.id == id);
}

async function taskApplyAllParentTargetTime(parentId, distanceTime, tasks) {
  let task = GetTaskById(tasks, parentId);
  while (task) {
    await TaskApplyTargetTimeBalanceInGroup(task, distanceTime, tasks);
    task = GetTaskById(tasks, task.parentId);
  }
}

async function TaskApplyTargetTimeBalanceInGroup(task, addedTime, tasks) {
  try {
      let excessTime = task.targetTime - addedTime;
      if (excessTime < 0 && task.ratio > 0) {
        await applyTargetTimeBalanceInGroup(task, Math.abs(excessTime), tasks);
      }
      task.targetTime = Math.max(0, task.targetTime - addedTime);
      task.targetCapTime = Math.max(0, addOrInitNumber(task.targetCapTime, -1 * addedTime));
    } catch (e) {
      console.error(e);
  }
}

async function applyTargetTimeBalanceInGroup({id, parentId, ratio, targetMinutes}, addedTime, tasks) {

  if (typeof(ratio) != 'number') return;
  
  let totalPriorityPoint = tasks.filter(x => x.parentId == parentId && x.ratio > 0).map(x => x.ratio).reduce((a,b) => b + a, 0);
  let filteredTasks = tasks.filter(task => ( task.parentId == parentId && typeof(task.ratio) == 'number' && task.id != id ) );

  let remainingRatio = totalPriorityPoint - ratio;
  let timeToDistribute = ( addedTime *  ( remainingRatio / totalPriorityPoint ) ) / ( ratio / totalPriorityPoint );

  // todo
  // compoTask.Init()
  
  for (let task of filteredTasks) {
    let addedTargetTime = Math.round(timeToDistribute * (task.ratio / remainingRatio));
    
    task.targetTime = addOrInitNumber(task.targetTime, addedTargetTime);
    
    if (hasSubTask(task.id, tasks)) {
      distributeTargetTimeInTaskSub(addedTargetTime, task, tasks);
    }
    
  }

}

function hasSubTask(taskId, tasks) {
  return tasks.find(x => x.parentId == taskId);
}

function anyTaskHasRatio(tasks) {
  return ( tasks.filter(task => task.ratio > 0).length > 0 );
}

async function distributeTargetTimeInTaskSub(timeToDistribute, parentTask, tasksOrigin) {
  
  let tasks = tasksOrigin.filter(x => x.parentId == parentTask.id);
  if (tasks.length == 0 || !anyTaskHasRatio(tasks)) {
    // parentTask.targetTime = addOrInitNumber(parentTask.targetTime, timeToDistribute);
    return;
  }
  
  let totalPriorityPoint = tasksOrigin.filter(x => x.parentId == parentTask.id && x.ratio > 0).map(x => x.ratio).reduce((a,b) => b + a, 0);
  
  for (let task of tasks) {
    
    if (task.ratio === 0) continue;
    
    let priorityPoint = task.ratio;
    let addedTargetTime = Math.round( timeToDistribute * (priorityPoint / totalPriorityPoint) );
    
    task.targetTime = addOrInitNumber(task.targetTime, addedTargetTime);
    
    if (hasSubTask(task.id, tasksOrigin)) {
      distributeTargetTimeInTaskSub(addedTargetTime, task, tasksOrigin);
    }
    
  }
  
}

function addOrInitNumber(variable, numberToAdd) {
  if (variable === null || typeof variable === "undefined") {
    variable = 0;
  }
  if (typeof variable !== "number") {
    variable = parseFloat(variable);
  }
  if (!isNaN(variable)) {
    variable += numberToAdd;
  }
  return variable;
}

async function storeTask(tasks) {
  await chrome.storage.local.set({ 'tasks': tasks });
}

async function getTask() {
  let data = await chrome.storage.local.get(['tasks']);
  if (data.tasks) {
    return data.tasks;
  } 
  return [];
}

async function stopByNotification() {
  await chrome.alarms.clearAll();
  let data = await chrome.storage.local.get(['history', 'start', 'activeTask']);
  let distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
  let distanceTime = new Date().getTime() - data.start;
  await chrome.storage.local.set({ 'history': data.history + distanceMinutes });
  await chrome.storage.local.remove(['start']);
  await updateProgressActiveTask(distanceMinutes, distanceTime);
}

async function setStopAlarmIcon() {
  chrome.action.setIcon({ path: iconAlarm });
}

async function alarmHandler(alarm) {
  switch (alarm.name) {
    case 'clock':
      updateTime();
      break;
    case 'halfway':
      spawnNotification('Halfway there!', 'limegreen', iconAlarm, false);
      break;
    case 'main':
      onAlarmEnded(alarm);
      break;
    case '3m':

      spawnNotification('3 minutes left!', '#EB455F', iconAlarm, false, [
        {
          action: 'stop',
          title: 'Stop',
        },
        // {
        //   action: "7m",
        //   title: "Start 7m",
        // },
      ]);
      break;
  }
}

async function onAlarmEnded(alarm) {
  
  let data = await chrome.storage.local.get(['history', 'start', 'activeTask', 'lastActiveId', 'isTakeBreak', 'leftOverAlarmTaskId']);
  let distanceMinutes = 0;
  let distanceTime = 0;
  
  if (typeof(data.start) != 'undefined') {
    distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
    distanceTime = new Date().getTime() - data.start;
  }
  
  if (data.isTakeBreak) {
    distanceMinutes = 0;
    distanceTime = 0;
    await chrome.storage.local.remove('isTakeBreak');
  }
  
  await chrome.storage.local.set({ 'history': data.history + distanceMinutes });
  await chrome.storage.local.remove(['start']);
  
  let repeatCountData = null;
  let previousSequenceTaskTitle = null;
  let taskEndedStates = null;
  
  if (!data.isTakeBreak) {
    let updateResponse = await updateProgressActiveTask(distanceMinutes, distanceTime);
    repeatCountData = updateResponse.repeatCountData;
    previousSequenceTaskTitle = updateResponse.previousSequenceTaskTitle;
    taskEndedStates = updateResponse.states;
  }


  // get task
  let isRepeatCountFinished = false;
  let isSequenceTask = false;
  let finishCountLeftTxt = '';
  let targetTimeLeftStr = '';
  
  let sequenceTaskTitle = '';
  let repeatCountStr = '';
  let taskTargetTimeStr = '';
  let taskTitle = '';
  
  let isHasAlarmAction = true;
  let alarmDurationTime = 0;
  
  if (data.activeTask) {
    
    let tasks = await getTask();
    let activeTask = tasks.find(x => x.id == data.activeTask);
    
    if (activeTask) {
      
      // the task target time has been fulfilled, don't show actions
      if (data.leftOverAlarmTaskId == activeTask.id) {
        await chrome.storage.local.remove(['leftOverAlarmTaskId']);
        isHasAlarmAction = false;
      }
      
      taskTitle = activeTask.title;
      
      // set target minutes on restart button
      alarmDurationTime = activeTask.durationTime;
      
      if (activeTask.targetCapTime > 0) {
        targetTimeLeftStr = `(${helper.ToTimeString(activeTask.targetCapTime, 'hms')} left)`;
      }
      
      // set finish count text
      if (activeTask.finishCount && activeTask.finishCountProgress > 0) {
        if (activeTask.finishCountProgress-1 == 0) {
          isRepeatCountFinished = true;
        } else {
          finishCountLeftTxt = `(${activeTask.finishCountProgress-1})`;
        }
        await reduceCountActiveTask();
      }
      
      // change notif action if its a sequence task
      compoSequence.Stash(activeTask.sequenceTasks);
      let sequenceTask = compoSequence.GetActive();
      
      if (sequenceTask) {
        isSequenceTask = true;
        sequenceTaskTitle = sequenceTask.title;
        alarmDurationTime = sequenceTask.targetTime; // set alarm to sequence task timer
        
        // get title from task if linked
        if (sequenceTask.linkedTaskId) {
          let linkedTask = GetTaskById(tasks, sequenceTask.linkedTaskId);
          if (linkedTask) {
            sequenceTaskTitle = linkedTask.title;
            if (linkedTask.targetCapTime > 0) {
              taskTargetTimeStr = `(${ helper.ToTimeString(linkedTask.targetCapTime, 'hms') } left)`;
            }
          }
        } else {
          if (sequenceTask.targetCapTime > 0) {
            let timeCapLeft = Math.max(0, sequenceTask.targetCapTime - sequenceTask.progressCapTime);
            alarmDurationTime = timeCapLeft; // set alarm to sequence task time cap
          }
        }
        
        // change title if is repeating
        if (repeatCountData) {
          repeatCountStr = `[${repeatCountData.counter.repeatCount} of ${repeatCountData.repeatCount}]`;
        }
        
      }
      
      compoSequence.Pop();

      // limit alarm time by task target cap time (if set and is lower)
      if (activeTask.targetCapTime > 0 && activeTask.targetCapTime < alarmDurationTime) {
        alarmDurationTime = activeTask.targetCapTime;
        await chrome.storage.local.set({ 'leftOverAlarmTaskId': activeTask.id });
      }

    }
    
  }
  
  let actions = [];
  let notifTitle = `Time's up!`;
  let notifBody = `Task : ${taskTitle} ${targetTimeLeftStr} ${finishCountLeftTxt}`.replace(/ +/g,' ').trim();
  let tag = 'progress';
  let alarmDurationTimeStr = (alarmDurationTime > 0 ? ` (${helper.ToTimeString(alarmDurationTime, 'hms')})` : '');
  
  let isStartNext = false;
  let isStartTask = false;
  let isRestartTask = false;
  
  if (isSequenceTask) {
    
    if (taskEndedStates.hasRepeatcount) {
      if (taskEndedStates.isRepeatEnded) {
        isStartNext = true;
      } else {
        isStartTask = true;
      }
    } else {
      if (taskEndedStates.hasTargetCap && !taskEndedStates.isTargetCapEnded) {
        isStartTask = true;
      }
      if (taskEndedStates.isTargetCapEnded) {
        isStartNext = true;
      }
      if (!taskEndedStates.hasTargetCap && !taskEndedStates.hasRepeatcount) {
        isStartNext = true;
      }
    }
    
    tag = 'active-sequence-task';
    notifTitle = `Time's up! ${repeatCountStr}`.replace(/ +/g,' ').trim();
    /*
    if (previousSequenceTaskTitle) {
      notifBody = `Task : ${previousSequenceTaskTitle}\r\n`;
    }
    */
    notifBody = `Next : ${sequenceTaskTitle} ${taskTargetTimeStr}`;
    notifBody = notifBody.trim();
    
  } else {
    
    if (taskEndedStates.hasTargetCap && !taskEndedStates.isTargetCapEnded) {
      isStartTask = true;
    } else {
      isRestartTask = true;
    }
    
  }
  
  
  if (isHasAlarmAction) {
    
    if (isStartNext) {
      actions.push({
        action: 'start-next-sequence',
        title: `Start next (${alarmDurationTimeStr})`,
      });
    } else if (isRestartTask) {
      actions.push({
        action: isSequenceTask ? 'start-next-sequence' : 'restart',
        title: `Restart task ${alarmDurationTimeStr}`.replace(/ +/g,' ').trim(),
      });
    } else if (isStartTask) {
      actions.push({
        action: isSequenceTask ? 'start-next-sequence' : 'restart',
        title: `Start task ${alarmDurationTimeStr}`.replace(/ +/g,' ').trim(),
      });
    }
    
  }
    
  
  /*
  actions.push({
    action: 'take-a-break',
    title: `Take a break (20s)`,
  });
  */
  // spawn notif
  await TaskClearNotif();
  let requireInteraction = true;
  spawnNotificationV2(notifTitle, notifBody, 'limegreen', iconAlarm, requireInteraction, actions, tag);
  
  // play alarm audio
  playAudio('audio.html');
  stopAudioAfter('audio.html');

  chrome.alarms.clearAll();
  chrome.action.setIcon({ path: iconAlarm });
      
}

chrome.runtime.onMessage.addListener(messageHandler);

function messageHandler(request, sender, sendResponse) {
  if (request.message === 'start-timer') {
    clearPersistentNotif();
    updateTime();

  } else if (request.message === 'stop') {
    chrome.action.setIcon({ path: iconAlarm });
  }
}

async function TaskClearNotif() {
  return new Promise(resolve => {
    self.registration.getNotifications().then(function(notifications) {
      for (let notif of notifications) {
        notif.close();
      }
      resolve();
    });
  });
}

function clearPersistentNotif() {
  // Get all active notifications
  self.registration.getNotifications().then(function(notifications) {
    // Loop through the notifications and close the one with a specific title
    for (let i = 0; i < notifications.length; i++) {
      if (notifications[i].title.startsWith(`Time's up!`)) {
        notifications[i].close();
        break;
      }
    }
  });

}

function msToMinutes(milliseconds) {
  return Math.floor(milliseconds / 60000);
}

function minutesToHoursAndMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  let timeString = '';
  if (hours > 0) {
    timeString +=  `${hours}h`;
  }
  if (minutes > 0) {
    timeString +=  `${remainderMinutes}m`;
  }
  if (minutes == 0) {
    timeString = '0m';
  }
  
  return timeString;
}

async function startNewAlarmInMinutes(minutes) {
  await TaskClearNotif();
  let aMinute = 60;
  let miliseconds = 1000;
  let durationTime = parseInt(minutes) * aMinute * miliseconds;
  await startNewAlarm(durationTime);
}

async function startNewAlarm(durationTime, isSequenceTask = false) {
  
  let data = await chrome.storage.local.get(["history", "start"]);
  let distanceMinutes = 0;
  if (typeof(data.start) != 'undefined') {
    distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
  }

  await chrome.storage.local.set({ 'history': data.history + distanceMinutes });
  await chrome.storage.local.remove(['start']);
  await chrome.alarms.clearAll();
  
  let now = new Date().getTime();
  let triggerTime = now + durationTime;
  
  await chrome.storage.local.set({ 'start': now  });
  
  await chrome.alarms.create('clock', {
    periodInMinutes: 1
  });
  await chrome.alarms.create('main', {
      when: triggerTime
  }); 
  
  let threeMinThresholdInMs = 3 * 60 * 1000;
  
  if (!isSequenceTask && triggerTime - (now + threeMinThresholdInMs) > 0) {
    await chrome.alarms.create('3m', {
	      when: triggerTime - threeMinThresholdInMs
    });
  }
  updateTime();
  
}

async function startNextSequence() {
  
  let tasks = await getTask();
  let data = await chrome.storage.local.get(['activeTask']);
  if (!data.activeTask) return;

  let task = tasks.find(x => x.id == data.activeTask);
  if (!task) return;
  
  let alarmDurationTime = task.durationTime;
  let isSequenceTask = true;
  
  // get target time from sequence
  compoSequence.Stash(task.sequenceTasks);
  let sequenceTask = compoSequence.GetActive();
  
  if (sequenceTask) {
    
    let sequenceTaskTitle = sequenceTask.title;
    alarmDurationTime = sequenceTask.targetTime;
    
    if (sequenceTask.targetCapTime > 0) {
      let capTimeLeft = sequenceTask.targetCapTime - sequenceTask.progressCapTime;
      
      // set timer using the rest of target cap time if cap time is lower than timer
      if (capTimeLeft < sequenceTask.targetTime) {
        alarmDurationTime = capTimeLeft;
      }
    }
    
    if (task.targetCapTime > 0 && task.targetCapTime < alarmDurationTime) {
      alarmDurationTime = task.targetCapTime;
    }
    
    // get title from task if linked
    if (sequenceTask.linkedTaskId) {
      let linkedTask = GetTaskById(tasks, sequenceTask.linkedTaskId);
      if (linkedTask) {
        sequenceTaskTitle = linkedTask.title;
      }
    }
    
    // notify next task name
    const notification = registration.showNotification(`${sequenceTaskTitle}`, { 
      body: `${helper.ToTimeString(alarmDurationTime, 'hms')} left`, 
      iconAlarm,
      tag: 'active-sequence-task',
    });
    
  }
  compoSequence.Pop();
  
  startNewAlarm(alarmDurationTime, isSequenceTask);
  
}

async function takeBreakTime() {
  let seconds = 20;
  let alarmDurationTime = seconds * 1000; // 25 seconds
  let isSequenceTask = true;
  
  const notification = registration.showNotification(`Take a break!`, { 
    body: `${seconds}s left`, 
    iconAlarm,
    tag: 'active-sequence-task',
  });
  
  // store storage
  await chrome.storage.local.set({
  	isTakeBreak: true,
  });
  
  startNewAlarm(alarmDurationTime, isSequenceTask);
}

function minuteToMs(minutes) {
  return minutes * 60 * 1000;
}

function secondsToHMS(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainderSeconds = seconds % 60;
  let timeString = '';

  if (hours > 0) {
    timeString += `${hours}h`;
  }

  if (minutes > 0 || hours > 0) {
    timeString += `${minutes}m`;
  }

  if (remainderSeconds > 0 || (hours === 0 && minutes === 0)) {
    timeString += `${remainderSeconds}s`;
  }

  if (seconds === 0) {
    timeString = '0s';
  }

  return timeString;
}

function msToSeconds(milliseconds) {
  return Math.floor(milliseconds / 1000);
}

async function restartTask() {
  let tasks = await getTask();
  let data = await chrome.storage.local.get(['activeTask']);
  if (!data.activeTask) return;

  let task = tasks.find(x => x.id == data.activeTask);
  if (!task) return;

  task.progressTime = 0;
  await storeTask(tasks);
  
  let alarmDurationTime = task.durationTime;
  if (task.targetCapTime > 0 && task.targetCapTime < alarmDurationTime) {
    alarmDurationTime = task.targetCapTime;
  }
  
  startNewAlarm(alarmDurationTime);
}

async function restartSequenceTask() {
  
  let tasks = await getTask();
  let data = await chrome.storage.local.get(['activeTask']);
  if (!data.activeTask) return;

  let activeTask = tasks.find(x => x.id == data.activeTask);
  if (!activeTask) return;
  
  let alarmDurationTime = activeTask.durationTime;
  let isSequenceTask = true;
  
  // get target time from sequence
  compoSequence.Stash(activeTask.sequenceTasks);
  let sequenceTask = compoSequence.GetPrevious();
  
  if (sequenceTask) {
  
    let isRepeat = (sequenceTask.repeatCount > 0);
    if (isRepeat) {
      sequenceTask.counter.repeatCount = 0;
    }
    if (sequenceTask.targetCapTime > 0 && sequenceTask.progressCapTime >= sequenceTask.targetCapTime) {
      sequenceTask.progressCapTime = 0;
    }
    compoSequence.SetActiveById(sequenceTask.id);
    
    let sequenceTaskTitle = sequenceTask.title;
    alarmDurationTime = sequenceTask.targetTime;
    
    // get title from task if linked
    if (sequenceTask.linkedTaskId) {
      let linkedTask = GetTaskById(tasks, sequenceTask.linkedTaskId);
      if (linkedTask) {
        sequenceTaskTitle = linkedTask.title;
      }
    }
    
    // notify next task name
    const notification = registration.showNotification(`${sequenceTaskTitle}`, { 
      body: `${secondsToHMS(msToSeconds(sequenceTask.targetTime))} left`, 
      iconAlarm,
      tag: 'active-sequence-task',
    });
    
  }
  compoSequence.Commit();
  await storeTask(tasks);
  
  startNewAlarm(alarmDurationTime, isSequenceTask);
  
}

let canvas = new OffscreenCanvas(280, 5);
let c = canvas.getContext('2d');
let progress = 280;
let clockInterval;

function time(seconds) {
  let now = new Date().getTime();
  let end = now + seconds * 1000;
  let mid = Math.floor((end - now) / 2);
  startTimer(mid, end);
  clearInterval(clockInterval);
  oneTime.reset();
  spawnNotification('Started', 'white', iconAlarm);
  clockInterval = setInterval(() => startTimer(mid, end), 1000)
}

function spawnNotification(body, color, icon, requireInteraction = false, actions = []) {
  c.canvas.width = 280;
  c.canvas.height = 5;
  c.fillStyle = color;
  c.fillRect(0,0,progress,30);
  const notification = registration.showNotification('', { 
    body, 
    icon,
    actions,
    tag: 'progress',
    renotify: true,
    requireInteraction: requireInteraction,
    // image: c.canvas.toDataURL()
  });
  // if (useClickAction) {
    // notification.onclick = function(x) { focus(); this.close() };
  // }
}

function spawnNotificationV2(notifId, body, color, icon, requireInteraction = false, actions = [], tag = 'progress') {

  c.canvas.width = 280;
  c.canvas.height = 5;
  c.fillStyle = color;
  c.fillRect(0, 0, progress, 30);

  const notification = registration.showNotification(notifId, { 
    body, 
    icon,
    actions,
    tag,
    renotify: true,
    requireInteraction: requireInteraction,
  });
}


let oneTime = OneTime();

function OneTime() {
  
  let registeredKey = {}
  
  function watch(key, force) {
    if (typeof(force) !== 'undefined') {
      registeredKey[key] = force;
      return force;
    }
    if (registeredKey[key]) {
      return false;
    } else {
      registeredKey[key] = true
      return true
    }
  }
  
  function reset() {
    registeredKey = {};
  }
  
  return {
    watch,
    reset,
  };
  
}

async function updateTime() {

  let alarms = await chrome.alarms.getAll();
  if (alarms.length === 0) {
    return;
  } 
  let mainAlarm = alarms.find(x => x.name=='main');
  if (!mainAlarm) {
    drawMinutesLeft(-1);
    return;
  }
  
  // get task
  let data = await chrome.storage.local.get(["history", "start", "activeTask"]);
  let finishCountProgress = 0;
  if (data.activeTask) {
    let tasks = await getTask();
    let activeTask = tasks.find(x => x.id == data.activeTask);
    if (activeTask.finishCount && activeTask.finishCountProgress > 0) {
      finishCountProgress = activeTask.finishCountProgress;
    }
  }


  let distance = mainAlarm.scheduledTime - new Date().getTime();
  let minutesLeft = Math.min(60, Math.floor(distance / (1000 * 60)));
  
  drawMinutesLeft(minutesLeft, finishCountProgress);
}

function drawMinutesLeft(minutesLeft, finishCountProgress = 0) {
  let x = new OffscreenCanvas(32,32)
  let c=x.getContext('2d')
  x.width = 32
  x.height = 32
  c.font='bold 26px sans-serif'
  // c.fillStyle ='yellow'
  c.roundRect(0,0,32,32,3)
  
  if (minutesLeft <= 2) {
    c.fillStyle ='#FF6464'
  } else if (minutesLeft <= 5) {
    c.fillStyle ='#FFE162'
  } else if (minutesLeft <= 15) {
    c.fillStyle ='#00FFC6'
  } else {
    c.fillStyle ='#CCFFBD'
  }
  c.fillText(`${('00'+minutesLeft).slice(-2)}`,2,26)
  
  c.fillStyle = 'white';
  for (let i=0; i<finishCountProgress; i++) {
    c.fillRect(i*12, 0, 10, 4);
  }
  
  c.getImageData(0,0,32,32,{willReadFrequently:true})
  chrome.action.setIcon({imageData:c.getImageData(0,0,32,32,{willReadFrequently:true})})
}

(async function() {
  
  let alarms = await chrome.alarms.getAll()
  if (alarms.length > 0) {
    updateTime();
    // chrome.action.setIcon({ path: iconAlarm })
  } else {
    chrome.action.setIcon({ path: iconAlarm })
  }
  
})();