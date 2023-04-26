let $ = document.querySelector.bind(document)
let qsa = document.querySelectorAll.bind(document)
let asd = console.log

window.listenOn=function(e,t,l){for(let n of document.querySelectorAll(e))n.addEventListener(t,l[n.dataset.callback])};

async function setSleepTime() {
  let data = await chrome.storage.local.get('sleepTime');
  let initial = (data.sleepTime ? data.sleepTime : 22 * 60);
  
  let time = window.prompt('Sleep time', minutesToTimeString(initial));
  if (time) {
    let minutes = timeStringToMinutes(time);
    if (minutes) {
      await chrome.storage.local.set({ 'sleepTime': minutes });
      await calculateOverloadInfo();
      window.ui.loadSleepTime();
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

async function setTimer(duration) {
  let data = await chrome.storage.local.get(["history", "start"]);
  let distanceMinutes = 0;
  let distanceTime = 0;
  if (typeof(data.start) != 'undefined') {
    distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
    distanceTime = new Date().getTime() - data.start;
  }
  await chrome.storage.local.set({ 'history': data.history + distanceMinutes });
  await chrome.storage.local.remove(['start']);
  document.querySelector('#history').textContent = data.history + distanceMinutes;
  await updateProgressActiveTask(distanceMinutes, distanceTime);
  
  await chrome.alarms.clearAll();
  
  let aMinute = 60;
  let miliseconds = 1000;
  let now = new Date().getTime();
  let triggerTime = now + duration * aMinute * miliseconds;
  
  await chrome.storage.local.set({ 'start': now  });
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
  updateUI();  
}

async function clearTaskHistory() {
  for (let task of tasks) {
    task.progress = 0;
    task.progressTime = 0;
  }
  await storeTask();
}

async function updateTask(form) {
  let task = tasks.find(x => x.id == form.id.value);
  task.title = form.title.value;
  task.target = parseHoursMinutesToMinutes(form.target.value);
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
  
  try {
    addTaskData({
      title: form.title.value,
      target: parseHoursMinutesToMinutes(form.target.value),
    });
  } catch (e) {
    console.error(e);
    alert('Failed.');    
    return;
  }
  
  form.reset();
  await storeTask();
  await listTask();
  
  updateUI();
}

async function addTaskData(inputData) {
  let data = {...inputData, ...{
    id: generateUniqueId(),
    progress: 0,
    progressTime: 0,
    lastUpdated: 0,
    untracked: false,
  }};
  tasks.push(data);
}
      
async function storeTask() {
  await chrome.storage.local.set({ 'tasks': tasks });
}
      
let tasks = [];
async function initApp() {
  showCurrentTimeInAMPM();
  await initData();
  await migrate();
  attachListeners();
  await loadTasks();
  await listTask();
  await loadRestTime();
  await calculateOverloadInfo();
  window.ui.loadSleepTime();
  updateUI();
}

async function migrate() {
  let data = await chrome.storage.local.get('history');
  await chrome.storage.local.set({'historyTime': data.history * 60 * 1000});
}

async function getSleepTimeInMinutes() {
  let defaultSleepHours = 22;
  let data = await chrome.storage.local.get('sleepTime');
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
  chrome.storage.local.get(['start', 'rest'], function(data) {
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
        chrome.storage.local.set({rest: rest});
        restButton.remove();
      });
    }
  });

}

async function stopTimer() {
  document.body.stateList.remove('--timer-running');
  await chrome.alarms.clearAll();
  
  let data = await chrome.storage.local.get(["history", "historyTime", "start"]);
  let distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
  let distanceTime = new Date().getTime() - data.start;
  await chrome.storage.local.set({ 'history': data.history + distanceMinutes });
  await chrome.storage.local.set({ 'historyTime': data.historyTime + distanceTime });
  await chrome.storage.local.remove(['start']);
  await updateProgressActiveTask(distanceMinutes, distanceTime);
  // window.close();
  
  updateUI();
  await chrome.runtime.sendMessage({message: 'stop'});
}

let countdonwIntervalId;

