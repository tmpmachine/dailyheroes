let tasks = [];
let globalNotification = {};


function generateUniqueId() {
  // Generate a random 8 character string
  const randomString = Math.random().toString(36).substring(2, 10);
  
  // Get the current timestamp in milliseconds
  const timestamp = Date.now();
  
  // Combine the random string and the timestamp to create a unique ID
  const uniqueId = `${randomString}${timestamp}`;
  
  return uniqueId;
}

async function setTimer(duration) {
  
  let data = await window.service.GetData(["history", "start"]);
  let distanceMinutes = 0;
  let distanceTime = 0;
  if (typeof(data.start) != 'undefined') {
    distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
    distanceTime = new Date().getTime() - data.start;
  }
  await window.service.SetData({ 'history': data.history + distanceMinutes });
  await window.service.RemoveData(['start']);
  if (distanceTime > 0) {
    await updateProgressActiveTask(distanceMinutes, distanceTime);
  }
  
  
  let aMinute = 60;
  let milliseconds = 1000;
  let now = new Date().getTime();
  let triggerTime = now + duration;
  
  await window.service.SetData({ 'start': now  });
  
  lsdb.data.scheduledTime = triggerTime;
  lsdb.save();
  
  if (window.modeChromeExtension) {
    await chrome.alarms.clearAll();
    await chrome.alarms.create('clock', {
      // when: triggerTime
      periodInMinutes: 1
    });
    await chrome.alarms.create('main', {
      when: triggerTime,
    });
    
    if ( triggerTime - (now + 3 * aMinute * milliseconds) > 0 ) {
      await chrome.alarms.create('3m', {
  	      when: triggerTime - 3 * aMinute * milliseconds
      });
    }
    
    await chrome.runtime.sendMessage({message: 'start-timer'});
  }
  
  updateUI();  
  
}

let androidClient = (() => {
  
  let SELF = {
    StartTimer,
    StopTimer,
  };
  
  function StartTimer(seconds, title) {
    if (typeof(MyApp) == 'undefined') return;
    
    let isPersistent = true;
    let desc = '';
    MyApp.StartTask(seconds, title, desc, isPersistent);
  }
  
  function StopTimer() {
    if (typeof(MyApp) == 'undefined') return;
    
    MyApp.StopTask();
  }
  
  return SELF;
  
})();


function isNumber(input) {
  return /^[0-9]+$/.test(input);
}

function loadSearch() {
  if (window.lsdb.data.search || window.lsdb.data.labelFilter) {
    $('#node-filter-box').value = lsdb.data.search;
    let element = $('#node-filter-box');
    
    let selector = '[data-slot="title"]';
    let classDisplayNone = 'd-none';
    let containerSelector = '#tasklist-container [data-obj="task"]';
    let labelFilterValue = $('#in-filter-search-label').value;

    const inputValue = element.value.toLowerCase();
    let nodes = document.querySelectorAll(containerSelector);
    let filteredNodes = nodes;
    
    if (labelFilterValue) {
      filteredNodes = [];
      for (let node of nodes) {
        const selectorValue = node.querySelector('[data-slot="label"]').textContent.toLowerCase().split(',');
        if (selectorValue.includes(labelFilterValue)) {
          node.classList.remove(classDisplayNone);
          filteredNodes.push(node);
        } else {
          node.classList.add(classDisplayNone);
        }
      }
    }

    for (let node of filteredNodes) {
      const selectorValue = node.querySelector(selector).textContent.toLowerCase();
      if (selectorValue.includes(inputValue)) {
        node.classList.remove(classDisplayNone);
      } else {
        node.classList.add(classDisplayNone);
      }
    }
    
  }
}


function deleteStorageItem(key) {
  chrome.storage.sync.remove(key, function() {
    console.log(`Key "${key}" removed from storage`);
  });
}

async function clearAlarms() {
  if (window.modeChromeExtension) {
    await chrome.alarms.clearAll();
  } else {
    window.lsdb.data.scheduledTime = 0;
    window.lsdb.save();
  }
}

function toggleStartTimer() {
  let isTimerRunning = document.body.stateList.contains('--timer-running');
  if (isTimerRunning) {
    app.TaskStopActiveTask();
  } else {
    startOrRestartTask();
  }
}

async function startOrRestartTask(options) {
  let task = await getActiveTask();
  if (!task) return;
  
  await app.TaskStopActiveTask();
  await app.TaskContinueTask(task.id);
  await compoTask.StartTimerByTaskId(task.id, options);
}

async function finishTimer() {
  let task = await getActiveTask();
  if (!task) return;

  await app.TaskStopActiveTask();
  await finishTask(task.id); 
  updateUI();
}

let countdonwIntervalId;

async function startCountdown() {
  
  clearInterval(countdonwIntervalId);
  let alarm;
  if (window.modeChromeExtension) {
    alarm = await chrome.alarms.get('main');
    if (!alarm) {
      document.body.stateList.remove('--timer-running');
      return;
    }
  } else {
    if (!lsdb.data.scheduledTime) {
      document.body.stateList.remove('--timer-running');
      return;
    }
  }
  document.body.stateList.add('--timer-running');
  
  let store = await window.service.GetData('start');
  let startTime = store.start;
  let scheduledTime = window.modeChromeExtension ? alarm.scheduledTime : lsdb.data.scheduledTime;
  
  countdonwIntervalId = setInterval(() => {
    updateTime(scheduledTime, startTime);
    // ui.updateProgressBar();
  }, 1000);
  
  // Execute the function immediately before waiting for 1 second
  updateTime(scheduledTime, startTime);
}

async function updateTime(scheduledTime, startTime) {
  
  let currentTime = new Date().getTime();
  let distance = Math.abs(scheduledTime - currentTime);
  let isNegative = (scheduledTime < currentTime);
  let seconds = Math.round(distance / 1000);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  let negativeStr = (isNegative ? '-' : '');
  let countdownStr = `${negativeStr} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`.trim();
  document.title = `${countdownStr} - DailyHeroes`;
  updateCountdownText(countdownStr, isNegative);
  
  let percentage = ( currentTime - startTime ) / ( scheduledTime - startTime ) * 100;
  $('.NzE2ODYyNQ-progress-bar-fill').style.width = `${percentage}%`;
  
  // is task finished, perform once.
  if (isNegative) {
    
    // stop updating the timer, it's ended by background script
    clearInterval(countdonwIntervalId);
    if (!app.isPlatformChromeExt) {
      await app.TaskStopActiveTask();
    }
    
    // ended few milliseconds ago
    if (distance < 1000) {
      sendNotification();
      ui.TurnOnScreen();
      // avoid overlapped alarm played by extension
      if (!app.isPlatformChromeExt) {
        app.TaskPlayAlarmAudio();
      }
    }
    
  }
  
  let distanceMinutes = Math.floor((currentTime - startTime) / (60 * 1000));
  let distanceTime = currentTime - startTime;
  updateProgressPercentage(startTime);
  
  let activeTask = await getActiveTask();
  if (activeTask) {
    ui.updateTaskProgressBar(activeTask.id);
  }
}


async function sendNotification() {
  if (!app.isCanNotify) return;
  
  let isNotifSequence = false;  
  let task = await getActiveTask();
  
  compoSequence.Stash(task.sequenceTasks);
  let sequenceTask = compoSequence.GetActive();
  let sequenceTaskTitle = '';
  let sequenceTaskDurationTimeStr = '';
  let taskTargetTimeStr = '';
  
  if (sequenceTask) {
    sequenceTaskTitle = sequenceTask.title;
    
    if (sequenceTask.linkedTaskId) {
      let linkedTask = compoTask.GetById(sequenceTask.linkedTaskId);
      if (linkedTask) {
        sequenceTaskTitle = linkedTask.title;
        taskTargetTimeStr = `(${ secondsToHMS(msToSeconds(linkedTask.targetTime)) } left)`;
      }
    }
    
    isNotifSequence = true;  
    sequenceTaskDurationTimeStr = `(${ secondsToHMS(msToSeconds(sequenceTask.targetTime)) })`;
  }
  compoSequence.Pop();
  
  let timeStreakStr = '';
  let timeStreak = compoTimeStreak.GetActive();
  if (timeStreak) {
    timeStreakStr = ` (${secondsToHMS(msToSeconds(timeStreak.totalTimeStreak))} total) `;
  }
  
  
  if (isNotifSequence) {
    
    navigator.serviceWorker.ready.then(async (registration) => {
      
      let existingNotifs = await registration.getNotifications();
      for (let notif of existingNotifs) {
        notif.close();
      }
        
      let notifTitle = `Time's up! ${timeStreakStr}`.replace(/ +/g,' ').trim();
      let notifBody = `Next ${sequenceTaskDurationTimeStr} : ${sequenceTaskTitle} ${taskTargetTimeStr}`.replace(/ +/g,' ').trim();
      
      registration.showNotification(notifTitle, {
        body: notifBody,
        tag: 'next-sequence-wait-user-action',
        requireInteraction: true,
        actions: [{
          action: 'start-next-sequence',
          title: `Start next`.trim(),
        }, {
          action: 'close',
          title: 'Close',
        }]
      });
      
    	ui.RefreshListSequenceByTaskId(task.id);

    });
    
    /*
    let notification = new Notification("Time's up!", {
      body: `${sequenceTask.title}`,
      requireInteraction: true,
    }); 
    */
    
  } else {
    
    let notification = new Notification(`Time's up!`, {
      body: `Task : ${task.title}`,
      requireInteraction: true
    });
    notification.addEventListener('click', function(e) {
      window.focus();
      e.target.close();
    }, false);
    
  }
  
}


