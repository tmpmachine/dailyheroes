let tasks = [];

let storageName = 'appdata-NzkwMTI0NA';
window.lsdb = new Lsdb(storageName, {
  root: {
    viewMode: 'tasks',
    
    start: null,
    history: 0,
    historyTime: 0,
    activeTask: '',
    
    // navigation
    activeGroupId: '',
    topMostMissionPath: '',
    
    search: '',
    labelFilter: '',
    scheduledTime: 0,
    tasks: [],
    missionIds: [],
    groups: [],
    isSortByTotalProgress: true,
    
    // component's data
    compoMission: {},
    
  },
  groups: {
    id: '',
    name: '',
    parentId: '',
  }
});


window.modeChromeExtension = false;
try {
  if (chrome.storage.local.get) {
    window.modeChromeExtension = true;
  }
} catch (e) {}

if (window.modeChromeExtension) {
  window.service = window.serviceChrome;
} else {
  document.body.classList.add('is-platform-web')
}


window.listenOn=function(e,t,l){for(let n of document.querySelectorAll(e))n.addEventListener(t,l[n.dataset.callback])};

function copyToClipboard(text) {
  var node  = document.createElement('textarea');
  node.value = text;
  document.body.append(node);
  node.select();
  node.setSelectionRange(0, node.value.length);
  document.execCommand("copy");
  node.remove();
  
  alert('Copied to clipboard');
}

function exportTasks() {
  // let listTaskStringExport = tasks.map(task => `- [ ] 1 PM | ${task.title} (${minutesToHoursAndMinutes(task.target)})`).join('\n');
  let dataString = JSON.stringify(tasks, null, 2);
  copyToClipboard(dataString);
}

function generateUniqueId() {
  // Generate a random 8 character string
  const randomString = Math.random().toString(36).substring(2, 10);
  
  // Get the current timestamp in milliseconds
  const timestamp = Date.now();
  
  // Combine the random string and the timestamp to create a unique ID
  const uniqueId = `${randomString}${timestamp}`;
  
  return uniqueId;
}

function parseList(list) {
  const parsedList = [];

  for (const item of list) {
    const [time, info] = item.split(" | ");
    const [title, duration] = info.split(" (");

    parsedList.push({
      title,
      duration: duration.replace(")", ""),
      time,
    });
  }

  return parsedList;
}

function calculateMinutesUntilTime(timeStr) {
  
  // Split the time string into hours, minutes, and AM/PM
  const [hours, minutes = "00", meridian] = timeStr.trim().match(/(\d{1,2})(?::(\d{2}))?\s*([AP]M)/).slice(1);


  // Convert hours to 24-hour format if necessary
  let hours24 = parseInt(hours, 10);
  if (meridian === "PM" && hours24 !== 12) {
    hours24 += 12;
  } else if (meridian === "AM" && hours24 === 12) {
    hours24 = 0;
  }

  // Calculate the duration in minutes
  const inputMinutes = hours24 * 60 + parseInt(minutes, 10);
  
  // Get the current time in minutes
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Calculate the difference in minutes between the input time and current time
  let difference = inputMinutes - currentMinutes;
  
  // If the input time is earlier than the current time, add a day's worth of minutes
  if (difference < 0) {
    difference += 24 * 60;
  }
  
  return difference;
}

function timeStringToMinutes(timeStr) {
  try {
    const [hours, minutes = "00", meridian] = timeStr.trim().match(/(\d{1,2})(?::(\d{2}))?\s*([AP]M)/).slice(1);
    // Convert hours to 24-hour format if necessary
    let hours24 = parseInt(hours, 10);
    if (meridian === "PM" && hours24 !== 12) {
      hours24 += 12;
    } else if (meridian === "AM" && hours24 === 12) {
      hours24 = 0;
    }
  
    // Calculate the duration in minutes
    const totalminutes = hours24 * 60 + parseInt(minutes, 10);
    return totalminutes;
  } catch (e) {
    
  }
  return null;
}

