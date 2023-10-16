let uiComponent = (function () {
  
  let SELF = {
    ShowModalAddTask,
    
    // groups
    Navigate,
    BuildBreadcrumbs,

    Init,
    SetFocusEl,
  };

  function Init() {
    initSimpleElementFilter();
    attachKeyboardShortcuts();
    
    initBreadcrumbListener();
    BuildBreadcrumbs();
  }
  
  function BuildBreadcrumbs() {
    
    let breadcrumbs = [];
    
    // push the root path
    breadcrumbs.push({
      id: '',
      name: (isViewModeMission() ? 'Mission' : 'Home'),
      parentId: '',
    });
    
    try {
      let safeLoopCount = 0;
      let subPaths = [];
      foobar(subPaths, lsdb.data.activeGroupId, safeLoopCount);
      breadcrumbs = [...breadcrumbs, ...subPaths];
    } catch (err) {
      console.error(err)
    }
      
    $('#container-breadcrumbs').innerHTML = '';
    for (let item of breadcrumbs) {
      if (item.id == lsdb.data.activeGroupId) {
        $('#container-breadcrumbs').innerHTML += `
          <small> / ${item.name}</small>
        `;
      } else {
        $('#container-breadcrumbs').innerHTML += `
          <button data-id="${item.id}" style="font-size:12px">${item.name}</button>
        `;
      }
    }

  }
  
  function foobar(breadcrumbs, parentId, safeLoopCount) {
    let activeGroup = lsdb.data.groups.find(x => x.id == parentId);
    if (activeGroup) {
      breadcrumbs.splice(0, 0, activeGroup);
      let safeLoopCount = 10;
      let parentId = activeGroup.parentId;
      if (parentId != '') {
        // safe loop leaking
        if (safeLoopCount > 10) {
          throw 'overflow';
        }
        foobar(breadcrumbs, parentId, safeLoopCount + 1);
      }
    }
  }
  
  function Navigate(id) {
    if (isViewModeMission()) {
      if (lsdb.data.topMostMissionPath == '' && isTopMissionPath(id)) {
        lsdb.data.topMostMissionPath = id;
      } else if (id == '') {
        lsdb.data.topMostMissionPath = '';
      }
    }
    lsdb.data.activeGroupId = id;
    lsdb.save();
    BuildBreadcrumbs();
  }
  
  function initBreadcrumbListener() {
    $('#container-breadcrumbs').addEventListener('click', (evt) => {
      if (evt.target.tagName == 'BUTTON') {
        Navigate(evt.target.dataset.id);
        TaskListTask();
      }
    });
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
    listenAndToggleVisibility('#node-filter-box', '[data-slot="title"]', 'd-none', '#tasklist-container [data-obj="task"]');
  }
  
  function attachKeyboardShortcuts() {
    Mousetrap.bind('alt+n', function(e) {
      ShowModalAddTask({
	      parentId: lsdb.data.activeGroupId,
      });
      return false;
    });
  }

  function ShowModalAddTask(defaultValue = {}) {
    let modal = document.querySelectorAll('#projects-modal')[0].toggle();
    let form = modal.querySelector('form');
    form.reset();
    form.querySelectorAll('[type="hidden"]').forEach(el => el.value = '');

    modal.classList.toggle('modal--active', modal.isShown);
    modal.addEventListener('onclose', function() {
      modal.classList.toggle('modal--active', false);
    });
    uiComponent.SetFocusEl(modal.querySelector('input[type="text"]'));

    // set default value
    if (typeof(defaultValue.parentId) == 'string') {
      modal.querySelector('[name="parent-id"]').value = defaultValue.parentId;
    }
    
    for (let key in defaultValue) {
      let inputEl = form.querySelector(`[name="${key}"]`);
      if (!inputEl) continue;
      
      inputEl.value = defaultValue[key];
    }
  }
  
  // search input
  const listenAndToggleVisibility = (inputSelector, selector, visibleClass, containerSelector) => {
    let element = document.querySelector(inputSelector);
    let classDisplayNone = 'd-none';
    
    element.addEventListener('input', () => {
      const inputValue = element.value.toLowerCase();
      let labelFilterValue = $('#in-filter-search-label').value;
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
    
    
    let activeTaskEl = $('#tasklist [data-kind="task"][data-state="--active"]');
    if (activeTaskEl) {
      updateActiveTaskProgressBar(activeTaskEl, isTimerRunning);
    }
  };
  
  function updateActiveTaskProgressBar(activeTaskEl, isTimerRunning) {
    if (!isTimerRunning) {
      activeTaskEl.querySelector('[data-obj="live-progress"]').textContent = ``;
      
      // update sub task live progress
      let activeNoteEl = $kind({kind:'note', state:'--active'}, activeTaskEl);
      if (activeNoteEl) {
        let noteProgressEl = $kind({kind:'progress'}, activeNoteEl);
        noteProgressEl.textContent = ``;
      }
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

    // accumulates child task progress
    let totalMsProgressChildTask = tasks.filter(x => x.parentId == id).reduce((total, item) => total+item.totalProgressTime, 0);

    let percentageProgressTime = Math.min(100, Math.floor((task.progressTime + liveProgressTime + totalMsProgressChildTask) / minutesToMs(task.target) * 10000) / 100);
    // isCompleted = (percentageProgressTime >= minutesToMs(task.target));
  	taskEl.querySelector('[data-slot="completionPercentage"]').textContent = `(${percentageProgressTime}%)`;
    taskEl.querySelector('[data-obj="live-progress"]').textContent = `(+${msToMinutes(liveProgressTime)}m)`;

    // update sub task note live progress
    let activeNoteEl = $kind({kind:'note', state:'--active'}, taskEl);
    if (activeNoteEl) {
      let noteProgressEl = $kind({kind:'progress'}, activeNoteEl);
      noteProgressEl.textContent =  `(+${msToMinutes(liveProgressTime)}m)`;
    }
      
  	taskEl.querySelector('[data-slot="targetString"]').textContent = `${minutesToHoursAndMinutes(task.target - msToMinutes(task.progressTime) - liveProgress)} left`;
  	taskEl.querySelector('[data-role="progress-bar"]').style.width = percentageProgressTime+'%';
    
  };
  
  return SELF;
  
})();