function updateCountdownText(countdownStr, isNegative) {
  $('#txt-countdown').textContent = countdownStr;
  $('.NzE2ODYyNQ-progress-bar-fill').classList.toggle('is-excess-time', isNegative);
}


function updateProgressPercentage(startTime) {
  let distanceMinutes = Math.floor((new Date().getTime() - startTime) / (60 * 1000));
  let distanceTime = new Date().getTime() - startTime;
  
  // let history = getSumTaskProgress();
  let historyTime = getSumTaskProgressTime();
  let target = getSumTaskTarget();

  let percentage = Math.min(100, Math.floor((historyTime+distanceTime)/minutesToMs(target) * 10000) / 100);
  if (target === 0) {
    percentage = 0;
  }
  $('#percentage').textContent = `(${percentage}%)`;
  $('.progress-bar-fill').style.width = `${percentage}%`;
}


function detectKeyPressS() {
  let slashKeyPressed = false;

  function detect(event) {
    // Check if the currently focused element is not an input element
    if (document.activeElement.tagName.toLowerCase() == 'input' || document.activeElement.tagName.toLowerCase() == 'textarea') {
      // Do something
      return;
    }
  
    if (event.key === '/' && !slashKeyPressed) {
      slashKeyPressed = true;
      $('#node-filter-box').focus();
      event.preventDefault();
    }
  }

  function reset() {
    slashKeyPressed = false;
  }

  document.addEventListener('keypress', detect);
  document.addEventListener('keyup', reset);
  document.addEventListener('blur', reset);
}

detectKeyPressS();




async function setActiveTask() {
  let data = await window.service.GetData(['activeTask', 'start']);
  if (data.activeTask) {
    let el = $(`[data-obj="task"][data-id="${data.activeTask}"]`);
    if (el) {
      el.stateList.add('--active');
      let activeTimerDistance = await getActiveTimerDistance();
      el.querySelector('[data-obj="live-progress"]').textContent = `(+${activeTimerDistance}m)`;
      
      // set live progress note
      let activeNoteEl = $kind({kind:'note', state:'--active'}, el);
      if (activeNoteEl) {
        let noteProgressEl = $kind({kind:'progress'}, activeNoteEl);
        noteProgressEl.textContent = `(+${activeTimerDistance}m)`;
      }
    }
  }
}

window.$kind = function(obj, parent) {
  let state = obj.state ? `[data-state~="${obj.state}"]` : '';
  return parent.querySelector(`[data-kind="${obj.kind}"]${state}`)
}

async function getActiveTimerDistance() {
  let data = await window.service.GetData(["history", "start"]);
  if (data.start) {
	  let distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));  
	  return distanceMinutes;
  }
  return 0;
}

async function getActiveTimerDistanceTime() {
  let data = await window.service.GetData(["history", "start"]);
  if (data.start) {
	  return new Date().getTime() - data.start;
  }
  return 0;
}

async function loadTasks() {
  let data = await window.service.GetData(['tasks']);
  if (data.tasks) {
    tasks = data.tasks;
  }
  await integrityCheck(tasks);
}

