window.modeChromeExtension = false;
try {
  if (chrome.storage.local.get) {
  }
  window.modeChromeExtension = true;
} catch (e) {}

if (window.modeChromeExtension) {
  window.service = window.serviceChrome;
}

window.listenOn=function(e,t,l){for(let n of document.querySelectorAll(e))n.addEventListener(t,l[n.dataset.callback])};

async function setSleepTime() {
  let data = await window.service.GetData('sleepTime');
  let initial = (data.sleepTime ? data.sleepTime : 22 * 60);
  
  let time = window.prompt('Sleep time', minutesToTimeString(initial));
  if (time) {
    let minutes = timeStringToMinutes(time);
    if (minutes) {
      await window.service.SetData({ 'sleepTime': minutes });
      await calculateOverloadInfo();
      uiComponent.loadSleepTime();
      await updateUI();
    }
  }
}


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
  document.querySelector('#history').textContent = data.history + distanceMinutes;
  await updateProgressActiveTask(distanceMinutes, distanceTime);
  
  
  let aMinute = 60;
  let miliseconds = 1000;
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
    if (triggerTime - 3 * aMinute * miliseconds > 0) {
      await chrome.alarms.create('3m', {
  	      when: triggerTime - 3 * aMinute * miliseconds
      });
    }
    await chrome.runtime.sendMessage({message: 'start-timer'});
  }
  
  updateUI();  
}

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

async function updateTask(form) {
  let task = tasks.find(x => x.id == form.id.value);
  task.title = form.title.value;
  task.target = parseHoursMinutesToMinutes(form.target.value);
  task.finishCount = parseInt(form['finish-count'].value);

  await storeTask();
  partialUpdateUITask(task.id, task);
  form.reset();
  form.stateList.remove('--edit-mode');
}

function partialUpdateUITask(id, task) {
  let el = $(`[data-obj="task"][data-id="${id}"]`);
  el.querySelector('[data-slot="title"]').textContent = task.title;
}