async function setTimerByMinutes(minutes) {
  await setTimer(minutes * 60 * 1000);
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
    if (triggerTime - 3 * aMinute * milliseconds > 0) {
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

async function clearTaskHistory() {
  for (let task of tasks) {
    task.progress = 0;
    task.progressTime = 0;
  }
  await storeTask();
}

async function clearTaskTotalProgressTime() {
  for (let task of tasks) {
    task.totalProgressTime = 0;
    if (task.note) {
      for (let note of task.note) {
        note.totalProgressTime = 0;
      }
    }
  }
  await storeTask();
}

function partialUpdateUITask(id, task) {
  let el = $(`[data-obj="task"][data-id="${id}"]`);
  el.querySelector('[data-slot="title"]').textContent = task.title;
}

function CheckAndCreateGroups(title, id) {
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

function isNumber(input) {
  return /^[0-9]+$/.test(input);
}

function addTaskData(inputData) {
  let id = generateUniqueId();
  let data = {...{
    id,
    progress: 0,
    progressTime: 0,
    totalProgressTime: 0,
    
    // used by time balancing
    targetTime: 0,
    ratio: 0,

    lastUpdated: 0,
    untracked: false,
    activeSubTaskId: null,
  }, ...inputData};
  
  // if (data.parentId) {
    // let parentTaskIndex = tasks.findIndex(x => x.id == data.parentId);
    // tasks.splice(parentTaskIndex + 1, 0, data);
  // } else {
    tasks.splice(0, 0, data);
  // }
  
  return id;
}
      
async function storeTask() {
  await window.service.SetData({ 'tasks': tasks });
}
      

async function TaskSetActiveTaskInfo() {
  $('#txt-active-task-name').textContent = '';
  
  let activeTask = await getActiveTask();
  if (activeTask) {
    
    let ratioTimeLeftStr = '';
    let ratioTimeLeft = timeLeftRatio.find(x => x.id == activeTask.id);
    if (ratioTimeLeft && ratioTimeLeft.timeLeft > 0) {
      ratioTimeLeftStr = `<mark>${minutesToHoursAndMinutes(ratioTimeLeft.timeLeft)}</mark>`;
    }
    
    $('#txt-active-task-name').innerHTML = `${activeTask.title} ${ratioTimeLeftStr}`;
  }
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

async function stopTimer() {
  document.body.stateList.remove('--timer-running');
  await clearAlarms();
  
  if (app.isPlatformAndroid) {
    androidClient.StopTimer();
  }
  
  let data = await window.service.GetData(["history", "historyTime", "start"]);
  if (data.start) {
    let distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
    let distanceTime = new Date().getTime() - data.start;
    await window.service.SetData({ 'history': data.history + distanceMinutes });
    await window.service.SetData({ 'historyTime': data.historyTime + distanceTime });
    await updateProgressActiveTask(distanceMinutes, distanceTime);
  }
  await window.service.RemoveData(['start']);
  
  updateUI();
  if (window.modeChromeExtension) {
    await chrome.runtime.sendMessage({message: 'stop'});
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

async function startOrRestartTask() {
  let task = await getActiveTask();
  if (!task) return;
  
  await stopTimer();
  await app.TaskContinueTask(task.id);
  await startCurrentTask(task.id);
}

async function finishTimer() {
  let task = await getActiveTask();
  if (!task) return;

  await stopTimer();
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
    // uiComponent.updateProgressBar();
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
  updateCountdownText(countdownStr, isNegative);
  
  let percentage = ( currentTime - startTime ) / ( scheduledTime - startTime ) * 100;
  $('.NzE2ODYyNQ-progress-bar-fill').style.width = `${percentage}%`;
  
  // is task finished, perform once.
  if (isNegative) {
    
    // ended few milliseconds ago
    if (distance < 1000) {
      sendNotification();
      uiComponent.TurnOnScreen();
    }
    
    // stop updating the timer, it's ended by background script
    if (app.isPlatformChromeExt) {
      clearInterval(countdonwIntervalId);
    }
    
  }
  
  let distanceMinutes = Math.floor((currentTime - startTime) / (60 * 1000));
  let distanceTime = currentTime - startTime;
  updateProgressPercentage(startTime);
  
  let activeTask = await getActiveTask();
  if (activeTask) {
    uiComponent.updateTaskProgressBar(activeTask.id);
  }
}


async function sendNotification() {
  if (!app.isCanNotify) return;
  
  let task = await getActiveTask();
  
  let notification = new Notification("Time's up!", {
      body: `Task : ${task.title}`,
      requireInteraction: true
  });
  
  notification.onclick = function () {
    window.focus();
    notification.close();
  };
  
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

async function initData() {
  let result = window.service.GetData(['history']);
  if (typeof(result.history) == 'undefined') {
	  await window.service.SetData({ 'history': 0 });
  }
}

function attachListeners() {
  window.listenOn('.clickable', 'click', window.DOMEvents.clickable);
  window.listenOn('.submittable', 'submit', window.DOMEvents.submittable);
  window.listenOn('.inputable', 'input', window.DOMEvents.inputable);
  window.listenOn('.changeable', 'change', window.DOMEvents.changeable);
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

function navigate2x2GridButtons(buttons) {
  let index = 0;

  function handleKeyDown(event) {
    let isContained = false;
    const key = event.key;
    
    buttons.forEach((element) => {
      if (element.contains(event.target)) {
        isContained = true;
      }
    });
    if (!isContained) {
      
      if (key == 'ArrowUp' && event.target.matches('[data-callback="stop-timer"]')) {
        buttons.forEach((element) => {
          if (element.matches('[data-time="25"]')) {
            // isContained = true;
            element.focus();
          }
        }); 
      }
      
      return;
    }
    
    if (key === 'ArrowRight') {
      index = (index + 1) % buttons.length;
      event.preventDefault();
    } else if (key === 'ArrowLeft') {
      index = (index - 1 + buttons.length) % buttons.length;
      event.preventDefault();
    } else if (key === 'ArrowUp' && index >= 2) {
      index = (index - 2) % buttons.length;
      event.preventDefault();
    } else if (key === 'ArrowDown' && index <= 1) {
      index = (index + 2) % buttons.length;
      event.preventDefault();
    }
  
    buttons[index].focus();
  }


  document.addEventListener('keydown', handleKeyDown);
}

const buttons = document.querySelectorAll('#preset-button button');
navigate2x2GridButtons(buttons);

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

function msToMinutes(milliseconds) {
  return Math.floor(milliseconds / 60000);
}

async function TaskListTask() {
  await listTask();
}

async function listTask() {
  await app.TaskListTask();
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
    
    let breadcrumbs = []
    
    let activeGroup = lsdb.data.groups.find(x => x.id == groupId)
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
        ratioTimeLeftStr = `<mark>${minutesToHoursAndMinutes(ratioTimeLeft.timeLeft)}</mark>`;
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
    
    uiComponent.updateUI(isRunning);
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

function changeViewModeConfig(mode) {
  lsdb.data.topMostMissionPath = '';
  lsdb.data.viewMode = mode;
  uiComponent.UpdateViewModeState();
}

function saveConfig() {
  lsdb.save();
}

function resetActiveGroupId() {
  lsdb.data.activeGroupId = '';
}

async function taskNavigateToMission(id) {
  let task = await app.GetTaskById(id);
  if (!task) return;
  
  changeViewModeConfig('tasks');
  saveConfig();
  uiComponent.Navigate(task.parentId);
  listTask();
}

function taskAddToMission(id, parentEl) {
  let isExists = compoMission.IsExistsMissionId(id)
  if (isExists) {
    // remove from mission
    compoMission.RemoveMissionById(id);
    parentEl.stateList.remove('--is-mission');
    if (isViewModeMission()) {
      parentEl.remove();
    }
  } else {
    // add to mission
    let missionData = {
      id,
      lastStarredDate: null,
      lastUpdatedDate: new Date().getTime(),
      createdDate: new Date().getTime(),
    };
    compoMission.AddMission(missionData);
    parentEl.stateList.add('--is-mission');
  }

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
        compoMission.RemoveMissionById(id)
      }
    }
    
    totalDeletedProgressTime += deleteAllChildTasksByParentId(id);
  }
  return totalDeletedProgressTime;
}



async function taskApplyAllParentTargetTime(parentId, distanceTime) {
  let task = app.GetTaskById(parentId);
  while (task) {
    if (task.ratio > 0) {
      await TaskApplyTargetTimeBalanceInGroup(task, distanceTime);
    }
    task = app.GetTaskById(task.parentId);
  }
}

async function TaskApplyTargetTimeBalanceInGroup(task, addedTime) {
  try {
      let excessTime = task.targetTime - addedTime;
      if (excessTime < 0) {
        await applyTargetTimeBalanceInGroup(task, Math.abs(excessTime));
      }
      task.targetTime = Math.max(0, task.targetTime - addedTime);
    } catch (e) {
      console.error(e);
  }
}

async function applyTargetTimeBalanceInGroup({id, parentId, ratio, targetMinutes}, addedTime) {

  if (typeof(ratio) != 'number') return;
  
  let filteredTasks = tasks.filter(task => ( task.parentId == parentId && typeof(task.ratio) == 'number' && task.id != id ) );

  let remainingRatio = 100 - ratio;
  let timeToDistribute = ( addedTime *  ( remainingRatio / 100 ) ) / ( ratio / 100 );

  for (let task of filteredTasks) {
    let addedTargetTime = Math.round(timeToDistribute * (task.ratio / remainingRatio));
    task.targetTime = addOrInitNumber(task.targetTime, addedTargetTime);
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
      title: 'Priority Ratio',
      input: 'text',
      inputLabel: 'example: 10, 25, 50',
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
  await storeTask();
  app.TaskListTask();
}

async function TaskAddLabel(id) {
  let task = tasks.find(x => x.id == id);
  if (!task) return;
  
  let label = window.prompt('Label', task.label);
  if (!label) return;
  
  task.label = label;
  await storeTask();  
}

async function startTaskTimer(parentEl, id) {
  await stopTimer();
  await switchActiveTask(parentEl, id, true);
  await app.TaskContinueTask(id);
  await startCurrentTask(id);
}

async function switchActiveTask(taskEl, id, persistent = false) {
  
  let activeTask = await getActiveTask();
  
  // switch task
  if (activeTask) {
    if (id == activeTask.id && !persistent) {
      await removeActiveTask();
      disableAllActive();
      uiComponent.updateTaskProgressBar(id, false);
    } else {
      uiComponent.updateTaskProgressBar(activeTask.id, false);
      await window.service.SetData({'activeTask': id});
      disableAllActive();
      taskEl.stateList.add('--active');
      await uiComponent.updateTaskProgressBar(id);
      
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
  let defaultVal = {
    parentId: taskId,
  };
  uiComponent.ShowModalAddTask(defaultVal);
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
  await storeTask();
  let taskEl = $(`[data-kind="task"][data-id="${task.id}"]`);
  $('#tasklist-completed').append(taskEl);
}

async function taskUnarchive(id) {
  let task = tasks.find(x => x.id == id);
  task.isArchived = false;
  // task.progress = 0;
  // task.progressTime = 0;
  // task.finishCountProgress = task.finishCount;
  await storeTask();
  await app.TaskListTask();  
  loadSearch();
}

// todo: rename to archive
async function finishTask(id) {
  let task = tasks.find(x => x.id == id);
  task.progress = task.target;
  task.progressTime = task.target * 60 * 1000;
  await storeTask();
  let taskEl = $(`[data-kind="task"][data-id="${task.id}"]`);
  $('#tasklist-completed').append(taskEl);
}

async function restartTask(id) {
  let task = tasks.find(x => x.id == id);
  task.progress = 0;
  task.progressTime = 0;
  task.finishCountProgress = task.finishCount;
  await storeTask();
  await app.TaskListTask();  
  loadSearch();
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
  await storeTask();
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
  uiComponent.SetFocusEl(modal.querySelector('input[type="text"]'));
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
  await storeTask();
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
  await storeTask();
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
  await storeTask();
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
  await storeTask();
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

async function startCurrentTask(id) {
  let task = tasks.find(x => x.id == id);
  if (task.progress >= task.target) return;
  
  // accumulates child task progress
  // let totalMsProgressChildTask = tasks.filter(x => x.parentId == id).reduce((total, item) => total+item.totalProgressTime, 0);

  // setTimer(task.target * 60 * 1000 - task.progressTime - totalMsProgressChildTask);
  let seconds = (task.target * 60 * 1000 - task.progressTime) / 1000;
  androidClient.StartTimer(seconds, task.title);
  setTimer(task.target * 60 * 1000 - task.progressTime);
}

async function setTaskTarget(id) {
  
  let task = tasks.find(x => x.id == id);
  
  const { value: userVal } = await Swal.fire({
      title: 'Set mission target',
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
  await storeTask();
  await app.TaskListTask();  
  await updateUI();
  loadSearch();
}

async function splitTask(id) {
  let title = window.prompt('task title');
  if (!title) return;
  let target = window.prompt('target (hours minutes)');
  if (!target) return;
  
  try {
    addTaskData({
      title,
      target: parseHoursMinutesToMinutes(target),
    });
  } catch (e) {
    console.error(e);
    alert('Failed.');    
    return;
  }
  
  let task = tasks.find(x => x.id == id);
  task.target = Math.max(0, task.target - parseHoursMinutesToMinutes(target));
  
  await storeTask();
  listTask();  
}

function untrackProgress(id) {
  let task = app.getTaskById(id);
  task.untracked = true;
  updateUI();
  storeTask();
}

function trackProgress(id) {
  let task = app.getTaskById(id);
  task.untracked = false;
  updateUI();
  storeTask();
}

async function editTask(taskId) {
  let task = await app.getTaskById(taskId);
  let {id, parentId, title, target, finishCount} = task;
  let defaultVal = {
    id,
    title,
    target: minutesToHoursAndMinutes(target),
    finishCount,
    parentId,
  };
  uiComponent.ShowModalAddTask(defaultVal);
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
      
      await storeTask();
      
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
  if (task.ratio > 0) {
    await TaskApplyTargetTimeBalanceInGroup(task, distanceTime);
  }
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
  return task.note.find(x => x.id == subId)
}

function disableAllActive() {
  let taskEls = qsa('#tasklist-container [data-obj="task"]');
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

function getActionRole(el) {
  return (el.matches('[data-role]') ? el.dataset.role : '');
}

function getObjEl(id) {
  let els = document.querySelectorAll(`[data-obj="${id}"]`);
  if (els.length > 0) {
    if (els.length > 1) {
      console.error(`Found ${els.length} elements with [data-obj="${id}"]. Returning the first one`);
    }
    return els[0];
  }
  return null;
}

function minutesToTimeString(timeInMinutes) {
  const hours = Math.floor(timeInMinutes / 60);
  const minutes = timeInMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";

  // Convert to 12-hour clock
  const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  return `${('00'+formattedHours).slice(-2)}:${('00'+formattedMinutes).slice(-2)} ${period}`;
}

function parseHoursMinutesToMinutes(timeString) {
  if (!timeString) {
    return null;
  }
  
  const regex = /^(\d+h)?(\d+m)?$/;
  const match = regex.exec(timeString);
  
  let hours = 0;
  let minutes = 0;
  
  if (match[1]) {
    hours = parseInt(match[1].slice(0, -1));
  }
  
  if (match[2]) {
    minutes = parseInt(match[2].slice(0, -1));
  }
  
  return (hours * 60) + minutes;
}

function RatioSettings() {
  let currentSettings = localStorage.getItem('ratio-label-settings') || 'main';
  let label = window.prompt('Labels to check', currentSettings);
  if (!label) return;
  
  localStorage.setItem('ratio-label-settings', label);
}

let timeLeftRatio = [];



function getGroupById(id) {
  return lsdb.data.groups.find(x => x.id == id)
}


function getTotalProgressTimeByParentId(parentId) {
  
  let taskIds = [];
  let total = tasks.reduce((a, b) => {
    if (b.parentId == parentId) {
      taskIds.push(b.id);
      return a + b.totalProgressTime;
    }
    return a;
  }, 0);
  
  // count until last child
  for (let id of taskIds) {
    total += getTotalProgressTimeByParentId(id);    
  }
  
  return total;
}

async function taskOpenTaskIntoView() {
  let activeTask = await getActiveTask();
  if (!activeTask) return;
  
  lsdb.data.viewMode = 'tasks';
  lsdb.save();
  uiComponent.Navigate(activeTask.parentId);
  await app.TaskListTask();
}
  



let app = (function () {

  let SELF = {
    isPlatformAndroid: ( typeof(MyApp) != 'undefined' ),
    isPlatformChromeExt: window.modeChromeExtension,
    isPlatformWeb: ( !window.modeChromeExtension && typeof(MyApp) == 'undefined' ),
    isCanNotify: false,
    
    Init,
    TaskClickHandler,
    GetDataManager,
    ResetData,
    BackupData,
    UploadBackupFile,
    
    GetTaskById,
    getTaskById: GetTaskById,
    TaskAddTask,
    TaskUpdateTask,
    TaskDeleteTask,
    TaskStarTask,
    TaskAddProgressManually,
    
    AddProgressTimeToRootMission,
    TaskStopActiveTask,
    TaskListTask,
    TaskContinueTask,
    
    // app init
    ApplyTaskProgressHistoryToMissionRoot,
  };
  
  async function TaskContinueTask(id) {
    let task = tasks.find(x => x.id == id);
    if (task.progressTime < task.target * 60 * 1000) {
      return;
    }
    task.progress = 0;
    task.progressTime = 0;
    task.finishCountProgress = task.finishCount;
    await storeTask();
    await app.TaskListTask();  
    loadSearch();
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
    
    // if (lsdb.data.isSortByTotalProgress) {
    //   tasks.sort((a, b) => a.totalProgressTime > b.totalProgressTime ? -1 : 1);
    // }
    
    // todo: set to filtered tasks
    let filteredTasks = tasks;
    
    if (isMissionView) {
      
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
      
    } else { 
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
    }
  
    
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
      let totalMsProgressChildTask = 0;
    
      // get total ratio
      if (typeof(item.ratio) == 'number') {
        totalRatio += item.ratio;
      }
      
      // accumulates child task progress
      {
        // totalMsProgressChildTask = tasks.filter(x => x.parentId == item.id).reduce((total, item) => total+item.totalProgressTime, 0);
        // let totalChildTaskProgressMinutes = msToMinutes(totalMsProgressChildTask);
        // targetMinutesLeft -= totalChildTaskProgressMinutes;
        // progressMinutesLeft += totalChildTaskProgressMinutes;
      }
      
      // # set ratio time left string
      let ratioTimeLeftStr = '';
      // let ratioTimeLeft = timeLeftRatio.find(x => x.id == item.id);
      // if (ratioTimeLeft && ratioTimeLeft.timeLeft > 0) {
      //   ratioTimeLeftStr = `<mark>${minutesToHoursAndMinutes(ratioTimeLeft.timeLeft)}</mark>`;
      // }
      
      // ## handle if self task
      if (item.ratio > 0)
      {
        {
          let targetTime = item.targetTime;
          if (activeTask && activeTask.id == item.id) {
            targetTime = Math.max(0, targetTime - activeTimerDistanceTime);
          }
          if (targetTime > 0) {
            ratioTimeLeftStr = `<mark>${minutesToHoursAndMinutes(msToMinutes(targetTime))}</mark>`;
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
            ratioTimeLeftStr = `<mark>${minutesToHoursAndMinutes(msToMinutes(targetTime))}</mark>`;
          }
          
        }
      
      }
      
      // show mission path
      let missionPath = '';
      let ratioStr = item.ratio ? `${item.ratio}%` : '';
      let isTopPath = isTopMissionPath(item.id);
      if (isMissionView && isTopPath) {
        ratioStr = '';
        missionPath = getAndComputeMissionPath(item.parentId);
      }
      
      // show total task progress (self + child tasks)
      let totalProgressStr = '';
      let totalProgressMinutes = msToMinutes(item.totalProgressTime);
      {
        let totalMsProgressChildTask = sumAllChildProgress(item.id);
        totalProgressStr = `(${minutesToHoursAndMinutes( totalProgressMinutes + msToMinutes(totalMsProgressChildTask) )} total)`;
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
        percentageProgress = Math.min(100, Math.floor((msToMinutes(item.progressTime + totalMsProgressChildTask) + liveProgress)/item.target*10000)/100);
        percentageProgressTime = Math.min(100, Math.floor((item.progressTime + liveProgressTime + totalMsProgressChildTask) / minutesToMs(item.target) * 10000) / 100);
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
    	
    	
    	/* obsolete feature
    	
    	// handle completed task
    	let isCompleted = false;
      if (item.progressTime + liveProgressTime >= minutesToMs(item.target)) {
        isCompleted = true;
      }
    	if (isCompleted) {
    	  docFragCompleted.append(el);
    	}
    	*/
    	
    	if (item.isArchived) {
      	docFragCompleted.append(el);
    	} else {
    	  docFrag.append(el);
    	}
  
  
      // rankLabel++;
      
    }
    
    if (isMissionView && lsdb.data.activeGroupId == '') {
      $('#txt-total-ratio').textContent = '';
    } else {
      $('#txt-total-ratio').textContent = 'Allocation : ' + totalRatio + '%';
    }
    
    $('#tasklist').innerHTML = '';
    $('#tasklist').append(docFrag);
    $('#tasklist-completed').innerHTML = '';
    $('#tasklist-completed').append(docFragCompleted);
    
    await setActiveTask();
  }
  
  async function TaskStopActiveTask() {
    await stopTimer();
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
        lsdb.reset();
  	    tasks.length = 0;
  	    await storeTask();
        
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
	    
    let dataString = await getBackupDataJSON();
    let blob = new Blob([dataString], {type: 'application/json'});
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
  
  async function UploadBackupFile() {
    
    let input = document.createElement('input');
    input.type ='file';
    input.onchange = function() {

      let r = new FileReader();
      r.onload = function(evt) {
        
        try {
          let fileTextContent = evt.target.result;
          let backupData = JSON.parse(fileTextContent);
          taskRestoreAppData(backupData);
        } catch (e) {
          console.error(e);
        }
        
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
  
  async function ApplyTaskProgressHistoryToMissionRoot() {
    if (!window.modeChromeExtension) return;
    
    let data = await chrome.storage.local.get(['taskProgressHistory']);
    if (data.taskProgressHistory === undefined) return;
    
    for (let historyData of data.taskProgressHistory) {
      app.AddProgressTimeToRootMission(parentTaskId, historyData.progressTime);
    }
    
    await storeTask();
    
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
      await storeTask();
    }
    app.TaskListTask();
  }
  
  async function TaskAddProgressManually(id) {
    let task = tasks.find(x => x.id == id);
    if (!task) return;
    
    const { value: userVal } = await Swal.fire({
      title: 'Progress in minutes',
      input: 'text',
      inputLabel: 'example: 10, 15, 30',
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
      
      await storeTask();  
      app.TaskListTask();
      
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
  
  async function TaskDeleteTask(id, taskEl) {
  
    let isConfirm = await uiComponent.ShowConfirm();
    if (!isConfirm) return; 
    
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
        compoMission.RemoveMissionById(id)
      }
    }
  
    // delete child task recurisively
    totalDeletedProgressTime += deleteAllChildTasksByParentId(id);
    // console.log(totalDeletedProgressTime)
    
    // put total progress time of deleted tasks into the parent progress
    if (parentTask) {
      parentTask.totalProgressTime += totalDeletedProgressTime;
    }
    
    await storeTask();
    lsdb.save();
    
    await removeActiveTaskIfExists(id);
    taskEl.remove();
    updateUI();
  }
  
  async function Init() {
    await initData();
    attachListeners();
    await loadTasks();
    await app.ApplyTaskProgressHistoryToMissionRoot();
    await listTask();
    TaskSetActiveTaskInfo();
    uiComponent.Init();
    updateUI();
    
    if (lsdb.data.viewMode == 'mission') {
      $('#tasklist-container').stateList.add('--view-mission');
    }
    
    $('#in-filter-search-label').value = window.lsdb.data.labelFilter;
    loadSearch();
    
    // web platform notification support
    setWebPlatformNotificationSupport();
    
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
  
  async function TaskClickHandler(el) {
    let actionRole = getActionRole(el);
    let parentEl = el.closest('[data-obj="task"]');
    let id = parentEl.dataset.id;
    switch (actionRole) {
      case 'navigate-mission': taskNavigateToMission(id); break;
      case 'navigate-sub': 
        // changeViewModeConfig('tasks');
        // saveConfig();
        uiComponent.Navigate(id);
        listTask();
        break;
      case 'edit': editTask(id); break;
      case 'star-task': app.TaskStarTask(id); break;
      case 'delete': app.TaskDeleteTask(id, parentEl); break;
      case 'set-ratio': taskSetTaskRatio(id); break;
      case 'add-label': TaskAddLabel(id); break;
      case 'add-sub-timer': addSubTimer(id); break;
      case 'add-progress-minutes': await app.TaskAddProgressManually(id); break;
      case 'track': trackProgress(id); break;
      case 'untrack': untrackProgress(id); break;
      case 'set-active': switchActiveTask(parentEl, id); break;
      case 'split-task': await splitTask(id); break;
      case 'remove-mission': taskAddToMission(id, parentEl); break;
      case 'add-to-mission': taskAddToMission(id, parentEl); break;
      case 'set-target': await setTaskTarget(id); break;
      case 'archive':
        let activeTask = await getActiveTask();
        if (activeTask && activeTask.id == id) {
          await stopTimer();
        }
        // await finishTask(id);
        await taskArchiveTask(id);
        await removeActiveTaskIfExists(id);
        updateUI();
      break;
      case 'unarchive': await taskUnarchive(id); break;
      case 'restart': await restartTask(id); break;
      case 'take-note': showModalNote(id); break;
      case 'start': await startTaskTimer(parentEl, id); break;
      case 'stop': await app.TaskStopActiveTask(); break;
        
      // notes
      case 'rename-sub-task': renameNote(id, el); break;
      case 'start-sub-task':
        await fixMissingNoteId(id, el); await setSubTask(id, el); break;
      case 'delete-note': deleteNote(id, el); break;
    }
  }
  
  function GetTaskById(id) {
    return tasks.find(x => x.id == id);
  }
  
  async function TaskUpdateTask(form) {
    let task = tasks.find(x => x.id == form.id.value);
    task.title = form.title.value;
    task.target = parseHoursMinutesToMinutes(form.target.value);
    task.finishCount = parseInt(form['finishCount'].value);
    task.finishCountProgress = parseInt(form['finishCount'].value);
    task.parentId = form['parent-id'].value;
  
    await storeTask();
    partialUpdateUITask(task.id, task);
    form.reset();
    
    syncGroupName(task.id, task.title, task.parentId);
  }
  
  function syncGroupName(id, newTitle, parentId) {
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
    let finishCount = form['finishCount'].value ? parseInt(form['finishCount'].value) : null;
    try {
      let parentId = form['parent-id'].value;
      taskId = addTaskData({
        finishCount,
        finishCountProgress: finishCount,
        title: form.title.value,
        target: parseHoursMinutesToMinutes(targetVal),
        parentId: parentId ? parentId : '',
      });
      
      if (parentId) {
        let parentTask = await app.GetTaskById(parentId);
        await CheckAndCreateGroups(parentTask.title, parentId);
      }
    } catch (e) {
      console.error(e);
      alert('Failed.');    
      return;
    }
    
    form.reset();
  
    // set as active task if none is active
    let data = await window.service.GetData('start');
    if (!data.start && taskId) {
      await window.service.SetData({'activeTask': taskId});
    }
  
    await storeTask();
    await listTask();
    
    updateUI();
  }
  
  return SELF;
  
})();