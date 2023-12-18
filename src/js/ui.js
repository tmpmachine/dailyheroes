let ui = (function () {
  
  let $$ = document.querySelectorAll.bind(document);
  
  let SELF = {
    ShowModalAddTask,
    
    // groups
    Navigate,
    BuildBreadcrumbs,

    Init,
    SetFocusEl,
    UpdateViewModeState,
    
    // user prompt
    ShowConfirm,
    
    NavigateScreen,
    
    // screen util
    TaskTurnOffScreen,
    TurnOnScreen,
    ChangeGlobalPresetTimer,
    
    SetGlobalTimer,
    RefreshListSequenceByTaskId,
    TaskSetActiveTaskInfo,
    RefreshTimeStreak,
    OpenPriorityMapper,
    SavePriorityMapper,
    HandleInputPrioritySlider,
  };
  
  async function TaskSetActiveTaskInfo() {
    $('#txt-active-task-name').textContent = '';
    
    let activeTask = await getActiveTask();
    if (!activeTask) return;
      
    let ratioTimeLeftStr = '';
    let ratioTimeLeft = timeLeftRatio.find(x => x.id == activeTask.id);
    if (ratioTimeLeft && ratioTimeLeft.timeLeft > 0) {
      ratioTimeLeftStr = `${minutesToHoursAndMinutes(ratioTimeLeft.timeLeft)}`;
    }
    
    $('#txt-active-task-name').innerHTML = `${activeTask.title} ${ratioTimeLeftStr}`;
    
    RefreshTimeStreak();
  }
  
  function RefreshTimeStreak() {
    let streak = compoTimeStreak.GetActive();
    if (streak) {
      viewStateUtil.Add('active-task-info', ['on-streak']);
      $('#txt-time-streak').textContent = secondsToHMS(msToSeconds(streak.totalTimeStreak));
    } else {
      viewStateUtil.Remove('active-task-info', ['on-streak']);
    }
  }
  
  function RefreshListSequenceByTaskId(id, container) {
    
    let item = app.GetTaskById(id);
    
    if (!container) {
      container = $(`#tasklist-container [data-obj="task"][data-id="${item.id}"] [data-container="sequence-tasks"]`);
    }
    
    if (!container) return;
    
    container.innerHTML = '';
    
    compoSequence.Stash(item.sequenceTasks);
  	
  	let activeId = compoSequence.GetActiveId();
  	let items = compoSequence.GetAll();
    let docFrag = document.createDocumentFragment();
  	
    for (let item of items) {
      let el = window.templateSlot.fill({
        data: {
          title: item.title,
          targetTimeStr: secondsToHMS(msToSeconds(item.targetTime)), 
        }, 
        template: document.querySelector('#tmp-list-sequence-task').content.cloneNode(true), 
      });
      
      el.querySelector('[data-kind="item-sequence-task"]').dataset.id = item.id;
      el.querySelector('[data-kind="item-sequence-task"]').classList.toggle('is-active', (item.id == activeId));
      
      docFrag.append(el);
    }
    
    container.append(docFrag);
  }
  
  function SetGlobalTimer() {
    $('#txt-global-preset-timer').textContent = app.GetGlobalTimerStr()
  }
  
  function ChangeGlobalPresetTimer() {
    let globalTimerStr = app.GetGlobalTimerStr();
    
    let userVal = window.prompt('Value', globalTimerStr);
    if (!userVal) return;
    
    let parsedMinutes = parseHoursMinutesToMinutes(userVal);
    if (parsedMinutes === null) return;
    
    app.SetGlobalTimer(parsedMinutes);
    app.Commit();
    appSettings.Save();
    SetGlobalTimer();
  }
  
  function NavigateScreen(evt) {
    if (!evt.target.closest('[data-view-target]')) return;
    
    let viewTarget = evt.target.closest('[data-view-target]').dataset.viewTarget;
    if (!viewTarget) return;
    
    viewStateUtil.Set('screens', [viewTarget]);
  }
  
  function OpenPriorityMapper() {
    viewStateUtil.Set('screens', ['priority-mapper']);
    
    let activeTaskParentId = appData.GetActiveTaskParentId();
    
    compoPriorityMapper.Stash(activeTaskParentId);
    
    refreshListPriorityItems();
  }
  
  function HandleInputPrioritySlider(evt) {
    if (!evt.target.classList.contains('in-priority-slider')) return;
    
    let items = compoPriorityMapper.GetAll();
    let totalPriorityPoint = Array.from($$('[data-container="list-priority-mapper"] .in-priority-slider')).map(el => parseInt(el.value)).reduce((a,b)=>b+a,0);
    
    for (let item of items) {
      
      let el = $(`[data-container="list-priority-mapper"] [data-id="${item.id}"]`);
      let elSlider = el.querySelector('.in-priority-slider');
      let priorityPoint = parseInt(elSlider.value);
      
      // ROP info
      let ropStr = '';
      if (priorityPoint > 0) {
        let rop = Math.round(priorityPoint / totalPriorityPoint * 10000) / 100;
        ropStr = `${rop.toFixed(2)}%`;
      }
      
      el.querySelector('[data-slot="ropStr"]').textContent = ropStr;
    }
    
  }
  
  function SavePriorityMapper() {
    
    let nodes = $$('[data-container="list-priority-mapper"] .item');
    
    for (let node of nodes) {
      let id = node.dataset.id;
      let priorityPoint = parseInt(node.querySelector('input').value);
      compoPriorityMapper.UpdateById({
        ratio: priorityPoint,
      }, id);
    }
    
    compoPriorityMapper.Commit();
    appData.StoreTask();
    
    app.TaskListTask();
    viewStateUtil.Set('screens', ['home']);
  }
  
  function refreshListPriorityItems() {
    
    let parentTaskId = compoPriorityMapper.GetParentTaskId();
    let items = compoPriorityMapper.GetAll();
    
    let container = $('[data-container="list-priority-mapper"]');
    container.innerHTML = '';
    let docFrag = document.createDocumentFragment();
    
    let totalPriorityPoint = compoTask.GetTotalPriorityPointByParentTaskId(parentTaskId);
    
    for (let item of items) {
      
      // ROP info
      let ropStr = '';
      if (item.ratio) {
        let rop = Math.round(item.ratio / totalPriorityPoint * 10000) / 100;
        ropStr = `${rop.toFixed(2)}%`;
      }
      
      let el = window.templateSlot.fill({
        data: {
          ropStr,
          title: item.title,
        }, 
        template: document.querySelector('#tmp-list-priority-item').content.cloneNode(true), 
      });
      
      el.querySelector('[data-kind="item"]').dataset.id = item.id;
      el.querySelector('input').value = item.ratio;
      // el.querySelector('[data-kind="item"]').classList.toggle('is-active', (item.id == activeId));
      
      docFrag.append(el);
    }
    
    container.append(docFrag);
  }
  
  function UpdateViewModeState() {
    let groupState = 'task-view-mode';
    if (isViewModeMission()) {
      viewStateUtil.Set(groupState, ['mission']);
    } else {
      viewStateUtil.Set(groupState, ['task']);
      if (app.IsShowTargetTimeOnly()) {
        viewStateUtil.Add(groupState, ['filter-target']);
      }
    }
    
    // toggle class active tab
    let tabId = isViewModeMission() ? 'mission' : 'task';
    let activeClass = 'is-active';
    $ns(`.container-view-mode .${activeClass}`).classList.remove(activeClass);
    $(`.container-view-mode [data-id="${tabId}"]`).classList.add(activeClass);
  }
  
  let $ns = function(selector) {
    let el = $(selector);
    if (!el) return {classList:{remove:()=>{}}};
    
    return el;
  };

  function Init() {
    initSimpleElementFilter();
    attachKeyboardShortcuts();
    
    initBreadcrumbListener();
    BuildBreadcrumbs();
    
    // # mission and mission groups
    ui.UpdateViewModeState();
    uiMission.ListGroup();
    
    // # trackers
    uiTracker.Init();
  }
  
  async function TaskTurnOffScreen() {
    let isEnabled = await screenAwake.TaskEnable();
    if (isEnabled) {
      document.body.stateList.add('--screen-off');
      enterFullScreen();
    }
  }
  
  async function TurnOnScreen() {
    screenAwake.Disable();
    document.body.stateList.remove('--screen-off');
    exitFullscreen();
  }
  
  function enterFullScreen() {
    let elem = document.body;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        
      });
    }
  }
  
  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }
  
    
  function fullscreenchanged(event) {
    if (!document.fullscreenElement) {
      TurnOnScreen();
    }
  }
  document.addEventListener("fullscreenchange", fullscreenchanged);
  
  let lastTapTime = 0;
  let tapDelay = 300; // Adjust this value based on your needs (in milliseconds)
  
  $('.container-screen-off').addEventListener('touchstart', function(event) {
    let currentTime = new Date().getTime();
    let tapTimeDifference = currentTime - lastTapTime;
  
    if (tapTimeDifference < tapDelay) {
      // Double tap detected
      console.log('Double tap!');
      // Your double tap logic here
  
      // Reset last tap time
      lastTapTime = 0;
      ui.TurnOnScreen();
    } else {
      // Single tap
      lastTapTime = currentTime;
  
      // Your single tap logic here
    }
  
    // Prevent the default behavior of the touchstart event
    event.preventDefault();
  });


  let screenAwake = (function() {
    
    let wakeLock = null;
    
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          // isAwake = false;
          wakeLock = null;
        });
      } catch (err) {
        // console.error(`${err.name}, ${err.message}`);
        return false;
      }
      
      return true;
    };
     
    async function toggleWake() {
      if (wakeLock === null) {
        let isSuccess = await requestWakeLock();
        if (isSuccess) {
          // settingsUtil.set('uiState.keepAwake', true);
          // settingsUtil.save();
        } else {
          // settingsUtil.set('uiState.keepAwake', false);
          // settingsUtil.save();
        }
        return isSuccess;
      } else {
        // settingsUtil.set('uiState.keepAwake', false);
        // settingsUtil.save();
        wakeLock.release();
        wakeLock = null;
        return false;
      }
    }
    
    async function TaskEnable() {
      let isSuccess = await requestWakeLock();
      return isSuccess;
    }
    
    function Disable() {
      if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
      }
    }
    
    const handleVisibilityChange = () => {
      if (wakeLock == null && document.visibilityState === 'visible') {
        TurnOnScreen();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return {
      toggleWake,
      TaskEnable,
      Disable,
    };
  })();
  
  
  function toggleFullscreen() {
    let elem = document.body;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        console.log(err);
      });
    } else {
      document.exitFullscreen();
    }
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
      console.error(err);
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
        app.TaskListTask();
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
      ShowModalAddTask();
      return false;
    });
    
    // attach keyboard listeners
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('keyup', keyHandler);
  }
  
  function OnePress() {

    let pressed = {}
    
    function watch(type, key) {
      if (type == 'keydown') {
        if (pressed[key]) {
          
        } else {
          pressed[key] = true
          return true
        }
      } else {
        pressed[key] = false;
      }
      
      return false
    }
    
    function blur() {
      pressed = {};
    }
    
    return {
      watch,
      blur,
    };
  
  }
  
  let onePress = OnePress();

  function keyHandler(event) {
    if (event.key == 's') {
      if (onePress.watch(event.type, event.key)) {
        if (event.altKey) {
          toggleStartTimer();
        }
      }
    }
  }

  function ShowModalAddTask(defaultValue = {}) {
    
    let formValue = {
      parentId: lsdb.data.activeGroupId,
      target: app.GetGlobalTimerStr(),
    };
    
    defaultValue = Object.assign(formValue, defaultValue)
    
    let modal = document.querySelectorAll('#projects-modal')[0].toggle();
    let form = modal.querySelector('form');
    form.reset();
    form.querySelectorAll('[type="hidden"]').forEach(el => el.value = '');

    modal.classList.toggle('modal--active', modal.isShown);
    modal.addEventListener('onclose', function() {
      modal.classList.toggle('modal--active', false);
    });
    ui.SetFocusEl(modal.querySelector('input[type="text"]'));

    // set default value
    if (typeof(defaultValue.parentId) == 'string') {
      modal.querySelector('[name="parent-id"]').value = defaultValue.parentId;
    }
    
    // set form add/edit mode
    viewStateUtil.Remove('form-task', ['edit', 'add']);
    
    let isEditMode = (defaultValue.id !== undefined);
    if (isEditMode) {
      viewStateUtil.Add('form-task', ['edit']);
    } else {
      viewStateUtil.Add('form-task', ['add']);
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
  
  SELF.updateUI = function(isTimerRunning) {
    if (!isTimerRunning) {
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
  
  
  // # simple custom confirmation dialogue
  
  const showConfirmationButton = document.getElementById("showConfirmation");
  const confirmationPopup = document.getElementById("confirmationPopup");
  const confirmYesButton = document.getElementById("confirmYes");
  const confirmNoButton = document.getElementById("confirmNo");
  let modalResolver;
  
  function ShowConfirm() {
    return new Promise(resolve => {
      
      if (!app.isPlatformAndroid) {
        let isConfirm = window.confirm('Are you sure?');
        resolve(isConfirm)
        return;
      } 
      
      confirmationPopup.style.display = "block";
      modalResolver = resolve;
      
    })
  }
  
  confirmYesButton.addEventListener("click", () => {
      confirmationPopup.style.display = "none";
      modalResolver(true);
  });
  
  confirmNoButton.addEventListener("click", () => {
      console.log("Confirmed: No");
      modalResolver(false);
      confirmationPopup.style.display = "none";
  });
  
  // #
  
  return SELF;
  
})();