async function addTask(form)  {
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
    taskId = addTaskData({
      title: form.title.value,
      target: parseHoursMinutesToMinutes(targetVal),
      finishCount: form['finish-count'].value ? parseInt(form['finish-count'].value) : null,
      parentId: form['parent-id'].value ? form['parent-id'].value : null,
    });
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

function isNumber(input) {
  return /^[0-9]+$/.test(input);
}

function addTaskData(inputData) {
  let id = generateUniqueId();
  let data = {...inputData, ...{
    id,
    progress: 0,
    progressTime: 0,
    totalProgressTime: 0,
    lastUpdated: 0,
    untracked: false,
    activeSubTaskId: null,
  }};
  tasks.splice(0, 0, data);
  
  return id;
}
      
async function storeTask() {
  await window.service.SetData({ 'tasks': tasks });
}
      
      
let storageName = 'appdata-NzkwMTI0NA';
window.lsdb = new Lsdb(storageName, {
  root: {
    start: null,
    history: 0,
    historyTime: 0,
    activeTask: '',
    search: '',
    scheduledTime: 0,
    tasks: [],
    isSortByTotalProgress: true,
  },
});
      
let tasks = [];
async function initApp() {
  showCurrentTimeInAMPM();
  await initData();
  attachListeners();
  await loadTasks();
  await listTask();
  await loadRestTime();
  await calculateOverloadInfo();
  uiComponent.loadSleepTime();
  uiComponent.Init();
  updateUI();
  loadSearch();
}

async function loadSearch() {
  if (window.lsdb.data.search) {
    $('#node-filter-box').value = lsdb.data.search;
    let element = $('#node-filter-box');
    
    let selector = '[data-slot="title"]';
    let visibleClass = 'd-none';
    let containerSelector = '#tasklist-container [data-obj="task"]';
    
    const inputValue = element.value.toLowerCase();
    for (let node of document.querySelectorAll(containerSelector)) {
      const selectorValue = node.querySelector(selector).textContent.toLowerCase();
      if (selectorValue.includes(inputValue)) {
        node.classList.remove(visibleClass);
      } else {
        node.classList.add(visibleClass);
      }
    }
    
  }
}


async function getSleepTimeInMinutes() {
  let defaultSleepHours = 22;
  let data = await window.service.GetData('sleepTime');
  let total = (data.sleepTime ? data.sleepTime : defaultSleepHours * 60);
  
  return total;
}

async function calculateOverloadInfo() {
  let totalUnfinishedProgress = getSumUnfinishedProgress();
  let sleepHoursInMinutes = await getSleepTimeInMinutes();
  
  let overloadWarningTxt = calculateOverload(totalUnfinishedProgress, sleepHoursInMinutes);
  $('#txt-time-overload-info').innerHTML = '';
  if (overloadWarningTxt) {
    $('#txt-time-overload-info').innerHTML = overloadWarningTxt;
  }
}

function getHoursAndMinutes(totalMinutes) {
  const sleepHours = Math.floor(totalMinutes / 60);
  const sleepMinutes = totalMinutes % 60;
  return { sleepHours, sleepMinutes };
}


function calculateOverload(progress, sleepHoursInMinutes) {
  
  const { sleepHours, sleepMinutes } = getHoursAndMinutes(sleepHoursInMinutes);
  
  const sleepTime = new Date();
  sleepTime.setHours(sleepHours, sleepMinutes, 0, 0); // set sleep time to today at 23:00
  
  const currentTime = new Date();
  const totalTime = currentTime.getTime() + progress * 60000; // convert progress to milliseconds and add to current time
  
  if (totalTime > sleepTime.getTime()) {
    const overload = Math.round((totalTime - sleepTime.getTime()) / 60000); // convert overload to minutes and round to nearest integer
    return `There will be <b>${minutesToHoursAndMinutes(overload)}</b> of unfinished work after sleep time. Try readjusting tasks target or sleep time.`;
  }
  
  return null; // return null if not overloaded
}


function deleteStorageItem(key) {
  chrome.storage.sync.remove(key, function() {
    console.log(`Key "${key}" removed from storage`);
  });
}

async function loadRestTime() {
    
  // load progress and rest from storage
  window.service.GetData(['start', 'rest'], function(data) {
    let liveProgress = 0;
    if (data.start) {
      liveProgress = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
    }
    let progress = getSumTaskProgress() + liveProgress;
    let rest = data.rest || 0;
    
    let restAfterThresholdMinutes = 35;
    
    // calculate number of rest times
    let numOfRestTimes = Math.floor(progress / restAfterThresholdMinutes) - rest;
    let timeUntilRest = restAfterThresholdMinutes - progress % restAfterThresholdMinutes;
    $('#txt-left-until-rest').textContent = `${minutesToHoursAndMinutes(timeUntilRest)} until next rest time`;
  
    // get container to append buttons to
    let restTimeContainer = document.getElementById('rest-time');
  
    if (numOfRestTimes === 0) {
      let restButton = document.createElement('span');
      restButton.innerText = `No rest time available. Progress for ${restAfterThresholdMinutes}m to get 1 rest time.`;
      restTimeContainer.appendChild(restButton);
    }
  
    // append rest time buttons to container
    for (let i = 1; i <= numOfRestTimes; i++) {
      let restButton = document.createElement('button');
      restButton.innerText = 'Take';
      restTimeContainer.appendChild(restButton);
      restButton.addEventListener('click', function() {
        // increment rest value by 5 when button is clicked
        rest += 1;
        window.service.SetData({rest: rest});
        restButton.remove();
      });
    }
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
    
  let data = await window.service.GetData(["history", "historyTime", "start"]);
  if (data.start) {
    let distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
    let distanceTime = new Date().getTime() - data.start;
    await window.service.SetData({ 'history': data.history + distanceMinutes });
    await window.service.SetData({ 'historyTime': data.historyTime + distanceTime });
    await updateProgressActiveTask(distanceMinutes, distanceTime);
  }
  await window.service.RemoveData(['start']);
  // window.close();
  
  updateUI();
  if (window.modeChromeExtension) {
    await chrome.runtime.sendMessage({message: 'stop'});
  }
}

async function startOrRestartTask() {
  let task = await getActiveTask();
  if (!task) return;
  
  await stopTimer();
  await startCurrentTask(task.id);
}

async function finishTimer() {
  let task = await getActiveTask();
  if (!task) return;

  await stopTimer();
  await finishTask(task.id); 
  updateUI()
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
  
  let distance = scheduledTime - new Date().getTime();
  let seconds = Math.round(distance / 1000);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  $('#txt-countdown').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  
  let percentage = (new Date().getTime()-startTime)/(scheduledTime-startTime)*100;
  $('.NzE2ODYyNQ-progress-bar-fill').style.width = `${percentage}%`;
  if (--seconds < 0) {
    clearInterval(countdonwIntervalId);
  }
  
  let distanceMinutes = Math.floor((new Date().getTime() - startTime) / (60 * 1000));
  let distanceTime = new Date().getTime() - startTime;
  updateProgressPercentage(startTime);
  
  let activeTask = await getActiveTask();
  if (activeTask) {
    uiComponent.updateTaskProgressBar(activeTask.id);
  }
}


function updateProgressPercentage(startTime) {
  let distanceMinutes = Math.floor((new Date().getTime() - startTime) / (60 * 1000));
  let distanceTime = new Date().getTime() - startTime;
  if (distanceMinutes > 0) {
    $('#live-history').textContent = `(+${distanceMinutes}m)`;
  } else {
    $('#live-history').textContent = '(+0m)';
  }
  
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


function calculateTimeDifferenceInMinutes(timeInMinutes) {
  const currentTimeInMinutes = (new Date()).getHours() * 60 + (new Date()).getMinutes();
  return timeInMinutes > currentTimeInMinutes ? timeInMinutes - currentTimeInMinutes : (24 * 60 - currentTimeInMinutes) + timeInMinutes;
}


async function getTimeBeforeSleep() {
  let sleepHours = await getSleepTimeInMinutes();
  let diffTime = calculateTimeDifferenceInMinutes(sleepHours);
  return diffTime;
}

function showCurrentTimeInAMPM() {
  const date = new Date();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours %= 12;
  hours = hours || 12;
  const strTime = hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' ' + ampm;
  $('#txt-clock').textContent = strTime;
  // console.log(strTime);
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
}


function detectKeyPressS() {
  let sKeyPressed = false;
  let tKeyPressed = false;
  let rKeyPressed = false;
  let fKeyPressed = false;
  let slashKeyPressed = false;

  function detect(event) {
    // Check if the currently focused element is not an input element
    if (document.activeElement.tagName.toLowerCase() == 'input') {
      // Do something
      return;
    }
    if (event.key === 's' && !sKeyPressed) {
      sKeyPressed = true;
      $('[data-callback="stop-timer"]').focus();
    } else if (event.key === 'r' && !tKeyPressed) {
      rKeyPressed = true;
      $('[data-callback="start-or-restart-timer"]').focus();
    } else if (event.key === 'f' && !tKeyPressed) {
      fKeyPressed = true;
      $('[data-callback="finish-timer"]').focus();
    } else if (event.key === 't' && !tKeyPressed) {
      tKeyPressed = true;
      $('[data-callback="set-timer"] input').focus();
      event.preventDefault();
    } else if (event.key === '/' && !slashKeyPressed) {
      slashKeyPressed = true;
      $('#node-filter-box').focus();
      event.preventDefault();
    }
  }

  function reset() {
    sKeyPressed = false;
    tKeyPressed = false;
    rKeyPressed = false;
    fKeyPressed = false;
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
      el.stateList.toggle('--active');
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
  return timeString;
}

function msToMinutes(milliseconds) {
  return Math.floor(milliseconds / 60000);
}


async function listTask() {
  let docFrag = document.createDocumentFragment();
  let docFragCompleted = document.createDocumentFragment();
  let activeTimerDistance = await getActiveTimerDistance();
  let activeTimerDistanceTime = await getActiveTimerDistanceTime();
  let activeTask = await getActiveTask();
  
  // if (lsdb.data.isSortByTotalProgress) {
  //   tasks.sort((a, b) => a.totalProgressTime > b.totalProgressTime ? -1 : 1);
  // }
  
  // let rankLabel = 1;
  for (let item of tasks) {
    
    let liveProgress = 0;
    let liveProgressTime = 0;
    if (activeTask && item.id == activeTask.id) {
      liveProgress = activeTimerDistance;
      liveProgressTime = activeTimerDistanceTime;
    }
    
    let targetMinutesLeft = item.target - msToMinutes(item.progressTime) - liveProgress;
    let progressMinutesLeft = msToMinutes(item.progressTime);
    let totalMsProgressChildTask = 0;

    // accumulates child task progress
    {
      totalMsProgressChildTask = tasks.filter(x => x.parentId == item.id).reduce((total, item) => total+item.totalProgressTime, 0);
      let totalChildTaskProgressMinutes = msToMinutes(totalMsProgressChildTask);
      targetMinutesLeft -= totalChildTaskProgressMinutes;
      progressMinutesLeft += totalChildTaskProgressMinutes;
    }

    let fillData = {...item, ...{
      // targetString: minutesToHoursAndMinutes(item.target),
      // rankLabel: ` | Rank #${rankLabel}`,
      targetString: targetMinutesLeft ? `${minutesToHoursAndMinutes(targetMinutesLeft)} left` : '',
      allocatedTimeString: minutesToHoursAndMinutes(item.target),
      progress: progressMinutesLeft ? minutesToHoursAndMinutes(progressMinutesLeft) : '0m',
      totalProgressLabel: minutesToHoursAndMinutes(msToMinutes(item.totalProgressTime)),
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

    let isCompleted = false;
    let percentageProgress = 0;
    let percentageProgressTime = 0;
    if (item.target) {
      percentageProgress = Math.min(100, Math.floor((msToMinutes(item.progressTime + totalMsProgressChildTask) + liveProgress)/item.target*10000)/100);
      percentageProgressTime = Math.min(100, Math.floor((item.progressTime + liveProgressTime + totalMsProgressChildTask) / minutesToMs(item.target) * 10000) / 100);
      fillData.completionPercentage = `(${percentageProgressTime}%)`;
    }

    if (item.progressTime + liveProgressTime >= minutesToMs(item.target)) {
      isCompleted = true;
    }
    
    if (fillData.note) {
      let index = 0;
      fillData.note = fillData.note.map(x => { x.index = index; index++; return x})
    }

  	let el = window.templateSlot.fill({
  	  data: fillData, 
  	  template: document.querySelector('#tmp-task').content.cloneNode(true), 
  	});

    // set finish count label
    if (fillData.finishCount) {
      el.querySelector('.label-finish-count').textContent = `(${fillData.finishCount} left)`
    }
    
    // 	if (!item.target) {
  	 // el.querySelector('.__target-string').style.display = 'none';
  // 	}
  	taskEl = el.querySelector('[data-obj="task"]');
  	taskEl.dataset.id = item.id;
  	setActiveSubTaskItem(taskEl, item);
  	if (item.untracked) {
  	  taskEl.stateList.add('--untracked');
  	}
  	
  	el.querySelector('[data-role="progress-bar"]').style.width = percentageProgressTime+'%';
  	
  	if (isCompleted) {
  	  docFragCompleted.append(el);
  	} else {
  	  docFrag.append(el);
  	}

    // rankLabel++;
  }
  $('#tasklist').innerHTML = '';
  $('#tasklist').append(docFrag);
  $('#tasklist-completed').innerHTML = '';
  $('#tasklist-completed').append(docFragCompleted);
  
  await setActiveTask();
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
      if (distanceMinutes > 0) {
        $('#live-history').textContent = `(+${distanceMinutes}m)`;
      } else {
        $('#live-history').textContent = '(+0m)';
      }
    }
    
    uiComponent.updateUI(isRunning);
    await startCountdown();
    
    let history = getSumTaskProgress();
    let historyTime = getSumTaskProgressTime();
    // let target = result.target;
    let target = getSumTaskTarget();
    $('#history').textContent = minutesToHoursAndMinutes(history);
    // $('#target').textContent = minutesToHoursAndMinutes(target);
    $('#target').textContent = minutesToHoursAndMinutes(target);
    $('#txt-time-before-sleep').textContent = minutesToHoursAndMinutes(await getTimeBeforeSleep());
    $('#txt-unallocated-time').textContent = minutesToHoursAndMinutes(await getUnallocatedTime());
    
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

function getSumUnfinishedProgress() {
  let total = 0;
  for (let item of tasks) {
    if (item.untracked) {
      continue;
    }
    total += Math.max(0, item.target - msToMinutes(item.progressTime));
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

async function getUnallocatedTime() {
  let total = 0;
  try {
    // let totalTarget = getSumTaskTarget();
    let totalUnfinished = getSumUnfinishedProgress();
    let timeBeforSleep = await getTimeBeforeSleep();
    total = timeBeforSleep - totalUnfinished;
  } catch (e) {}
  return total;
}

async function removeActiveTaskIfExists(id) {
  let task = await getActiveTask();
  if (task && id == task.id) {
    await removeActiveTask();
  }
}

async function taskClickHandler(el) {
  let actionRole = getActionRole(el);
  let parentEl = el.closest('[data-obj="task"]');
  let id = parentEl.dataset.id;
  switch (actionRole) {
    case 'edit': editTask(id); break;
    case 'delete':
      let deleteIndex = tasks.findIndex(x => x.id == id);
      tasks.splice(deleteIndex, 1);
      await storeTask();
      await removeActiveTaskIfExists(id);
      parentEl.remove();
      updateUI();
      break;
    case 'add-sub-timer': addSubTimer(id); break;
    case 'track': trackProgress(id); break;
    case 'untrack': untrackProgress(id); break;
    case 'set-active': switchActiveTask(parentEl, id); break;
    case 'split-task': await splitTask(id); break;
    case 'rename': await renameTask(id); break;
    case 'reduce': await reduceTaskDuration(id); break;
    case 'add': await increaseTaskDuration(id); break;
    case 'set-target': 
      await setTaskTarget(id); 
      break;
    case 'finish':
      let activeTask = await getActiveTask();
      if (activeTask && activeTask.id == id) {
        await stopTimer();
      }
      await finishTask(id);
      updateUI();
    break;
    case 'restart': await restartTask(id); break;
    case 'take-note': showModalNote(id); break;
    case 'start': await startTaskTimer(parentEl, id); break;
      
    // notes
    case 'rename-sub-task': renameNote(id, el); break;
    case 'start-sub-task':
      await fixMissingNoteId(id, el); await setSubTask(id, el); break;
    case 'delete-note': deleteNote(id, el); break;
  }
} 

async function startTaskTimer(parentEl, id) {
  await stopTimer();
  await switchActiveTask(parentEl, id, true);
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
  }
  uiComponent.ShowModalAddTask(defaultVal);
}

async function renameTask(id) {
  let task = tasks.find(x => x.id == id);
  
  let title = window.prompt('rename', task.title);
  if (!title) return;
  
  task.title = title;
  await storeTask();
  partialUpdateTask('title', task);
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

async function finishTask(id) {
  let task = tasks.find(x => x.id == id);
  task.progress = task.target;
  task.progressTime = task.target * 60 * 1000;
  await storeTask();
  let taskEl = $(`[data-kind="task"][data-id="${task.id}"]`);
  $('#tasklist-completed').append(taskEl)
}

async function restartTask(id) {
  let task = tasks.find(x => x.id == id);
  task.progress = 0;
  task.progressTime = 0;
  await storeTask();
  listTask();  
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

  let newDesc
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
    partialUpdateNoteName(parentEl, newDesc)
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
  
  setTimer(task.target * 60 * 1000 - task.progressTime);
}

async function startTask(id) {
  let task = tasks.find(x => x.id == id);
  // task.progress = task.target;
  // task.progressTime = task.target * 60 * 1000;
  // await storeTask();
  // listTask();  
}

async function reduceTaskDuration(id) {
  let target = window.prompt('how much (hours minutes)');
  if (!target) return;
  
  let task = tasks.find(x => x.id == id);
  task.target = Math.max(0, task.target - parseHoursMinutesToMinutes(target));
  calculateOverloadInfo();
  await storeTask();
  await listTask();  
  await updateUI();
}

async function increaseTaskDuration(id) {
  let target = window.prompt('how much (hours minutes)');
  if (!target) return;
  
  let task = tasks.find(x => x.id == id);
  task.target = Math.max(0, task.target + parseHoursMinutesToMinutes(target));
  await storeTask();
  await listTask();  
  await updateUI();
}

async function setTaskTarget(id) {
  let target = window.prompt('Set mission target (example: 1h, 30m, or 1h30m)');
  if (!target) return;
  
  let task = tasks.find(x => x.id == id);
  task.target = Math.max(0, parseHoursMinutesToMinutes(target));
  await storeTask();
  await listTask();  
  await updateUI();
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
  let task = getTaskById(id);
  task.untracked = true;
  updateUI();
  storeTask();
}

function trackProgress(id) {
  let task = getTaskById(id);
  task.untracked = false;
  updateUI();
  storeTask();
}

async function editTask(id) {
  let task = await getTaskById(id);
  let form = getObjEl('form-task');
  form.id.value = task.id;
  form.title.value = task.title;
  form.target.value = minutesToHoursAndMinutes(task.target);
  form.stateList.add('--edit-mode');
}

function getTaskById(id) {
  return tasks.find(x => x.id == id);
}

async function removeActiveTask() {
  await window.service.RemoveData(['activeTask']);
}

async function getActiveTask() {
  let data = await window.service.GetData(['activeTask'])
  if (data.activeTask) {
    let activeTask = tasks.find(x => x.id == data.activeTask);
    if (activeTask) {
      return activeTask
    }  
  }
  return null;
}

async function updateProgressActiveTask(addedProgress, distanceTime) {
  let data = await window.service.GetData(['activeTask']);
  if (data.activeTask) {
    let activeTask = tasks.find(x => x.id == data.activeTask);
    if (activeTask) {
      activeTask.progress += addedProgress;
      activeTask.progressTime += distanceTime;
      if (typeof(activeTask.totalProgressTime) == 'undefined') {
        activeTask.totalProgressTime = 0;  
      }
      activeTask.totalProgressTime += distanceTime;
      // update sub task total progress time
      updateSubTaskProgress(activeTask, distanceTime);
      await storeTask();
      
      let el = $(`[data-obj="task"][data-id="${data.activeTask}"]`);
      el.querySelector('[data-obj="live-progress"]').textContent = '(+0m)';
      el.querySelector('[data-obj="progress"]').textContent = minutesToHoursAndMinutes(msToMinutes(activeTask.progressTime));
    }
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

function GetTotalProgressString() {
  let totalProgressTime = tasks.reduce((total, item) => {
    return total += item.totalProgressTime;
  }, 0)
  return minutesToHoursAndMinutes(msToMinutes(totalProgressTime));
}


initApp();