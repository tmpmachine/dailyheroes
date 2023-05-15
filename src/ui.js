window.ui = (function () {
  
  let SELF = {
    Init,
    SetFocusEl,
  };
  
  function Init() {
    initSimpleElementFilter();
    attachKeyboardShortcuts();
  }
  
  function SetFocusEl(el) {
    let interval = window.setInterval(function() {
      if (document.activeElement == el) {
        clearInterval(interval);
      } else {
        document.activeElement.blur();
        el.focus();
      }
    }, (4));
  }
  
  function initSimpleElementFilter() {
    listenAndToggleVisibility('#node-filter-box', '[data-slot="title"]', 'd-none', '#tasklist-container [data-obj="task"]')
  }
  
  function attachKeyboardShortcuts() {
    Mousetrap.bind('alt+n', function(e) {
      showModalAddTask()
      return false;
    });
  }
  
  const listenAndToggleVisibility = (inputSelector, selector, visibleClass, containerSelector) => {
    let element = document.querySelector(inputSelector);
    element.addEventListener('input', () => {
      const inputValue = element.value.toLowerCase();
      for (let node of document.querySelectorAll(containerSelector)) {
        const selectorValue = node.querySelector(selector).textContent.toLowerCase();
        if (selectorValue.includes(inputValue)) {
          node.classList.remove(visibleClass);
        } else {
          node.classList.add(visibleClass);
        }
      }
    });
  };
  
  SELF.updateProgressBar = function() {
    
  };
  
  SELF.loadSleepTime = async function() {
    let data = await window.service.GetData('sleepTime');
    let initial = (data.sleepTime ? data.sleepTime : 22 * 60);
    $('#txt-sleeptime').textContent = minutesToTimeString(initial);
  };
  
  SELF.updateUI = function(isTimerRunning) {
    if (!isTimerRunning) {
      $('#live-history').textContent = '';
      // countdown
      $('#txt-countdown').textContent = '00:00:00';
      $('.NzE2ODYyNQ-progress-bar-fill').style.width = '0%';
    }
    $('.progress-bar').classList.toggle('progress-bar-fill--animated', isTimerRunning);
    $('.progress-bar-fill').classList.toggle('progress-bar-fill--animated', isTimerRunning);
    
    // timer progress
    $('.NzE2ODYyNQ-progress-bar').classList.toggle('progress-bar-fill--animated', isTimerRunning);
    $('.NzE2ODYyNQ-progress-bar-fill').classList.toggle('progress-bar-fill--animated', isTimerRunning);
    
    
    let activeTaskEl = $('#tasklist [data-state="--active"]');
    if (activeTaskEl) {
      updateActiveTaskProgressBar(activeTaskEl, isTimerRunning);
    }
  };
  
  function updateActiveTaskProgressBar(activeTaskEl, isTimerRunning) {
    if (!isTimerRunning) {
      activeTaskEl.querySelector('[data-obj="live-progress"]').textContent = ``;
    }
    activeTaskEl.querySelector('[data-role="progress-bar"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', isTimerRunning);
    activeTaskEl.querySelector('[data-role="progress-bar-container"]').classList.toggle('NzA5ODc1NQ-progress-bar-fill--animated', isTimerRunning);
    
    // if (isTimerRunning) {
    //   SELF.updateTaskProgressBar();
    // }
  }
  
  SELF.updateTaskProgressBar = async function(id, isRunning = true) {
    let task = tasks.find(x => x.id == id);
    if (!task) {
      return;
    }
    
    let taskEl = $(`#tasklist [data-id="${id}"]`);
    if (!taskEl) {
      return;
    }
    if (!task.target) {
      return;
    }
    
    let liveProgressTime = 0;
    let liveProgress = 0;
    if (isRunning) {
      liveProgress = await getActiveTimerDistance();
      liveProgressTime = await getActiveTimerDistanceTime();
    }
    let percentageProgressTime = Math.min(100, Math.floor((task.progressTime + liveProgressTime) / minutesToMs(task.target) * 10000) / 100);
    // isCompleted = (percentageProgressTime >= minutesToMs(task.target));
  	taskEl.querySelector('[data-slot="completionPercentage"]').textContent = `(${percentageProgressTime}%)`;
    taskEl.querySelector('[data-obj="live-progress"]').textContent = `(+${msToMinutes(liveProgressTime)}m)`;
      
  	taskEl.querySelector('[data-slot="targetString"]').textContent = `${minutesToHoursAndMinutes(task.target - msToMinutes(task.progressTime) - liveProgress)} left`;
  	taskEl.querySelector('[data-role="progress-bar"]').style.width = percentageProgressTime+'%';
    
  };
  
  return SELF;
  
})();