async function integrityCheck(tasks) {
  for (let task of tasks) {
    
    if (typeof(task.targetTime) == 'undefined')
      task.targetTime = 0;
    
    if (typeof(task.ratio) == 'undefined')
      task.ratio = 0;
    
    if (task.parentId === null)
      task.parentId = '';
    
  }
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


function msToMinutes(milliseconds) {
  return Math.floor(milliseconds / 60000);
}

function msToSeconds(milliseconds) {
  return Math.floor(milliseconds / 1000);
}

function sumAllChildProgress(parentId) {
  return tasks.filter(x => x.parentId == parentId).reduce((total, item) => total + item.totalProgressTime + sumAllChildProgress(item.id), 0); 
}

function isSubTaskOf(parentId, findId) {
  let group = getGroupById(parentId);
  while (group) {
    if (group.id == findId) {
      return true;
    }
    group = getGroupById(group.parentId);
  }
  return false;
}

function isTopMissionPath(id) {
  let missions = compoMission.GetMissions();
  for (let item of missions) {
    if (item.id == id) return true;
  }
  return false;
}

function getAndComputeMissionPath(groupId) {
    
    let breadcrumbs = [];
    
    let activeGroup = lsdb.data.groups.find(x => x.id == groupId);
    if (activeGroup) {
      breadcrumbs.push(activeGroup);
      
      let safeLoopCount = 10;
      let parentId = activeGroup.parentId;
      while (parentId != '') {
        
        activeGroup = lsdb.data.groups.find(x => x.id == parentId);
        breadcrumbs.splice(0, 0, activeGroup);
        parentId = activeGroup.parentId;
        
        // safe loop leaking
        safeLoopCount -= 1;
        if (safeLoopCount < 0) {
          break;
        }
      }
      
    }
    
    let html = ''
    for (let item of breadcrumbs) {
      // if (item.id == lsdb.data.activeGroupId) {
      
      let ratioTimeLeftStr = '';
      let ratioTimeLeft = timeLeftRatio.find(x => x.id == item.id);
      if (ratioTimeLeft && ratioTimeLeft.timeLeft > 0) {
        ratioTimeLeftStr = `${minutesToHoursAndMinutes(ratioTimeLeft.timeLeft)}`;
      }
      
        html += `
          <small>${item.name} <mark>${ratioTimeLeftStr}</mark> /</small>
        `
      // } else {
      //   html += `
      //     <button data-id="${item.id}" style="font-size:12px">${item.name}</button>
      //   `
      // }
    }
    
    return html;
  }

function setActiveSubTaskItem(el, item) {
  if (!item.activeSubTaskId) return;
  for (let node of el.querySelectorAll('[data-kind="note"]')) {
    if (node.querySelector('[data-slot="id"]').textContent == item.activeSubTaskId) {
      node.stateList.toggle('--active', true);
    }
  }
}
      
function updateUI() {
  
  window.service.GetData(['start','target']).then(async (result) => {
    let distanceMinutes = 0;
    let distanceTime = 0;
    let isRunning = (typeof(result.start) != 'undefined' && result.start > 0);
    if (isRunning) {
      distanceMinutes = Math.floor((new Date().getTime() - result.start) / (60 * 1000));
      distanceTime = new Date().getTime() - result.start;
    }
    
    ui.updateUI(isRunning);
    await startCountdown();
    
    let history = getSumTaskProgress();
    let historyTime = getSumTaskProgressTime();
    let target = getSumTaskTarget();
    
    
    // $('#percentage').textContent = Math.max(100, Math.floor(history/target*100)/100);
    let percentage = Math.min(100, Math.floor((historyTime+distanceTime)/minutesToMs(target)*10000)/100);
    if (target === 0) {
      percentage = 0;
    }
    $('#percentage').textContent = `(${percentage}%)`;
    $('.progress-bar-fill').style.width = `${percentage}%`;
    
  });
  
}

function minutesToMs(time) {
  return time*60*1000;
}

function getSumTaskProgress() {
  let total = 0;
  for (let item of tasks) {
    if (item.untracked) {
      continue;
    }
    total += msToMinutes(item.progressTime);
  }
  return total;
}

function getSumTaskProgressTime() {
  let total = 0;
  for (let item of tasks) {
    if (item.untracked) {
      continue;
    }
    total += item.progressTime;
  }
  return total;
}

function getSumTaskTarget() {
  let total = 0;
  for (let item of tasks) {
    if (item.untracked) {
      continue;
    }
    total += Math.max(0, item.target);
  }
  
  return total;
}

async function removeActiveTaskIfExists(id) {
  let task = await getActiveTask();
  if (task && id == task.id) {
    await removeActiveTask();
  }
}

function saveConfig() {
  lsdb.save();
}

function isViewModeMission() {
  return lsdb.data.viewMode == 'mission';
}

function deleteAllChildTasksByParentId(id) {
  let ids =  tasks.map(x => {
    if (x.parentId == id) {
      return x.id;
    } 
    return null;
  }).filter(x => x !== null);
  
  let totalDeletedProgressTime = 0;
  for (let id of ids) {
    let deleteIndex = tasks.findIndex(x => x.id == id);
    totalDeletedProgressTime += tasks[deleteIndex].totalProgressTime;
    tasks.splice(deleteIndex, 1);
    
    // delete group
    {
      let deleteIndex = lsdb.data.groups.findIndex(x => x.id == id);
      if (deleteIndex >= 0) {
        lsdb.data.groups.splice(deleteIndex, 1);
      }
    }
    // delete mission
    {
      let isExistsMission = compoMission.IsExistsMissionId(id);
      if (isExistsMission) {
        compoMission.RemoveMissionById(id);
      }
    }
    
    totalDeletedProgressTime += deleteAllChildTasksByParentId(id);
  }
  return totalDeletedProgressTime;
}



async function taskApplyAllParentTargetTime(parentId, distanceTime) {
  let task = app.GetTaskById(parentId);
  while (task) {
    await TaskApplyTargetTimeBalanceInGroup(task, distanceTime);
    task = app.GetTaskById(task.parentId);
  }
}

async function TaskApplyTargetTimeBalanceInGroup(task, addedTime) {
  try {
    let excessTime = task.targetTime - addedTime;
    if (excessTime < 0 && task.ratio > 0) {
      await applyTargetTimeBalanceInGroup(task, Math.abs(excessTime));
    }
    task.targetTime = Math.max(0, task.targetTime - addedTime);
  } catch (e) {
    console.error(e);
  }
}

async function applyTargetTimeBalanceInGroup({id, parentId, ratio, targetMinutes}, addedTime) {

  if (typeof(ratio) != 'number') return;
  
  let totalPriorityPoint = compoTask.GetTotalPriorityPointByParentTaskId(parentId);
  let filteredTasks = tasks.filter(task => ( task.parentId == parentId && typeof(task.ratio) == 'number' && task.id != id ) );

  let remainingRatio = totalPriorityPoint - ratio;
  let timeToDistribute = ( addedTime *  ( remainingRatio / totalPriorityPoint ) ) / ( ratio / totalPriorityPoint );

  for (let task of filteredTasks) {
    let addedTargetTime = Math.round(timeToDistribute * (task.ratio / remainingRatio));
    
    if (isCanNavigateSub(task.id)) {
      distributeTargetTimeInTaskSub(addedTargetTime, task);
    } else {
      task.targetTime = addOrInitNumber(task.targetTime, addedTargetTime);
    }
    
  }

}

function isCanNavigateSub(taskId) {
  return lsdb.data.groups.find(x => x.id == taskId);
}

function anyTaskHasRatio(tasks) {
  return ( tasks.filter(task => task.ratio > 0).length > 0 );
}

async function distributeTargetTimeInTaskSub(timeToDistribute, parentTask) {
  
  let tasks = compoTask.GetAllByParentId(parentTask.id);
  if (tasks.length == 0 || !anyTaskHasRatio(tasks)) {
    parentTask.targetTime = addOrInitNumber(parentTask.targetTime, timeToDistribute);
  }
  
  let totalPriorityPoint = compoTask.GetTotalPriorityPointByParentTaskId(parentTask.id);
  
  for (let task of tasks) {
    
    if (task.ratio === 0) continue;
    
    let priorityPoint = task.ratio;
    let addedTargetTime = Math.round( timeToDistribute * (priorityPoint / totalPriorityPoint) );
    
    if (isCanNavigateSub(task.id)) {
      distributeTargetTimeInTaskSub(addedTargetTime, task);
    } else {
      task.targetTime = addOrInitNumber(task.targetTime, addedTargetTime);
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

async function taskSetTaskRatio(id) {
  let task = tasks.find(x => x.id == id);
  if (!task) return;
  
  const { value } = await Swal.fire({
      title: 'Set Priority Point',
      input: 'text',
      inputLabel: 'Non negative number. Example: 5, 100, 200. Enter zero (0) to unset.',
      inputValue: task.ratio,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
      }
  });
  
  if (!value) return;
  
  task.ratio = parseFloat(value);
  await appData.TaskStoreTask();
  app.TaskListTask();
}

async function TaskAddLabel(id) {
  let task = tasks.find(x => x.id == id);
  if (!task) return;
  
  let label = window.prompt('Label', task.label);
  if (!label) return;
  
  task.label = label;
  await appData.TaskStoreTask();  
}

async function switchActiveTask(taskEl, id, persistent = false) {
  
  let activeTask = await getActiveTask();
  
  // switch task
  if (activeTask) {
    if (id == activeTask.id && !persistent) {
      await removeActiveTask();
      disableAllActive();
      ui.updateTaskProgressBar(id, false);
    } else {
      ui.updateTaskProgressBar(activeTask.id, false);
      await window.service.SetData({'activeTask': id});
      disableAllActive();
      taskEl.stateList.add('--active');
      await ui.updateTaskProgressBar(id);
      
      let data = await window.service.GetData('start');
      if (data.start) {
        taskEl.querySelector('[data-role="progress-bar"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', true);
        taskEl.querySelector('[data-role="progress-bar-container"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', true);
      }
    }
  } else {
    taskEl.stateList.add('--active');
    await window.service.SetData({'activeTask': id});
    await window.service.SetData({'tasks': tasks});
    let data = await window.service.GetData('start');
    if (data.start) {
      taskEl.querySelector('[data-role="progress-bar"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', true);
      taskEl.querySelector('[data-role="progress-bar-container"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', true);
    }
  }
}

function addSubTimer(taskId) {
  let modalData = {
    formData: {
      parentId: taskId,
    }
  };
  ui.ShowModalAddTask(modalData);
}


function partialUpdateTask(key, data) {
  switch (key) {
    case 'title':
      $(`[data-id="${data.id}"] [data-slot="title"]`).textContent = data.title;
      break;
    case 'notes':
      appendNotes(data);
      break;
  }
}

function appendNotes(data) {
  let newData = Object.assign({}, data.note[data.note.length-1]);
  newData.index = data.note.length - 1;
  let el = window.templateSlot.fill({
	  data: newData, 
	  template: document.querySelector('#tmp-notes').content.cloneNode(true), 
	});
  $(`[data-id="${data.id}"] [data-slot="note"]`).append(el);
}

async function taskArchiveTask(id) {
  let task = tasks.find(x => x.id == id);
  task.isArchived = true;
  await appData.TaskStoreTask();
  let taskEl = $(`[data-kind="task"][data-id="${task.id}"]`);
  $('#tasklist-completed').append(taskEl);
}

async function taskUnarchive(id) {
  let task = tasks.find(x => x.id == id);
  task.isArchived = false;
  // task.progress = 0;
  // task.progressTime = 0;
  // task.finishCountProgress = task.finishCount;
  await appData.TaskStoreTask();
  await app.TaskListTask();  
  loadSearch();
}

// todo: rename to archive
async function finishTask(id) {
  let task = tasks.find(x => x.id == id);
  task.progress = task.target;
  task.progressTime = task.target * 60 * 1000;
  await appData.TaskStoreTask();
  let taskEl = $(`[data-kind="task"][data-id="${task.id}"]`);
  $('#tasklist-completed').append(taskEl);
}

async function addNote(form) {
  let id = form.id.value;
  let title = form.title.value;
  let task = tasks.find(x => x.id == id);
  if (typeof(task.note) == 'undefined') {
    task.note = [];
  }
  
  let note = {
    id: generateUniqueId(),
    desc: title,
  };
  task.note.push(note);
  await appData.TaskStoreTask();
  partialUpdateTask('notes', task);
}

async function showModalNote(id) {
  let modal = document.querySelectorAll('#modal-note')[0].toggle();
  let form = modal.querySelector('form');
  form.reset();
  form.querySelectorAll('[type="hidden"]').forEach(el => el.value = '');

  modal.classList.toggle('modal--active', modal.isShown);
  modal.addEventListener('onclose', function() {
    modal.classList.toggle('modal--active', false);
  });
  ui.SetFocusEl(modal.querySelector('input[type="text"]'));
  modal.querySelector('form').id.value = id;
}

async function fixMissingNoteId(taskId, el) {
  let parentEl = el.closest('.i-item');
  let noteId = parentEl.querySelector('[data-slot="id"]').textContent;
  if (noteId) return;
  
  let task = tasks.find(x => x.id == taskId);
  let noteIndex = parseInt(parentEl.querySelector('[data-slot="index"]').textContent);
  let newId = generateUniqueId();
  task.note[noteIndex].id = newId;
  parentEl.querySelector('[data-slot="id"]').textContent = newId
  await appData.TaskStoreTask();
}

async function setSubTask(id, el) {
  let parentEl = el.closest('.i-item');
  let noteId = parentEl.querySelector('[data-slot="id"]').textContent;
  let task = tasks.find(x => x.id == id);
  
  if (!noteId) return;
  let isActive = task.activeSubTaskId == noteId;
  task.activeSubTaskId = (isActive ? null : noteId);
  let activeSubTaskEl = $(`[data-kind="task"][data-id="${task.id}"] [data-kind="note"][data-state="--active"]`);
  if (activeSubTaskEl) {
    activeSubTaskEl.stateList.toggle('--active', false);
  }
  parentEl.stateList.toggle('--active', !isActive);
  await appData.TaskStoreTask();
}

async function deleteNote(id, el) {
  let parentEl = el.closest('.i-item');
  let noteIndex = parseInt(parentEl.querySelector('[data-slot="index"]').textContent);
  let noteId = parentEl.querySelector('[data-slot="id"]').textContent;
  let task = tasks.find(x => x.id == id);
  if (noteId) {
    let deleteIndex = task.note.findIndex(x => x.id == noteId);
    task.note.splice(deleteIndex, 1);
  } else {
    task.note.splice(noteIndex, 1);
  }
  if (task.activeSubTaskId == noteId) {
    task.activeSubTaskId = null;
  }
  await appData.TaskStoreTask();
  parentEl.remove();
}

async function renameNote(id, el) {
  let parentEl = el.closest('.i-item');
  let noteIndex = parseInt(parentEl.querySelector('[data-slot="index"]').textContent);
  let noteId = parentEl.querySelector('[data-slot="id"]').textContent;
  let task = tasks.find(x => x.id == id);

  let newDesc;
  if (noteId) {
    let note = task.note.find(x => x.id == noteId);
    let desc = window.prompt('rename', note.desc);
    if (!desc) return;

    note.desc = desc;
    newDesc = desc;
  } else {
    let desc = window.prompt('rename', task.note[noteIdex].desc);
    if (!desc) return;
    
    task.note[noteIndex].desc = desc;
    newDesc = desc;
  }
  await appData.TaskStoreTask();
  if (noteId) {
    partialUpdateNoteName(parentEl, newDesc);
  }
}

function partialUpdateNoteName(noteEl, desc) {
  let descEl = $kind({kind:'note.desc'}, noteEl);
  if (descEl) {
    descEl.textContent = desc;
  }
}

async function setTaskTarget(id) {
  
  let task = tasks.find(x => x.id == id);
  
  const { value: userVal } = await Swal.fire({
      title: 'Set task duration',
      input: 'text',
      inputLabel: 'example: 1h, 30m, or 1h30m',
      inputValue: minutesToHoursAndMinutes(task.target),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
      }
  });
  
  if (!userVal) return;
  
  task.target = Math.max(0, parseHoursMinutesToMinutes(userVal));
  await appData.TaskStoreTask();
  await app.TaskListTask();  
  await updateUI();
  loadSearch();
}

async function removeActiveTask() {
  await window.service.RemoveData(['activeTask']);
}

async function getActiveTask() {
  let data = await window.service.GetData(['activeTask']);
  if (data.activeTask) {
    let activeTask = tasks.find(x => x.id == data.activeTask);
    if (activeTask) {
      return activeTask;
    }  
  }
  return null;
}

async function updateProgressActiveTask(addedMinutes, distanceTime) {
  let data = await window.service.GetData(['activeTask']);
  if (data.activeTask) {
    let activeTask = tasks.find(x => x.id == data.activeTask);
    if (activeTask) {
      activeTask.progress += addedMinutes;
      activeTask.progressTime += distanceTime;
      if (typeof(activeTask.totalProgressTime) == 'undefined') {
        activeTask.totalProgressTime = 0;  
      }
      activeTask.totalProgressTime += distanceTime;
      
      await taskApplyNecessaryTaskUpdates(activeTask, distanceTime);
      
      app.AddProgressTimeToRootMission(activeTask.parentId, distanceTime);

      await appData.TaskStoreTask();
      
      let el = $(`[data-obj="task"][data-id="${data.activeTask}"]`);
      if (el) {
        el.querySelector('[data-obj="live-progress"]').textContent = '(+0m)';
        el.querySelector('[data-obj="progress"]').textContent = minutesToHoursAndMinutes(msToMinutes(activeTask.progressTime));
      }
    }
  }
}

async function taskApplyNecessaryTaskUpdates(task, distanceTime) {
  // update all parent target time
  await taskApplyAllParentTargetTime(task.parentId, distanceTime);
  // apply target time balancing
  await TaskApplyTargetTimeBalanceInGroup(task, distanceTime);
}

function updateSubTaskProgress(task, distanceTime) {
  if (!task.activeSubTaskId) return;

  let note = getSubMissionById(task, task.activeSubTaskId);
  if (!note) return;

  if (typeof(note.totalProgressTime) == 'undefined') {
    note.totalProgressTime = 0;
  }

  note.totalProgressTime += distanceTime;
}

function getSubMissionById(task, subId) {
  return task.note.find(x => x.id == subId);
}

function disableAllActive() {
  let taskEls = document.querySelectorAll('#tasklist-container [data-obj="task"]');
  for (let node of taskEls) {
    node.stateList.remove('--active');
    node.querySelector('[data-obj="live-progress"]').textContent = ``;
    node.querySelector('[data-role="progress-bar"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', false);
    node.querySelector('[data-role="progress-bar-container"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', false);

    // update sub task live progress label
    let el = node;
    let activeNoteEl = $kind({kind:'note', state:'--active'}, el);
    if (activeNoteEl) {
      let noteProgressEl = $kind({kind:'progress'}, activeNoteEl);
      noteProgressEl.textContent = ``;
    }
  }
}


function parseHoursMinutesToMinutes(timeString) {
  return helper.ParseHoursMinutesToMinutes(timeString);
}


function parseHmsToMs(timeString) {
  return helper.ParseHmsToMs(timeString);
}

let timeLeftRatio = [];

function getGroupById(id) {
  return lsdb.data.groups.find(x => x.id == id);
}


let app = (function () {
  
  let $$ = document.querySelectorAll.bind(document);

  let SELF = {
    GetAlarmVolume,
    StopTestAlarmAudio,
    ApplyProgressMadeOutsideApp,
    
    isPlatformAndroid: ( typeof(MyApp) != 'undefined' ),
    isPlatformChromeExt: window.modeChromeExtension,
    isPlatformWeb: ( !window.modeChromeExtension && typeof(MyApp) == 'undefined' ),
    isCanNotify: false,
    
    Init,
    TaskClickHandler,
    GetDataManager,
    ResetData,
    BackupData,
    TaskExportDataToBlob,
    TaskImportDataFromJSON,
    UploadBackupFile,
    
    GetTaskById,
    getTaskById: GetTaskById,
    TaskAddTask,
    TaskUpdateTask,
    SyncGroupName,
    TaskDeleteTask,
    TaskStarTask,
    TaskAddProgressManually,
    
    AddProgressTimeToRootMission,
    TaskStopActiveTask,
    TaskListTask,
    TaskListTasksByThreshold,
    TaskContinueTask,
    
    SetAlarmAudio,
    TaskRemoveAlarmAudio,
    TaskPlayAlarmAudio,
    HandleInputAlarmVolume,
    
    IsShowTargetTimeOnly,
    SetViewTargetTimeOnly,
    SetSortMode,
    Commit,
    
    SetGlobalTimer,
    GetGlobalTimer,
    
    TaskNavigateToMission,
    StartTaskTimer,
    ToggleStartTimerAvailableTime,
    TaskAddToMission,
    TaskRemoveTaskFromMission,
  };
  
  let data = {
    isViewTargetTimeOnly: false,
    isSortByTotalProgress: false,
    globalTimer: 6, // in minutes
    alarmVolume: 1,
  };
  
  let local = {
    audioPlayer: null,
  };
  
  async function TaskRemoveTaskFromMission(id) {
    
    let isExists = compoMission.IsExistsMissionId(id);
    if (!isExists) return false;
    
    compoMission.RemoveMissionById(id);
  
    compoMission.Commit();
  
    appData.Save();
    
    let task = compoTask.GetById(id);
    if (task.type == 'M') {
      let deleteIndex = tasks.findIndex(x => x.id == id);
      tasks.splice(deleteIndex, 1);
      await appData.TaskStoreTask();
    }
    
  }
  
  async function TaskAddToMission(id, parentEl) {
    
    let isExists = compoMission.IsExistsMissionId(id);
    let isTaskDeleted = false;
    
    if (isExists) {
      // remove from mission
      compoMission.RemoveMissionById(id);
      parentEl.stateList.remove('--is-mission');
      if (isViewModeMission()) {
        parentEl.remove();
      }
      
      let task = compoTask.GetById(id);
      if (task.type == 'M') {
        isTaskDeleted = true;
      }
      
    } else {
      // add to mission
      let missionData = compoMission.CreateItemMission(id);
      compoMission.AddMission(missionData);
      parentEl.stateList.add('--is-mission');
    }
  
    compoMission.Commit();
  
    appData.Save();
    
    if (isTaskDeleted) {
      let isBypassConfirm = true;
      await app.TaskDeleteTask(id, parentEl, isBypassConfirm);
    }
    
  }
  
  function ToggleStartTimerAvailableTime() {
    let isTimerRunning = document.body.stateList.contains('--timer-running');
    if (isTimerRunning) {
      app.TaskStopActiveTask();
    } else {
      let options = {
        isStartAvailableTime: true,
      };
      startOrRestartTask(options);
    }
  }
  
  async function StartTaskTimer(parentEl, id) {

    // starting a different task, reset time streak
    {
      let activeTask = await getActiveTask();
      if (activeTask && id != activeTask.id) {
        let progressTime = 0;
        await compoTimeStreak.TaskUpdateTaskTimeStreak(progressTime, id);
        await compoTimeStreak.TaskCommit();
      }
    }
    
    await app.TaskStopActiveTask();
    await switchActiveTask(parentEl, id, true);
    await app.TaskContinueTask(id);
    await compoTask.StartTimerByTaskId(id);
    
    ui.RefreshTimeStreak();
  }
  
  async function TaskNavigateToMission(id) {
    let task = await app.GetTaskById(id);
    if (!task) return;
    
    app.SetViewTargetTimeOnly(false);
    ui.UpdateViewModeState();
    $('#labeled-by-showtarget').checked = app.IsShowTargetTimeOnly();
    
    ui.ChangeViewModeConfig('tasks');
    ui.Navigate(task.parentId);
    
    app.Commit();
    saveConfig();
    
    await app.TaskListTask();
  }
  
  function SetGlobalTimer(minutes) { data.globalTimer = minutes; }
  function GetGlobalTimer() { return data.globalTimer; }
  
  function SetAlarmAudio() {
    let input = document.createElement('input');
    input.type ='file';
    input.onchange = function() {
      storeAudioFile(this.files[0]);
    };
    document.body.append(input);
    input.click();
    input.remove();
  }
  
  function TaskRemoveAlarmAudio() {
    return idbKeyval.del('audioFile');
  }
  
  async function storeAudioFile(file) {
    try {
      await idbKeyval.set('audioFile', file);
    } catch (error) {
      console.error('Error storing File Handle:', error);
    }
  }
  
  async function retrieveAudioFile() {
    try {
      const file = await idbKeyval.get('audioFile');
      if (file) {
        return file;
      } else {
        console.error('File Handle not found in IndexedDB.');
      }
    } catch (error) {
      console.error('Error retrieving File Handle:', error);
    }
  }
  
  async function TaskPlayAlarmAudio() {
    let audioFile = await retrieveAudioFile();
    if (audioFile) {
      
      let audioURL = URL.createObjectURL(audioFile);
      
      if (local.audioPlayer) {
        local.audioPlayer.pause();
        local.audioPlayer.src = audioURL;
      } else {
        local.audioPlayer = new Audio(audioURL);
      }

      local.audioPlayer.volume = data.alarmVolume;
      local.audioPlayer.play();

    }
  }
  
  function HandleInputAlarmVolume(evt) {
    data.alarmVolume = parseFloat(evt.target.value);
    localStorage.setItem('alarm-audio-volume', evt.target.value);
    
    if (local.audioPlayer) {
      local.audioPlayer.volume = data.alarmVolume;
    }
  }
  
  async function TaskContinueTask(id) {
    let task = tasks.find(x => x.id == id);
    if (task.progressTime < task.target * 60 * 1000) {
      return;
    }
    task.progress = 0;
    task.progressTime = 0;
    task.finishCountProgress = task.finishCount;
    await appData.TaskStoreTask();
    await app.TaskListTask();  
    loadSearch();
  }

  function filterListTask(isMissionView) {
    
    let filteredTasks = [];
        
    if (isMissionView) {
      // mission view
      
      filteredTasks = filterTaskByCollection();
    } else {
      // all task view
      
      if (IsShowTargetTimeOnly()) {
        filteredTasks = filterTaskByTargetTime();
      } else {
        filteredTasks = filterTaskByPath();
      }     
    }
    
    return filteredTasks;
    
  }
  
  function IsShowTargetTimeOnly() {
    return data.isViewTargetTimeOnly;
  }
  
  function SetViewTargetTimeOnly(boolVal) {
    data.isViewTargetTimeOnly = boolVal;
  }
  
  function SetSortMode(evt) {
    data.isSortByTotalProgress = evt.target.checked;
  }
  
  function Commit() {
    lsdb.data.isFilterTaskByTargetTime = data.isViewTargetTimeOnly;    
    lsdb.data.isSortByTotalProgress = data.isSortByTotalProgress;    
    lsdb.data.globalTimer = data.globalTimer;    
    lsdb.data.globalSequenceTimer = data.globalSequenceTimer;    
  }
  
  function filterTaskByTargetTime() {
    // 10 min threshold
    return tasks.filter(x => x.targetTime > 10*60*1000 && x.type != 'M');
  }
  
  function filterTaskByPath() {
    let filteredTasks = tasks.filter(x => x.type != 'M');
    
    if (lsdb.data.activeGroupId === '') {
      filteredTasks = filteredTasks.filter(x => x.parentId == '' || !x.parentId);
    } else {
      filteredTasks = filteredTasks.filter(x => x.parentId == lsdb.data.activeGroupId);
    }
    
    // sort by last starred
    filteredTasks.sort((a,b) => {
      if (typeof(b.lastStarredDate) == 'undefined') return -1;
  
      return a.lastStarredDate > b.lastStarredDate ? -1 : 1;
    });
      
    return filteredTasks;
  }
  
  function filterTaskByCollection() {
    
    let filteredTasks = tasks;
    
    let missionIds = compoMission.GetMissions();
      
    // sort by last starred
    missionIds.sort((a,b) => {
      return a.createdDate > b.createdDate ? 1 : -1;
    });
    missionIds.sort((a,b) => {
      let order = a.lastUpdatedDate > b.lastUpdatedDate ? -1 : 1;
      
      if (typeof(a.lastStarredDate) != 'number' && typeof(b.lastStarredDate) == 'number') {
        return 1;
      } else if (typeof(a.lastStarredDate) == 'number' && typeof(b.lastStarredDate) != 'number') {
        return -1;
      }
      
      return order;
    });
    
    if (lsdb.data.activeGroupId === '') {
      // filteredTasks = filteredTasks.filter(x => x.parentId == '' || !x.parentId);
      filteredTasks = missionIds.map(x => {
        return tasks.find(task => task.id == x.id);
      }).filter(x => typeof(x) == 'object');
    } else {
      filteredTasks = filteredTasks.filter(x => x.parentId == lsdb.data.activeGroupId);
      // filteredTasks = task;
    }
    
    return filteredTasks;
    
  }

  function sortTaskByTotalProgressTimeAsc(tasks) {
    tasks.sort((a, b) => {
      return (a.totalProgressTime + sumAllChildProgress(a.id)) < (b.totalProgressTime + sumAllChildProgress(b.id)) ? -1 : 1;
    });
  }

  async function TaskListTasksByThreshold() {
    
    let options = {
      isSortByTargetTime: true,
    };
    // let items = await TaskGetAllTasks(options);
    let items = filterTaskByTargetTime();
    if (options.isSortByTargetTime) {
      items.sort((a,b) => a.targetTime < b.targetTime ? 1 : -1)
      // sortTaskByTotalProgressTimeAsc(items);
    }
    return items;
  }
  
  async function TaskGetAllTasks(options) {
    
    // filter tasks
    let items = await filterListTask(options.isMissionView);
    
    // sort tasks
    if (options.isSortByTotalProgress) {
      sortTaskByTotalProgressTimeAsc(items);
    }
    
    return items;
  }

  async function TaskListTask() {
    
    let isMissionView = (lsdb.data.viewMode == 'mission');
  
    let totalRatio = 0;
    
    let docFrag = document.createDocumentFragment();
    let docFragCompleted = document.createDocumentFragment();
    let activeTimerDistance = await getActiveTimerDistance(); // minutes
    let activeTimerDistanceTime = await getActiveTimerDistanceTime(); // milliseconds
    let activeTask = await getActiveTask();
    let activeTaskPath = [];
    
    // get active task path
    {
      if (activeTask) {
        let parentId = activeTask.parentId;
        let group = lsdb.data.groups.find(x => x.id == parentId);
        while (group) {
          activeTaskPath.push(group.id);
          group = lsdb.data.groups.find(x => x.id == group.parentId);
        }
      }
    }
    
    // filter tasks
    let filteredTasks = await TaskGetAllTasks({
      isMissionView,
      isSortByTotalProgress: data.isSortByTotalProgress,
    })

    // let rankLabel = 1;
    for (let item of filteredTasks) {
      
      let liveProgress = 0;
      let liveProgressTime = 0;
      if (activeTask && item.id == activeTask.id) {
        liveProgress = activeTimerDistance;
        liveProgressTime = activeTimerDistanceTime;
      }
      
      let targetMinutesLeft = item.target - msToMinutes(item.progressTime) - liveProgress;
      let progressMinutesLeft = msToMinutes(item.progressTime);
    
      // get total ratio
      if (typeof(item.ratio) == 'number') {
        totalRatio += item.ratio;
      }
      
      // # set ratio time left string
      let ratioTimeLeftStr = '';
      
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
          totalProgressStr = `(${secondsToHMS(msToSeconds( totalProgressTime ))} total)`;
        }
      }
  
  
      let targetMinutesLeftStr = minutesToHoursAndMinutes(targetMinutesLeft);
      let fillData = {...item, ...{
        // targetString: minutesToHoursAndMinutes(item.target),
        // rankLabel: ` | Rank #${rankLabel}`,
        missionPath,
        ratio: ratioStr,
        ratioTimeLeftStr,
        totalProgressStr,
        targetString: (targetMinutesLeftStr.trim().length > 0 ? `${targetMinutesLeftStr} left` : ''),
        allocatedTimeString: minutesToHoursAndMinutes(item.target),
        progress: progressMinutesLeft ? minutesToHoursAndMinutes(progressMinutesLeft) : '0m',
      }};
  
  
      // set note progress time label
      if (fillData.note) {
        fillData.note.map(item => {
          if (item.totalProgressTime) {
            item.progressTimeLabel = minutesToHoursAndMinutes(msToMinutes(item.totalProgressTime))
          }
          return item;
        })
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
  
      // generate task element
    	let el = window.templateSlot.fill({
    	  data: fillData, 
    	  template: document.querySelector('#tmp-task').content.cloneNode(true), 
    	});
  
      // el.querySelector('.container-item').classList.toggle('is-child-task', typeof(fillData.parentId) == 'string');
  
      // set finish count label
      if (fillData.finishCount) {
        el.querySelector('.label-finish-count').textContent = `(${fillData.finishCountProgress} left)`;
      }
  
      // star button
      if (isMissionView && isTopPath) {
        let mission = compoMission.GetMissionById(item.id);
        if (mission) {
          let isStarred = (typeof(mission.lastStarredDate) == 'number');
          el.querySelector('.btn-star').classList.toggle('is-starred', isStarred);
        }
      } else {
        let isStarred = (typeof(item.lastStarredDate) != 'undefined');
        el.querySelector('.btn-star').classList.toggle('is-starred', isStarred);
      }
      
    	taskEl = el.querySelector('[data-obj="task"]');
    	taskEl.dataset.id = item.id;
    	setActiveSubTaskItem(taskEl, item);
    	if (item.untracked) {
    	  taskEl.stateList.add('--untracked');
    	}
    	
    	// todo: check active task path
    	if (activeTask) {
      	if (item.id == activeTask.id || activeTaskPath.includes(item.id)) {
      	  taskEl.stateList.add('--active');
      	}
    	}
    	
      if (isMissionView) {
    	  if (isTopPath) {
    	    taskEl.stateList.add('--is-mission');
          el.querySelector('.container-navigate-mission').classList.remove('d-none');
    	  } else {
          el.querySelector('.container-create-sub').classList.remove('d-none');
    	    let mission = compoMission.GetMissionById(item.id);
          if (mission) {
      	    taskEl.stateList.add('--is-mission');
          }  
    	  }
      } else {
  	    let mission = compoMission.GetMissionById(item.id);
        if (mission) {
    	    taskEl.stateList.add('--is-mission');
        }
      }
      
      
      if (lsdb.data.groups.find(x => x.id == item.id)) {
        el.querySelector('.container-navigate').classList.remove('d-none');
      } else {
        el.querySelector('.container-create-sub').classList.remove('d-none');
      }
    	el.querySelector('[data-role="progress-bar"]').style.width = percentageProgressTime+'%';
    	
    	
    	// # display sequence tasks
    	ui.RefreshListSequenceByTaskId(item.id, el.querySelector('[data-container="sequence-tasks"]'));
    	
    	if (fillData.type == 'M') {
        viewStateUtil.Add('task', ['collection-only'], el.querySelector('[data-view-group="task"]'));
      }
    	
    	if (item.isArchived) {
      	docFragCompleted.append(el);
    	} else {
    	  docFrag.append(el);
    	}
    	
      
    }
    
    $('#tasklist').innerHTML = '';
    $('#tasklist').append(docFrag);
    $('#tasklist-completed').innerHTML = '';
    $('#tasklist-completed').append(docFragCompleted);
    
    for (let el of $$('[data-container="sequence-tasks"]')) {
      new Sortable(el, {
        group: 'shared',
        handle: '.handle',
        animation: 150,
        onEnd: onEndSortSequence,
      });
    }
    
    // new Sortable($('#tasklist'), {
    //   group: 'shared',
    //   // handle: '.handle',
    //   sort: false,
    //   animation: 150,
    //   // onEnd: onEndSortSequence,
    // });
    
    await setActiveTask();
  }
  
  function onEndSortSequence(evt) {
    let taskId = evt.target.closest('[data-obj="task"]').dataset.id;
		UpdateNoteIndex(taskId, evt.oldIndex, evt.newIndex);
  }
  
  function UpdateNoteIndex(taskId, oldIndex, newIndex) {
    let task = compoTask.GetById(taskId);
    
    compoSequence.Stash(task.sequenceTasks);
    
    moveItemInArray(compoSequence.GetAll(), oldIndex, newIndex);
    
    compoSequence.Commit();
    
    appData.TaskStoreTask();
  }
  
  function moveItemInArray(array, oldIndex, newIndex) {
    if (oldIndex === newIndex || oldIndex < 0 || oldIndex >= array.length || newIndex < 0 || newIndex >= array.length) {
      // No change needed or invalid index
      return array;
    }
  
    // Remove the item from the old position
    const [movedItem] = array.splice(oldIndex, 1);
  
    // Insert the item at the new position
    array.splice(newIndex, 0, movedItem);
  
    return array;
  }
  
  async function TaskStopActiveTask() {
    
    document.body.stateList.remove('--timer-running');
    document.title = `DailyHeroes`;

    await clearAlarms();
    
    if (app.isPlatformAndroid) {
      androidClient.StopTimer();
    }
    
    let data = await window.service.GetData(['history', 'historyTime', 'start', 'activeTask']);
    if (data.start) {
      let distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
      let distanceTime = new Date().getTime() - data.start;
      await window.service.SetData({ 'history': data.history + distanceMinutes });
      await window.service.SetData({ 'historyTime': data.historyTime + distanceTime });
      await compoTimeStreak.TaskUpdateTaskTimeStreak(distanceTime, data.activeTask);
      
      let isUpdateCurrentActiveTask = true;
      
      // set active next sequence task
      let task = await getActiveTask();
      compoSequence.Stash(task.sequenceTasks);
      let sequenceTask = compoSequence.GetActive();
      
      if (sequenceTask) {
        
        // close sequence notif
        let seqNotifId = `${task.id}@${sequenceTask.id}`;
        let seqNotif = globalNotification[seqNotifId];
        if (seqNotif) {
          seqNotif.close();
          delete globalNotification[seqNotifId];
        }
        
        // update sequence progress time
        sequenceTask.progressTime += distanceTime;
        
        let isFinished = false;
        let changeTask = false;

        // reset sequence if finished
        if (sequenceTask.progressTime >= sequenceTask.targetTime) {
          sequenceTask.progressTime = 0;
          isFinished = true;
        }
        
        // repeat if set to repeat
        let isRepeat = (isFinished && sequenceTask.repeatCount > 0 && sequenceTask.counter.repeatCount < sequenceTask.repeatCount);
        
        if (isRepeat) {
          sequenceTask.counter.repeatCount += 1;
          changeTask = (sequenceTask.counter.repeatCount == sequenceTask.repeatCount);
        } else {
          if (isFinished) {
            changeTask = true;
          }
        }
        
        // set next active sequence task
        if (changeTask) {
          let nextItem = compoSequence.GetNext();
          compoSequence.SetActiveById(nextItem.id);  
          
          let seqIndex = compoSequence.GetIndexById(nextItem.id);
          if (seqIndex == 0 && compoSequence.CountAll() > 1) {
            compoSequence.ResetAllCounter();
          }
          
        }
        
        // update total progress linked task & apply ROP balancing
        if (sequenceTask.linkedTaskId) {
          isUpdateCurrentActiveTask = false;
          compoTask.AddTotalProgressByTaskId(sequenceTask.linkedTaskId, distanceTime);
        }
        
      }
      compoSequence.Commit();
      
      await compoTimeStreak.TaskCommit();
      
      // update progress active task & apply ROP balancing
      if (isUpdateCurrentActiveTask) {
        await updateProgressActiveTask(distanceMinutes, distanceTime);
      }
      
      // update active tracker
      updateActiveTrackerProgress(distanceTime);
      saveAppData();
      await appData.TaskStoreTask();
    } 
    
    
    await window.service.RemoveData(['start']);
    
    updateUI();
    ui.RefreshTimeStreak();
    uiTracker.RefreshItemList();
    
    if (window.modeChromeExtension) {
      await chrome.runtime.sendMessage({message: 'stop'});
    }
    
    app.TaskListTask();
    
  }
  
  function updateActiveTrackerProgress(distanceTime) {
    compoTracker.AppendProgressToActiveTracker(distanceTime);
    compoTracker.Commit();
  }
  
  function GetDataManager() {
    return lsdb;
  }
  
  async function ResetData() {
    
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      
      if (result.isConfirmed) {
        
        // clear app data
        lsdb.reset();
        localStorage.removeItem('alarm-audio-volume');
        await app.TaskRemoveAlarmAudio()
        
        // clear tasks in browser extension storage
  	    tasks.length = 0;
  	    await appData.TaskStoreTask();
        
        Swal.fire(
          'Deleted!',
          'Your file has been deleted.',
          'success',
        ).then(() => {
  	      location.reload();
        });
        
      }
      
    });
    
  }
  
  async function BackupData() {
	    
    let blob = await TaskExportDataToBlob();
    let url = URL.createObjectURL(blob);
    
    let el = document.createElement('a');
    el.href = url;
    el.download = `daily-heroes-backup-${new Date().getTime()}.json`;
    el.onclick = function() {
      el.remove();
    };
    document.body.append(el);
    el.click();
    
  }
  
  async function TaskExportDataToBlob() {
    let dataString = await getBackupDataJSON();
    let blob = new Blob([dataString], {type: 'application/json'});
    return blob;
  }
  
  async function TaskImportDataFromJSON(json) {
    try {
      let backupData = JSON.parse(json);
      await taskRestoreAppData(backupData);
    } catch (e) {
      console.error(e);
    }
  }
  
  async function UploadBackupFile() {
    
    let input = document.createElement('input');
    input.type ='file';
    input.onchange = function() {

      let r = new FileReader();
      r.onload = function(evt) {
        let fileTextContent = evt.target.result;
        TaskImportDataFromJSON(fileTextContent);
      };
      r.readAsText(this.files[0]);
      
    };
    document.body.append(input);
    input.click();
    input.remove();
    
  }
  
  async function taskRestoreAppData(backupData) {
    // todo : should provide logic to handle versioned backup data
    lsdb.data = backupData;
    
    if (SELF.isPlatformChromeExt) {
      // #  don't store tasks data on extension popup, use the browser extension's storage
      //    todo: should store other data in extension's storage too
      await window.service.SetData({ 'tasks': JSON.parse(JSON.stringify(lsdb.data.tasks)) });
      lsdb.data.tasks.length = 0; 
    }
    
    saveAppData();
    location.reload();
  }
  
  function saveAppData() {
    lsdb.save();
  }
  
  async function getBackupDataJSON() {
    
    let referenceSafeExportData = JSON.parse(JSON.stringify(lsdb.data));
    
    if (SELF.isPlatformChromeExt) {
      let data = await window.service.GetData(['tasks']);
      if (data.tasks) {
        referenceSafeExportData.tasks = data.tasks;
      }
    }
    
    return JSON.stringify(referenceSafeExportData);
  }
  
  async function ApplyProgressMadeOutsideApp() {
    if (!window.modeChromeExtension) return;
    
    let data = await chrome.storage.local.get(['taskProgressHistory']);
    
    if (data.taskProgressHistory === undefined) return;
    
    for (let historyData of data.taskProgressHistory) {
      // # apply progress made not directly within app; i.e. restarting task from notifications.
      // app.AddProgressTimeToRootMission(parentTaskId, historyData.progressTime);
      
      // # apply progress to active tracker
      updateActiveTrackerProgress(historyData.progressTime);
    }
    
    await chrome.storage.local.remove('taskProgressHistory');
    await appData.TaskStoreTask();
    appSettings.Save();
    
  }
  
  async function TaskStarTask(id) {
    if (isViewModeMission() && isTopMissionPath(id)) {
      // star in mission mode
      
      let mission = compoMission.GetMissionById(id);
      if (typeof(mission.lastStarredDate) == 'number') {
        delete mission.lastStarredDate;
      } else {
        mission.lastStarredDate = new Date().getTime();
      }
      mission.lastUpdatedDate = new Date().getTime();
      compoMission.Commit();
      lsdb.save();
    } else {
      // star in tasks mode
      
      let task = tasks.find(x => x.id == id);
      if (typeof(task.lastStarredDate) == 'number') {
        delete task.lastStarredDate;
      } else {
        task.lastStarredDate = new Date().getTime();
      }
      await appData.TaskStoreTask();
    }
    app.TaskListTask();
  }
  
  async function TaskAddProgressManually(id) {
    
    let task = tasks.find(x => x.id == id);
    if (!task) return;
    
    const { value: userVal } = await Swal.fire({
      title: 'Add progress manually (in minutes)',
      input: 'text',
      inputLabel: 'example : 10, 15, 30',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
      }
    });
    
    if (!userVal) return;
    
    try {
      let addedMinutes = parseInt(userVal);
      let addedTime = addedMinutes * 60 * 1000;
      task.progress += addedMinutes;
      task.progressTime += addedTime;
      task.totalProgressTime += addedTime;
      
      if (!
        (typeof(task.progress) == 'number' &&
        typeof(task.progressTime) == 'number' &&
        typeof(task.totalProgressTime) == 'number')
      ) {
        throw 'Failed, task data not valid';
      }
      
      task.progress = Math.max(0, task.progress);
      task.progressTime = Math.max(0, task.progressTime);
      task.totalProgressTime = Math.max(0, task.totalProgressTime);
      
      await taskApplyNecessaryTaskUpdates(task, addedMinutes * 60 * 1000);
      
      AddProgressTimeToRootMission(task.parentId, addedTime);
      
      await appData.TaskStoreTask(); 
      
      // update active tracker
      updateActiveTrackerProgress(addedTime);
      saveAppData();
      
      // ui update
      app.TaskListTask();
      uiTracker.RefreshItemList();
      
    } catch (e) {
      console.error(e);
      alert('Failed');
      return;
    }
    
  }
  
  function AddProgressTimeToRootMission(parentTaskId, progressTime) {
    try {
      let missionParentTask = getMissionRoots(parentTaskId);
      if (missionParentTask.length > 0) {
        missionParentTask.forEach(task => {
          task.progressTime += progressTime;
        });
      }
    } catch (e) { console.log(e); }
  }
  
  function getMissionRoots(taskId) {
    let missionsTask = [];
    let parentId = taskId;
    let safeLoopCount = 20;
    
    while (parentId != '') {
      
      let mission = compoMission.GetMissionById(parentId);
      if (mission) {
        let task = tasks.find(x => x.id == mission.id);
        missionsTask.push(task);
      }
      
      let task = tasks.find(x => x.id == parentId);
      if (!task) {
        break
      }
      parentId = task.parentId;

      safeLoopCount -= 1;
      if (safeLoopCount < 0) {
        break;
      }
    }
    
    return missionsTask;
  }
  
  async function TaskDeleteTask(id, taskEl, isBypassConfirm = false) {
  
    if (!isBypassConfirm) {
      let isConfirm = await ui.ShowConfirm();
      if (!isConfirm) return; 
      
    }
    
    let totalDeletedProgressTime = 0;
    
    let deleteIndex = tasks.findIndex(x => x.id == id);
    let parentTask = app.GetTaskById(tasks[deleteIndex].parentId);
    totalDeletedProgressTime += tasks[deleteIndex].totalProgressTime;
    tasks.splice(deleteIndex, 1);
    
    // delete group
    {
      let deleteIndex = lsdb.data.groups.findIndex(x => x.id == id);
      if (deleteIndex >= 0) {
        lsdb.data.groups.splice(deleteIndex, 1);
      }
    }
    
    // delete mission
    {
      let isExistsMission = compoMission.GetMissionById(id);
      if (isExistsMission) {
        compoMission.RemoveMissionById(id);
      }
    }
  
    // delete child task recurisively
    totalDeletedProgressTime += deleteAllChildTasksByParentId(id);
    // console.log(totalDeletedProgressTime)
    
    // put total progress time of deleted tasks into the parent progress
    if (parentTask) {
      parentTask.totalProgressTime += totalDeletedProgressTime;
    }
    
    await appData.TaskStoreTask();
    lsdb.save();
    
    await removeActiveTaskIfExists(id);
    taskEl.remove();
    updateUI();
  }
  
  async function Init() {
    
    await taskInitAppData();
    await loadTasks();
    await app.ApplyProgressMadeOutsideApp();
    await TaskListTask();
    ui.TaskSetActiveTaskInfo();
    ui.Init();
    updateUI();
    
    if (lsdb.data.viewMode == 'mission') {
      $('#tasklist-container').stateList.add('--view-mission');
    }
    
    $('#in-filter-search-label').value = window.lsdb.data.labelFilter;
    loadSearch();
    
    // web platform notification support
    setWebPlatformNotificationSupport();
    
    runTests();
    
  }
  
  function StopTestAlarmAudio() {
    if (!local.audioPlayer) return;
    
    local.audioPlayer.pause();
  }
  
  function GetAlarmVolume() {
    return data.alarmVolume;
  }
  
  async function taskInitAppData() {
    let result = window.service.GetData(['history']);
    if (typeof(result.history) == 'undefined') {
  	  await window.service.SetData({ 'history': 0 });
    }
    
    data.isViewTargetTimeOnly = lsdb.data.isFilterTaskByTargetTime;
    $('#labeled-by-showtarget').checked = data.isViewTargetTimeOnly;
    
    data.isSortByTotalProgress = lsdb.data.isSortByTotalProgress;
    $('#labeled-by-sortbyprogress').checked = data.isSortByTotalProgress;
    
    // timer setting
    data.globalTimer = lsdb.data.globalTimer;
    
    
    await taskRestoreComponentsData();
    
    compoTracker.Init(lsdb.data.compoTracker);
    
    // alarm volume 
    let alarmVolumePreferences = localStorage.getItem('alarm-audio-volume');
    if (alarmVolumePreferences !== null) {
      data.alarmVolume = parseFloat(alarmVolumePreferences);
    } 
  }
  
  async function taskRestoreComponentsData() {
    // google sign in
    {
      let data = appSettings.GetComponentData('compoGsiChrome');
      new Promise(async resolve => {
        await waitUntil(() => {
          return (typeof(compoGsiChrome) != 'undefined');
        }, 100);
        compoGsiChrome.InitData(data);
        resolve();
      });
    }
    
    // missions
    {
      compoMission.Init();
      uiCollection.ReloadList();
    }
    
    // time streak
    {
      if (window.modeChromeExtension) {
        let data = await chrome.storage.local.get(['lastActiveId', 'totalTimeStreak']);
        compoTimeStreak.Init(data);
      } else {
        let data = appData.GetComponentData('compoTimeStreak');
        compoTimeStreak.Init(data);
      }
    }
  }
  
  function waitUntil(stateCheckCallback, delay = 100) {
    return new Promise(resolve => {
        let interval = window.setInterval(() => {
        let shouldResolve = stateCheckCallback();
        if (shouldResolve) {
            window.clearInterval(interval);
            resolve();
        }
        }, delay);
    });
  }
  
  async function runTests() {
    // return;
    // let $$ = document.querySelectorAll.bind(document);
    
    // # change initial screens
    // viewStateUtil.Set('screens', ['settings']);
    // viewStateUtil.Set('screens', ['priority-mapper']);
    
    // ui.OpenByThreshold()
    
    /*
    await waitUntil(() => {
      return compoPriorityMapper;
    });
    ui.OpenPriorityMapper();
    // */
    
    // await waitForElement('[data-role="edit"]');
    // Array.from($$('[data-role="edit"]')).pop().click();
  }
  
  function waitForElement(selector) {
    return new Promise(resolve => {
        let interval = window.setInterval(() => {
          if ($(selector)) {
              window.clearInterval(interval);
              resolve();
          }
        }, 100);
    });
  }
  
  function setWebPlatformNotificationSupport() {
    
    if (!SELF.isPlatformWeb) return;
    
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
      setAppNotificationFeature(true);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          setAppNotificationFeature(true);
        }
      });
    }
    
  }
  
  function setAppNotificationFeature(isCanNotify) {
    SELF.isCanNotify = isCanNotify;
  }
  
  function getActionRole(el) {
    return (el.matches('[data-role]') ? el.dataset.role : '');
  }
  
  async function TaskClickHandler(evt, el) {

    let actionRole = getActionRole(el);
    let parentEl = el.closest('[data-obj="task"]');
    let seqEl = el.closest('[data-kind="item-sequence-task"]');
    let id = parentEl.dataset.id;
    let seqId = seqEl ? seqEl.dataset.id : null;
    
    let seqTitleEl = evt.target.closest(['[data-closest="title"]']);
    if (seqTitleEl) {
      compoTask.FocusSequenceById(id, seqId);
      return;
    }

    switch (actionRole) {
      case 'add-to-sequence': ui.TaskLinkTaskWithIdToActiveSequence(id); break;
      case 'move-to-sequence': ui.TaskMoveTaskWithIdToActiveSequence(id); break;
      case 'save-to-collection': ui.TaskSaveTaskWithIdToSequence(id); break;
      case 'pick-collection': ui.PickCollection(); break;
      case 'reset-count-active-seq': compoTask.TaskResetSequenceCountByTaskId(id); break;
      case 'manage-sequence': ui.ToggleManageSequenceByTaskId(id); break;
      case 'toggle-expand-sequence-task': ui.ToggleExpandSequenceTask(id); break;
      case 'link-task-to-sequence-interactive-mode': ui.TaskLinkTaskToSequenceByTaskIdInteractiveMode(id); break;
      case 'add-sequence-task': ui.AddSequenceTask(id); break;
      case 'delete-sequence-task': 
        compoTask.TaskDeleteSequenceById(id, seqId); 
        ui.RemoveElSequenceById(seqId, id);
        ui.HotReloadListSequenceByTaskId(id);
      break;
      case 'edit-sequence-task': ui.EditSequenceTask(id, seqId); break;
      case 'navigate-mission': 
        viewStateUtil.RemoveAll('screens');
        viewStateUtil.Add('screens', ['home']);
        
        await app.TaskNavigateToMission(id); 
        ui.FocusTaskById(id);
        
        break;
      case 'navigate-sub':
        ui.Navigate(id);
        app.TaskListTask();
        break;
      case 'edit': editTask(id); break;
      case 'star-task': app.TaskStarTask(id); break;
      case 'delete': app.TaskDeleteTask(id, parentEl); break;
      case 'set-ratio': taskSetTaskRatio(id); break;
      case 'add-label': TaskAddLabel(id); break;
      case 'add-sub-timer': addSubTimer(id); break;
      case 'add-progress-minutes': await app.TaskAddProgressManually(id); break;
      case 'set-active': switchActiveTask(parentEl, id); break;
      case 'remove-mission': app.TaskAddToMission(id, parentEl); break;
      case 'add-to-mission': app.TaskAddToMission(id, parentEl); break;
      case 'set-target': await setTaskTarget(id); break;
      case 'archive':
        let activeTask = await getActiveTask();
        if (activeTask && activeTask.id == id) {
          await TaskStopActiveTask();
        }
        await taskArchiveTask(id);
        await removeActiveTaskIfExists(id);
        updateUI();
      break;
      case 'unarchive': await taskUnarchive(id); break;
      case 'restart': 
        await compoTask.ResetProgressById(id); 
        await appData.TaskStoreTask();
        await TaskListTask();  
      break;
      case 'take-note': showModalNote(id); break;
      case 'start': await StartTaskTimer(parentEl, id); break;
      case 'stop': await app.TaskStopActiveTask(); break;
        
      // notes
      case 'rename-sub-task': renameNote(id, el); break;
      case 'start-sub-task':
        await fixMissingNoteId(id, el); await setSubTask(id, el); break;
      case 'delete-note': deleteNote(id, el); break;
    }
    
  }
  
  async function editTask(taskId) {
    let task = await app.getTaskById(taskId);
    let {id, parentId, title, target, targetTime, finishCount, type} = task;
    let modalData = {
      readOnlyId: id,
      formData: {
        id,
        title,
        target: minutesToHoursAndMinutes(target),
        targetTime: minutesToHoursAndMinutes(msToMinutes(targetTime)),
        finishCount,
        parentId,
        taskType: type,
      }
    };
    ui.ShowModalAddTask(modalData);
  }
  
  function GetTaskById(id) {
    return compoTask.GetById(id);
  }
  
  async function TaskUpdateTask(form) {
    let task = tasks.find(x => x.id == form.id.value);
    task.title = form.title.value;
    task.target = parseHoursMinutesToMinutes(form.target.value);
    task.targetTime = parseHoursMinutesToMinutes(form.targetTime.value) * 60 * 1000;
    task.finishCount = parseInt(form['finishCount'].value);
    task.finishCountProgress = parseInt(form['finishCount'].value);
    task.parentId = form['parent-id'].value;
    return task;
  }
  
  function SyncGroupName(id, newTitle, parentId) {
    let group = lsdb.data.groups.find(x => x.id == id);
    if (!group) return;
    
    group.name = newTitle;
    group.parentId = parentId;
    lsdb.save();
  }
  
  async function TaskAddTask(form)  {
    
    if (form.title.value.trim().length == 0) {
      return;
    }
    
    let targetVal = form.target.value;
    if (isNumber(targetVal)) {
      // set default to minutes
      targetVal = `${targetVal}m`;
    }
  
    let taskId;
    try {
      let parentId = form['parent-id'].value;
      taskId = addTaskData({
        title: form.title.value,
        target: parseHoursMinutesToMinutes(targetVal),
        targetTime: parseHmsToMs(form.targetTime.value),
        parentId: parentId ? parentId : '',
        type: form.taskType.value,
      });
      
      if (parentId) {
        let parentTask = await app.GetTaskById(parentId);
        await checkAndCreateGroups(parentTask.title, parentId);
      }
    } catch (e) {
      console.error(e);
      alert('Failed.');    
      return;
    }
    
    return taskId;
    
  }
  
  function checkAndCreateGroups(title, id) {
    let data = lsdb.data.groups.find(x => x.id == id);
    if (!data) {
      let group = lsdb.new('groups', {
        id,
        name: title,
        parentId: lsdb.data.activeGroupId,
      });
      lsdb.data.groups.push(group);
      lsdb.save();
    } else {
      console.log('exists');
    }
  }
  
  function addTaskData(inputData) {
  
    let id = generateUniqueId();
    let data = {...lsdb.new('task', {
      id,
    }), ...inputData};
    tasks.push(data);
    
    return id;
  }
  
  return SELF;
  
})();