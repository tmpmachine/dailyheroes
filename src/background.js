chrome.runtime.onInstalled.addListener(() => { });

chrome.alarms.onAlarm.addListener(alarmHandler);

self.addEventListener("notificationclick", handleNotificationClick, false);

async function handleNotificationClick(event) {
  event.notification.close();
  switch (event.action) {
    case 'stop':
      await stopByNotification();
      await setStopAlarmIcon();
      break;
    case 'restart':
      await restartTask();
      break;
    case '3m':
      startNewAlarm(3);
      break;
    case '7m':
      startNewAlarm(7);
      break;
    case '12m':
      startNewAlarm(12);
      break;
    case '20m':
      startNewAlarm(20);
      break;
  }
}


async function reduceCountActiveTask() {
  let data = await chrome.storage.local.get(['activeTask']);
  if (data.activeTask) {
    let tasks = await getTask();
    let activeTask = tasks.find(x => x.id == data.activeTask);
    if (activeTask) {
      activeTask.finishCount -= 1;
      if (activeTask.finishCount > 0) {
        activeTask.progress = 0;
        activeTask.progressTime = 0;
      }
      await storeTask(tasks);
    }
  }
}

async function updateProgressActiveTask(addedProgress, distanceTime) {
  let data = await chrome.storage.local.get(['activeTask']);
  if (data.activeTask) {
    let tasks = await getTask();
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

      await storeTask(tasks);
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
  let data = await chrome.storage.local.get(["history", "start"]);
  let distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
  let distanceTime = new Date().getTime() - data.start;
  await chrome.storage.local.set({ 'history': data.history + distanceMinutes });
  await chrome.storage.local.remove(['start']);
  await updateProgressActiveTask(distanceMinutes, distanceTime);
}

async function setStopAlarmIcon() {
  chrome.action.setIcon({ path: icon3 });
}

async function alarmHandler(alarm) {
  switch (alarm.name) {
    case 'clock':
      updateTime();
      break;
    case 'halfway':
      spawnNotification('Halfway there!', 'limegreen', icon5, false);
      break;
    case 'main':
      
      let data = await chrome.storage.local.get(["history", "start", "activeTask"]);
		  let distanceMinutes = 0;
		  let distanceTime = 0;
      if (typeof(data.start) != 'undefined') {
        distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
        distanceTime = new Date().getTime() - data.start;
      }
		  await chrome.storage.local.set({ 'history': data.history + distanceMinutes });
      await chrome.storage.local.remove(['start']);
      await updateProgressActiveTask(distanceMinutes, distanceTime);
      
      // get task
      let isRepeatCountFinished = false;
      let finishCountLeftTxt = '';
      
      if (data.activeTask) {
        let tasks = await getTask();
        let activeTask = tasks.find(x => x.id == data.activeTask);
        if (activeTask) {

          // set finish count text
          if (activeTask.finishCount && activeTask.finishCount > 0) {
            if (activeTask.finishCount-1 == 0) {
              isRepeatCountFinished = true;
            } else {
              finishCountLeftTxt = `(${activeTask.finishCount-1})`
            }
            await reduceCountActiveTask();
          }

          // calculate miutes left if has parent task
          if (activeTask.parentId) {
            let totalMsProgressChildTask = tasks.filter(x=>x.parentId == activeTask.parentId).reduce((total,item)=>total+item.totalProgressTime, 0);
            let totalChildTaskProgressMinutes = msToMinutes(totalMsProgressChildTask);
            
            let parentTask = tasks.find(x => x.id == activeTask.parentId);
            let accumulatedMinutesLeft = Math.max(0, parentTask.target - (parentTask.progress + totalChildTaskProgressMinutes));
            finishCountLeftTxt += ` (${accumulatedMinutesLeft}m left)`
          }

        }
      }



      let actions = [];
      if (!isRepeatCountFinished) {
        actions.push({
          action: 'restart',
          title: 'Restart task',
        });
      }
      spawnNotification(`Times up! ${finishCountLeftTxt}`.replace(/ +/g,' ').trim(), 'limegreen', icon3, true, actions);

      chrome.alarms.clearAll();
      chrome.action.setIcon({ path: icon3 });
      break;
    case '3m':
      spawnNotification('3 minutes left!', '#EB455F', icon4, false, [
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

chrome.runtime.onMessage.addListener(messageHandler);

function messageHandler(request, sender, sendResponse) {
  if (request.message === 'start-timer') {
    // spawnNotification('Misi dimulai, Happy farming!', 'white', icon1);
    // chrome.action.setIcon({ path: icon1 })
    clearPersistentNotif();
    updateTime();
  } else if (request.message === 'stop') {
    // spawnNotification('Misi dimulai, Happy farming!', 'white', icon1);
    chrome.action.setIcon({ path: icon3 })
    // updateTime();
  }
}

function clearPersistentNotif() {
  // Get all active notifications
  self.registration.getNotifications().then(function(notifications) {
    // Loop through the notifications and close the one with a specific title
    for (let i = 0; i < notifications.length; i++) {
      if (notifications[i].title.includes('Times up! (total :')) {
        notifications[i].close();
        break;
      }
    }
  });

}


let icon5 = 'data:image/webp;base64,UklGRiIBAABXRUJQVlA4TBUBAAAvH8AHAH/AJgDAJNMo6/8vjbsb8FHDSCQp675/ETKhUCgKoCaSFGlsIB5JaCCnyN7Lbv4D4P/flT5lC5QSUOHABniGRfBybZ80y3YB3GrblidVBviti2eYtPrEPQE2YIPICqwQrdA3UlH9tFRU7u5u3/viA0T0fwK0f9Jz/pVzzfO59ZfTkxXnJ9bzKBRgO6URWFtYz3CzTm50XQBwXYDNrGfGjwDGj1jmCOKsUxnCEQbgCANSSAkBa0ywDHU6EOeaU6g1gfpMfJWpx2FpwMQUmBGAWhPqJ8RtZfyVc2SkWaXQIoEIbk17fV0iZZbaD2m3pmlaf4nUdsv9ypy3WkTUbh1o4mu/1Wq1DtySdv56enLi1v5HAA=='

  let icon4 = 'data:image/webp;base64,UklGRr4BAABXRUJQVlA4TLIBAAAvHUAHEHfCKJJsJ7v/7SeH60cCd/ybwUKGH2w4iCRJkfL2mBn+X8X718UUriPZVqLGXf4JgDDIPxrWF2f+A9iOviCLp8xBThB8URAEFEBOiHJMIQjGCAeG58P+ZL0MECfkIieC/5NPIyaC+ISQe358USCHG+OKi4GIgXbut5k/i+/38s+jLBS6QolzMQVyEYsFCiSH2yz/LxEJUUIhUn++ih1/FCGLF3hy2tl1EuQGiwawiGgQn8CfEC3wxADLtm3DVVVQim3btu30vz+q5OF/74j+T4Dwb3oAOD/jswFMAciLn/BVazaBHZLtj7j784QlsSR5kHXZ3cDlxfkgk+/ZN33yMsfDeTkkI+p72T7J+8N5+QEYlUAPF0614wios0THe4DCQFwDwhyhXqJJ1AMoWhyUybAJEN7PIaCwd4lTkynoz3SxBk6zmHqLQqbhIyfE1NntGgWKTR3wdtcnPOC6AIo06ID3tEZFjc1wxQJNfY7dGCGpvOLgwkGrIOoRd+OQ9MRKihB0SyQeklYmReGzUhlIWgUWXJ+BGYAASI1g4yOv2dimMfkcJO7J9OcAP4n/HQ==';

function msToMinutes(milliseconds) {
  return Math.floor(milliseconds / 60000);
}

async function startNewAlarm(minutes) {
  // await chrome.runtime.sendMessage({message: 'hello'});
  // spawnNotification('Misi dimulai, Happy farming!', 'white', icon1);
  // chrome.action.setIcon({ path: icon1 })
  
  let data = await chrome.storage.local.get(["history", "start"]);
  let distanceMinutes = 0;
  if (typeof(data.start) != 'undefined') {
    distanceMinutes = Math.floor((new Date().getTime() - data.start) / (60 * 1000));
  }
  await chrome.storage.local.set({ 'history': data.history + distanceMinutes });
  await chrome.storage.local.remove(['start']);
  
  // document.querySelector('#history').textContent = data.history + distanceMinutes;
  
  await chrome.alarms.clearAll();
  
  let aMinute = 60;
  let miliseconds = 1000;
  let now = new Date().getTime();
  let triggerTime = now + parseInt(minutes) * aMinute * miliseconds;
  
  await chrome.storage.local.set({ 'start': now  });
  
  await chrome.alarms.create('clock', {
    periodInMinutes: 1
  });
  await chrome.alarms.create('main', {
      when: triggerTime
  }); 
  // await chrome.alarms.create('halfway', {
  //     when: triggerTime - Math.floor(parseInt(minutes)/2) * aMinute * miliseconds
  // });
  if (triggerTime - 3 * aMinute * miliseconds > 0) {
    await chrome.alarms.create('3m', {
	      when: triggerTime - 3 * aMinute * miliseconds
    });
  }
  updateTime();
  
}

async function restartTask() {
  let tasks = await getTask();
  let data = await chrome.storage.local.get(['activeTask']);
  if (!data.activeTask) return;

  let activeTask = tasks.find(x => x.id == data.activeTask);
  if (!activeTask) return;

  activeTask.progress = 0;
  activeTask.progressTime = 0;
  await storeTask(tasks);
  startNewAlarm(activeTask.target);
}

let canvas = new OffscreenCanvas(280, 5);
let c = canvas.getContext('2d')
let progress = 280;
let clockInterval;

function time(seconds) {
  let now = new Date().getTime();
  let end = now + seconds * 1000;
  let mid = Math.floor((end - now) / 2);
  startTimer(mid, end);
  clearInterval(clockInterval);
  oneTime.reset();
  spawnNotification('Started', 'white', icon1);
  clockInterval = setInterval(() => startTimer(mid, end), 1000)
}

let icon1 = 'data:image/webp;base64,UklGRnoBAABXRUJQVlA4TG0BAAAvH8AHEEehNpKthI+7RPRKezRiMRmhtcE2kqRGe0gLkywIm1jIAhNM/VqyCQAgDe4SgwRkID0h/IXpuc1/IADv+x5kB9laLlssbS+qf80y/cn9E0MX9rL1kkUZpbiEBUR+CgBhAdCfAwCYMMEZTBgmCOuf+jypGKU5qRmpGMoxyjGpmWQs7IJsb0BQiYkPkQGybVttG2Figpw89/7cnxzy/7+oYo+yMnwnov8TUP23Lnpf2y4rX8BeexcwaLt8qiz01cWu7/fppqKvGmy6cnCDnuIZvnroimCobFBKaP98o8bRZMjjNFPblBFEwFRWx9ujq0TG17OKWgkx104EU7ncrWcck8LMKNG1IeRIso2e+9K4q0TXhgA5JlMZAsp60xXAu7QnJxRmdIQGbz1Uzj2eW9NWrQ3BqWO66vzy6HEOehDs86NWgjdMYrrK5SHVQHCHkmoFJglUoHpjTrV7TqBSvTmnThV/e+0ZkOrvDAA=';

let icon2 = 'data:image/webp;base64,UklGRhwDAABXRUJQVlA4TA8DAAAvH8AHEP/juJEkRaqGZfiuG+e/G2fC3YuZp7vccBzJtqrMefadJTEQGDE7LN3d4cKObTeRZEkeZv7jaCbUyYUnBGaeWTA8zX8Ag4YAAAAAACIAIAIQGIARRouoqEYBAIoACQIWxlz/BEVToX9hDhWUv1JFJPhD0hxTQCICICpmKAGIEkggMYCjsIKTgAIBAI8oAIr15xdQi4YGBiAhJuZWQZendEWSBqIiHiwEw2VZVOaFOyaBVVGIN/BLKW/S51lIL1WyPDFzwjzxIDwXLmGJuGfmBf8ZdeERaFJCnVtdmbSb5tij5Xnzql/Z6xL8dZbNSvk7XQi2vbbNduZzf1mPxv6rlMvvzuZV7z28d0n5jX4Xxr/ijxzbO5fjw2dGbvHksPzyT1PjC4ZP0eHwa9VdWjpvIwPr5YhBoq3tpaOlNtKObddtanNs21bGvviek86PC/i+iP5PAPlLN+bm/9Aanf4zlYW3yZqml7YEZuje+3QNpcOHt84VuamPFw7LQhV+df70OCs38cGBVmWSAIDlaQ5wcblP5I84AJ0hkDmWnOIA8DS+ezIns8nZnX2GJI8l8/x2xFXhYHr7XpeCH9apKpTSKYAcpvU6a/0qB7i4fJ2Tmt/5qldOFYb7wb28qFNFYfuGA0D4lEjm3/HHophqi8Siy0W9SoHmuvuqHJEufbzReoVSgwpUqVEBamt4hCEmiPzBM+uPKvVaFSIqUW201I8yLBwn5WBqtqBV6RG1GpVah0a4vuNn8QMRmGM2A9jsoIdub3+X/o4DfCXiArOMyjpdlXzFHbrn7PVTYJZRTHkksJ0hVtaRP7+ylFiih2K6jyI6W4cY4ubuTprIzzCaGKOI6Q5a3TLQ7QpsHCfFUgOI2T4q6WxtaR6cLxIhB0XEdI9Ed99ok6N9gYjOhhqqZDsWXQ2OFrGZUKBRwDk4t9jkaBdbYqHgcE87RXQ0t/f65zytDQNiUGYYcA0NDuCwK+gLzQVcw/OkxmmGGAr4fegP4BpDnCc1l5DJz08vrpHfLCHOVa2QP1koTi2Q/y0A';

let icon3 = 'data:image/webp;base64,UklGRtwCAABXRUJQVlA4TM8CAAAvH8AHEP/jIJIkRZrFZ1uv/W0wM8NOtQ0HkSQpUj0zo4b38v4dMDPNdEOOJEmRFDnLqL9ijE9muuvuqar5DwPIghMODATDgRMwBwrm76yRffzz8A0Fo6i4a7l0h3ZWhbG776aa+Pnfm4/mwinefrv77u0PCk4OKhgUAjUHIkhAUAqGMpAigQQBT0gShWZIkGGGgBnDBkZVqI5eJyRQJbWIlFKKSIh+kJGFbkGsBC+HQVGS0S1IBV0kGglYAQlEJIKxllrUvt/k/y8+n3/H+9nnlvx+RYvadrf3/SbIIZP64blN3oO77yrcK1eH48n5evNrfN1uDy7zKX1hoyqQs3DY2a9FXwkhsVip9ORF8XdipZr/UJptaW7KpDJZXsjB0yDXa4tB2m1batsozMwMGjNKM1KYmZmZaSK7qEqlH9+YSp/fjej/BCj/n8kEkAuJ56dnK4l32ZJHu9g/uLp/tWQiK/IIe9/zv377sXfzYsksODbJxBF2tr/v7l08WzIT1x7FUADPH+6Od3cOT28eLZmWi9Gxni5Cny8UfHd3hpPT64dEOm7Dz3y1W2Xo6YInFHl/eQa6fZKpnK2u8vwm9qbaxbyRj3eX5+m4W/VNZfnlbxUAhSzw5ZaerBTu5kpRZ0cTWHkeFRSWNvZVtrDOz68WJVJsTVSWVDMAhR2V+cUtalEL67OtNJzVlX6V/VrV1lLTorZXMsC2SCopJmfW1ieG+1WGktbu3uZaX8CTwZQ2ML60sjTM0FVdUlEX9Id9zLakkmo2LmJRDM0vLo0M+wLBkNA8qk1KGnNxwU1AD03Oj4VjGhdRtmAr6cxrhtDJMAESMF5MGWIrTjpk6ybXDRMCACjxwkMjG25aTsQUmiGIm4YAJTX4lx0lfVeQbhpcJ8EJSR6d2HQzIICbQouZGhefTBpctZXMHdiCk/bi6BSfdpTsAoAGnWsO5dAGQMq/FAA=';

function spawnNotification(body, color, icon, requireInteraction = false, actions = []) {
  c.canvas.width = 280
  c.canvas.height = 5
  c.fillStyle = color
  c.fillRect(0,0,progress,30)
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
  let alarms = await chrome.alarms.getAll()
  if (alarms.length === 0) {
    return;
  } 
  let mainAlarm = alarms.find(x => x.name=='main')
  if (!mainAlarm) {
    drawMinutesLeft(-1)
    return;
  }
  
  let distance = mainAlarm.scheduledTime - new Date().getTime();
  let minutesLeft = Math.min(60, Math.floor(distance / (1000 * 60)));
  
  drawMinutesLeft(minutesLeft)
}

function drawMinutesLeft(minutesLeft) {
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
  c.getImageData(0,0,32,32,{willReadFrequently:true})
  chrome.action.setIcon({imageData:c.getImageData(0,0,32,32,{willReadFrequently:true})})
}

(async function() {
  
  let alarms = await chrome.alarms.getAll()
  if (alarms.length > 0) {
    updateTime();
    // chrome.action.setIcon({ path: icon1 })
  } else {
    chrome.action.setIcon({ path: icon3 })
  }
  
})();