async function startCountdown() {
  
  clearInterval(countdonwIntervalId);
  let alarm = await chrome.alarms.get('main');
  if (!alarm) {
    document.body.stateList.remove('--timer-running');
    return;
  }
  document.body.stateList.add('--timer-running');
  
  let store = await chrome.storage.local.get('start');
  let startTime = store.start;
  let scheduledTime = alarm.scheduledTime;
  
  countdonwIntervalId = setInterval(() => {
    updateTime(scheduledTime, startTime);
    // window.ui.updateProgressBar();
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
    window.ui.updateTaskProgressBar(activeTask.id);
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
  
  let history = getSumTaskProgress();
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
  let result = chrome.storage.local.get(['history']);
  if (typeof(result.history) == 'undefined') {
	  await chrome.storage.local.set({ 'history': 0 });
  }
}

function attachListeners() {
  window.listenOn('.clickable', 'click', window.DOMEvents.clickable);
  window.listenOn('.submittable', 'submit', window.DOMEvents.submittable);
}


function detectKeyPressS() {
  let sKeyPressed = false;
  let tKeyPressed = false;

  function detect(event) {
    // Check if the currently focused element is not an input element
    if (document.activeElement.tagName.toLowerCase() == 'input') {
      // Do something
      return;
    }
    if (event.key === 's' && !sKeyPressed) {
      sKeyPressed = true;
      $('[data-callback="stop-timer"]').focus();
    } else if (event.key === 't' && !tKeyPressed) {
      tKeyPressed = true;
      $('[data-callback="set-timer"] input').focus();
      event.preventDefault();
    }
  }

  function reset() {
    sKeyPressed = false;
    tKeyPressed = false;
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
  let data = await chrome.storage.local.get(['activeTask', 'start']);
  if (data.activeTask) {
    let el = $(`[data-obj="task"][data-id="${data.activeTask}"]`);
    if (el) {
      el.stateList.toggle('--active');
      let activeTimerDistance = await getActiveTimerDistance();
      el.querySelector('[data-obj="live-progress"]').textContent = `(+${activeTimerDistance}m)`;
    }
  }
}

async function getActiveTimerDistance() {
  let data = await chrome.storage.local.get(["history", "start"]);
  if (data.start) {
	  let distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));  
	  return distanceMinutes;
  }
  return 0;
}

async function getActiveTimerDistanceTime() {
  let data = await chrome.storage.local.get(["history", "start"]);
  if (data.start) {
	  return new Date().getTime() - data.start;
  }
  return 0;
}

async function loadTasks() {
  let data = await chrome.storage.local.get(['tasks']);
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
  if (timeString == '') {
    timeString = '0'
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
  
  for (let item of tasks) {
    
    let liveProgress = 0;
    let liveProgressTime = 0;
    if (activeTask && item.id == activeTask.id) {
      liveProgress = activeTimerDistance;
      liveProgressTime = activeTimerDistanceTime;
    }
    
    
    let fillData = {...item, ...{
      // targetString: minutesToHoursAndMinutes(item.target),
      allocatedTimeString: minutesToHoursAndMinutes(item.target),
      targetString: `${minutesToHoursAndMinutes(item.target - msToMinutes(item.progressTime) - liveProgress)} left`,
      progress: minutesToHoursAndMinutes(msToMinutes(item.progressTime)),
    }};
    
    let isCompleted = false;
    let percentageProgress = 0;
    let percentageProgressTime = 0;
    if (item.target) {
      percentageProgress = Math.min(100, Math.floor((msToMinutes(item.progressTime) + liveProgress)/item.target*10000)/100);
      percentageProgressTime = Math.min(100, Math.floor((item.progressTime + liveProgressTime) / minutesToMs(item.target) * 10000) / 100);
      fillData.completionPercentage = `(${percentageProgressTime}%)`;
    }
    
    if (item.progressTime + liveProgressTime >= minutesToMs(item.target)) {
      isCompleted = true;
    }
    
  	let el = window.templateSlot.fill({
  	  data: fillData, 
  	  template: document.querySelector('#tmp-task').content.cloneNode(true), 
  	});
  // 	if (!item.target) {
  	 // el.querySelector('.__target-string').style.display = 'none';
  // 	}
  	taskEl = el.querySelector('[data-obj="task"]');
  	taskEl.dataset.id = item.id;
  	if (item.untracked) {
  	  taskEl.stateList.add('--untracked');
  	}
  	
  	el.querySelector('[data-role="progress-bar"]').style.width = percentageProgressTime+'%';
  	
  	if (isCompleted) {
  	  docFragCompleted.append(el);
  	} else {
  	  docFrag.append(el);
  	}
  }
  $('#tasklist').innerHTML = '';
  $('#tasklist').append(docFrag);
  $('#tasklist-completed').innerHTML = '';
  $('#tasklist-completed').append(docFragCompleted);
  
  await setActiveTask();
}
      
function updateUI() {
  chrome.storage.local.get(['start','target']).then(async (result) => {
    let distanceMinutes = 0;
    let distanceTime = 0;
    let isRunning = (typeof(result.start) != 'undefined');
    if (isRunning) {
      distanceMinutes = Math.floor((new Date().getTime() - result.start) / (60 * 1000));
      distanceTime = new Date().getTime() - result.start;
      if (distanceMinutes > 0) {
        $('#live-history').textContent = `(+${distanceMinutes}m)`;
      } else {
        $('#live-history').textContent = '(+0m)';
      }
    }
    
    window.ui.updateUI(isRunning);
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
    case 'edit':
      editTask(id);
      break;
    case 'delete':
      let deleteIndex = tasks.findIndex(x => x.id == id);
      tasks.splice(deleteIndex, 1);
      await storeTask();
      await removeActiveTaskIfExists(id);
      parentEl.remove();
      break;
    case 'track':
      trackProgress(id);
      break;
    case 'untrack':
      untrackProgress(id);
      break;
    case 'set-active':
      switchActiveTask(parentEl, id);
      break;
    case 'split-task':
      await splitTask(id);
      break;
    case 'rename':
      await renameTask(id);
      break;
    case 'reduce':
      await reduceTaskDuration(id);
      break;
    case 'add':
      await increaseTaskDuration(id);
      break;
  }
}

async function switchActiveTask(taskEl, id) {
  
  let activeTask = await getActiveTask();
  
  // switch task
  if (activeTask) {
    // switch task
    if (id == activeTask.id) {
      await removeActiveTask();
      disableAllActive();
      window.ui.updateTaskProgressBar(id, false);
    } else {
      window.ui.updateTaskProgressBar(activeTask.id, false);
      await chrome.storage.local.set({'activeTask': id});
      disableAllActive();
      taskEl.stateList.add('--active');
      await window.ui.updateTaskProgressBar(id);
      
      let data = await chrome.storage.local.get('start');
      if (data.start) {
        taskEl.querySelector('[data-role="progress-bar"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', true);
        taskEl.querySelector('[data-role="progress-bar-container"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', true);
      }
    }
    // activeTask.lastUpdated = new Date().getTime();
  } else {
    taskEl.stateList.add('--active');
    await chrome.storage.local.set({'activeTask': id});
    await chrome.storage.local.set({'tasks': tasks});
    let data = await chrome.storage.local.get('start');
    if (data.start) {
      taskEl.querySelector('[data-role="progress-bar"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', true);
      taskEl.querySelector('[data-role="progress-bar-container"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', true);
    }
  }
  
  // let currentState = el.stateList.contains('--active');
  // disableAllActive();
  // let isActive = el.stateList.toggle('--active', !currentState);
  // if (isActive) {
  //   let activeTimerDistance = await getActiveTimerDistance();
  //   el.querySelector('[data-obj="live-progress"]').textContent = `(+${activeTimerDistance})`;
  // } else {
  //   removeActiveTask();
  // }
  
  // await toggleActiveTask(parentEl, id);
}

async function renameTask(id) {
  let task = tasks.find(x => x.id == id);
  
  let title = window.prompt('rename', task.title);
  if (!title) return;
  
  task.title = title;
  await storeTask();
  listTask();  
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
  await chrome.storage.local.remove(['activeTask']);
}

async function getActiveTask() {
  let data = await chrome.storage.local.get(['activeTask'])
  if (data.activeTask) {
    let activeTask = tasks.find(x => x.id == data.activeTask);
    if (activeTask) {
      return activeTask
    }  
  }
  return null;
}

async function updateProgressActiveTask(addedProgress, distanceTime) {
  let data = await chrome.storage.local.get(['activeTask']);
  if (data.activeTask) {
    let activeTask = tasks.find(x => x.id == data.activeTask);
    if (activeTask) {
      activeTask.progress += addedProgress;
      if (typeof(activeTask.progressTime) == 'undefined') {
        activeTask.progressTime = activeTask.progress * 60 * 1000;
      } else {
        activeTask.progressTime += distanceTime;
      }
      await storeTask();
      
      let el = $(`[data-obj="task"][data-id="${data.activeTask}"]`);
      el.querySelector('[data-obj="live-progress"]').textContent = '(+0m)';
      el.querySelector('[data-obj="progress"]').textContent = minutesToHoursAndMinutes(msToMinutes(activeTask.progressTime));
    }
  }
}

function disableAllActive() {
  let taskEls = qsa('#tasklist-container [data-obj="task"]');
  for (let node of taskEls) {
    node.stateList.remove('--active');
    node.querySelector('[data-obj="live-progress"]').textContent = ``;
    node.querySelector('[data-role="progress-bar"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', false);
    node.querySelector('[data-role="progress-bar-container"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', false);
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



initApp();