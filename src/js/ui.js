let uiComponent = (function () {
  
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
  };
  
  function NavigateScreen(evt) {
    
    let targetNavigateName = evt.target.dataset.navigateTo;
    if (!targetNavigateName) return;
    
    let activeClass = 'is-active';
    
    // screen elements check
    let activeScreenEl = $(`.container-screen.${activeClass}`);
    let targetScreenEl = $(`.container-screen[data-navigate-name="${targetNavigateName}"]`);
    if (!targetScreenEl || !activeScreenEl) return;
    
    activeScreenEl.classList.remove(activeClass);
    targetScreenEl.classList.add(activeClass);
    
  }
  
  function UpdateViewModeState() {
    document.body.classList.toggle('is-view-mode-mission', isViewModeMission())
    
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
  }

  function Init() {
    initSimpleElementFilter();
    attachKeyboardShortcuts();
    
    initBreadcrumbListener();
    BuildBreadcrumbs();
    
    // # mission and mission groups
    uiComponent.UpdateViewModeState();
    uiMission.ListGroup();
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
        console
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
    
    // set form add/edit mode
    let isEditMode = (defaultValue.id !== undefined)
    modal.classList.toggle('is-view-mode-edit', isEditMode);
    
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



let uiMission = (function() {
  
  let SELF = {
    ListGroup,
    NewGroup,
    RenameActiveGroup,
    OnChangeGroup,
    DeleteGroupByName,
  }
  
  function ListGroup() {
    __refreshGroupList()
  }
  
  function __refreshGroupList() {
    let groups = compoMission.GetGroups();
    let activeGroupId = compoMission.GetActiveGroupId();
    
    $('#in-sel-mission-group').innerHTML = '';
    let docFrag = document.createDocumentFragment();
    
    for (let item of groups) {
      let el = document.createElement('option');
      el.textContent = item.title;
      el.value = item.id;
      docFrag.append(el);
      
      if (item.id == activeGroupId) {
        el.selected = true;
      }
    }
    
    $('#in-sel-mission-group').append(docFrag);
  }
  
  function NewGroup() {
    
    let title = __promptUser()
    if (!title) return;
    
    compoMission.AddGroup(title)
    
    __saveAppData();
    __refreshGroupList()
  }
  
  function __saveAppData() {
    lsdb.save();
  }
  
  function __promptUser(defaultValue = '') {
    return window.prompt('Enter collection name to delete (only inactive collection can be deleted)', defaultValue);
  }
  
  function __confirmUser(groupName) {
    return window.confirm(`Are you sure to delete this collection : ${groupName}?`);
  }
    
  function RenameActiveGroup() {
    
    let group = compoMission.GetActiveGroup();

    let title = __promptUser(group.title);
    if (!title) return;
    
    let id = group.id;
    let success = compoMission.UpdateGroupTitle(id, title);
    
    if (success) {
      __saveAppData();
      __refreshGroupList();
    } else {
      console.log('failed to rename group');
    }
  }
    
  function OnChangeGroup(inputSelectEvt) {
    
    let evt = inputSelectEvt;
    let id = evt.target.value;
    
    let success = compoMission.SetActiveGroupById(id)
    if (success) {
      __resetMissionView()
      __saveAppData()
      __refreshMissionList()
    } else {
      console.log('failed to change group')
    }
  }
  
  function DeleteGroupByName() {
    let title = __promptUser();
    if (!title) return;
    
    let group = compoMission.GetGroupByName(title);
    if (!group) return;
    
    if (group.id == compoMission.GetActiveGroupId()) {
      alert('Cannot delete active collection');
      return;
    }
    
    RemoveGroup(group);
  }
  
  
  function __resetMissionView() {
    resetActiveGroupId();
    uiComponent.BuildBreadcrumbs();
  }
  
  function __refreshMissionList() {
    TaskListTask();
  }
    
  function RemoveGroup(group) {
    let isConfirm = __confirmUser(group.title)
    if (!isConfirm) return;
    
    let deletedGroup = compoMission.DeleteGroupById(group.id);
    
    if (deletedGroup != null) {
      __saveAppData()
    } else {
      console.log('failed to delete group')
    }
      
    __refreshGroupList()
  }
      
  
  return SELF;
  
})();