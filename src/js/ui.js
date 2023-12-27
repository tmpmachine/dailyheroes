let ui = (function () {
  
  let $$ = document.querySelectorAll.bind(document);
  
  let SELF = {
    TaskLinkTaskWithIdToActiveSequence,
    TaskLinkTaskToSequenceByTaskIdInteractiveMode,
    TaskConvertCollectionSequence,
    ResetProgressSequenceFromForm,
    OpenLinkedSequenceFromForm,
    DeleteTaskFromForm,
    DeleteSequenceFromForm,
    ShowModalAddTask,
    ShowModalAddSequence,
    AddSequenceTask,
    EditSequenceTask,
    OnSubmitSequenceTask,
    OnSubmitTask,
    
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
    RemoveElSequenceById,
    HotReloadListSequenceByTaskId,
    TaskSetActiveTaskInfo,
    RefreshTimeStreak,
    OpenPriorityMapper,
    TaskSavePriorityMapper,
    HandleInputPrioritySlider,
    PickCollection,
    TaskSaveTaskWithIdToSequence,
    ToggleManageSequenceByTaskId,
    ToggleExpandSequenceTask,
    FinishInteractiveSequencePick,
  };
  
  function FinishInteractiveSequencePick() {
    data.prePickCollectionId = null;
    viewStateUtil.Remove('features', ['interactive-sequence-task-pick']);
  }
  
  function ToggleManageSequenceByTaskId(taskId) {
    let el = $(`[data-obj="task"][data-id="${taskId}"]`);
    if (!el) return;
    
    let items = Array.from(new Set(el.dataset.viewStates.replace(/ +/g,' ').trim().split(' ')));
    if (items.includes('manage-sequence')) {
      items = items.filter(item => item != 'manage-sequence');
    } else {
      items.push('manage-sequence');
    }

    el.dataset.viewStates = items.join(' ');
  }
  
  function ToggleExpandSequenceTask(taskId) {
    let el = $(`[data-obj="task"][data-id="${taskId}"]`);
    if (!el) return;
    
    let items = Array.from(new Set(el.dataset.viewStates.replace(/ +/g,' ').trim().split(' ')));
    if (items.includes('sequence')) {
      items = items.filter(item => item != 'sequence');
    } else {
      items.push('sequence');
    }

    el.dataset.viewStates = items.join(' ');
  }
  
  async function TaskSaveTaskWithIdToSequence(linkedTaskId) {
    
    if (!data.prePickCollectionId) {
      alert('You have not set sequence task ID');
      return;
    }
    
    if (linkedTaskId == data.prePickCollectionId) {
      alert(`Could not add task as it's own sequence task`);
      return;
    }
    
    let task = compoTask.GetById(data.prePickCollectionId);
    let linkedTask = compoTask.GetById(linkedTaskId);
    
    compoSequence.Stash(task.sequenceTasks);
    
    let targetTime = linkedTask.target * 60 * 1000;
    compoSequence.AddLinkedTask(linkedTask.id, targetTime);  
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();
      
    await app.TaskListTask();
    
  }
  
  function PickCollection() {
    let userVal = window.prompt('Set sequence task ID');
    if (!userVal) return;
    
    let task = app.GetTaskById(userVal);
    if (!task) {
      alert('Task not found');
      return;
    }
    
    data.prePickCollectionId = userVal;
  }
  
  async function TaskLinkTaskToSequenceByTaskIdInteractiveMode(id) {
    data.prePickCollectionId = id;
    viewStateUtil.Add('features', ['interactive-sequence-task-pick']);
  }
  
  async function TaskLinkTaskWithIdToActiveSequence(id) {

    if (data.prePickCollectionId == id) {
      alert('Cannot self-linking task as sequence. Try picking another task.');
      return;
    }
    
    let task = compoTask.GetById(data.prePickCollectionId);
    let linkedTask = compoTask.GetById(id);
    
    compoSequence.Stash(task.sequenceTasks);
    
    let targetTime = linkedTask.target * 60 * 1000;
    compoSequence.AddLinkedTask(linkedTask.id, targetTime);  
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();
      
    let taskEl = $(`#tasklist-container [data-obj="task"][data-id="${id}"]`);
    viewStateUtil.Add('task', ['sequence-added'], taskEl);
    
  }
  
  async function TaskConvertCollectionSequence() {
    
    let collectionTaskIds = compoMission.GetMissions().map(x => x.id);
    
    if (collectionTaskIds.length == 0) return;
    
    let task = compoTask.Add({
      title: 'Untitled sequence',
      target: 1,
      parentId: '',
    });
    
    compoSequence.Stash(task.sequenceTasks);
    
    let sequenceIds = [];
    

    for (let id of collectionTaskIds) {
      // remove from current collection
      compoMission.RemoveMissionById(id);
      
      // add linked task sequence
      let task = compoTask.GetById(id);
      let targetTime = task.target * 60 * 1000;
      let sequenceTask = compoSequence.AddLinkedTask(task.id, targetTime);  
      sequenceIds.push(sequenceTask.id);
    }
    
    let success = compoSequence.SetActiveById(sequenceIds[0]);

    let missionData = compoMission.CreateItemMission(task.id);
    compoMission.AddMission(missionData);
    
    compoSequence.Commit();
    compoMission.Commit();
    
    appData.Save();
    await appData.TaskStoreTask();
    
    await app.TaskListTask();
    
  }
  
  function ResetProgressSequenceFromForm(evt) {
    let form = evt.target.form;
    let seqId = form.id.value;
    let taskId = form.taskId.value;
    
    compoTask.TaskResetSequenceById(taskId, seqId);
    
    $('#task-sequence-modal').close();
    ui.RefreshListSequenceByTaskId(taskId);
  }
  
  function OpenLinkedSequenceFromForm(evt) {
    let form = evt.target.form;
    let taskId = form.taskId.value;
    
    app.TaskNavigateToMission(taskId);
    
    $('#task-sequence-modal').close();
  }
  
  function DeleteSequenceFromForm(evt) {
    let form = evt.target.form;
    let seqId = form.id.value;
    let taskId = form.taskId.value;
    
    compoTask.TaskDeleteSequenceById(taskId, seqId);
    
    $('#task-sequence-modal').close();
    ui.RefreshListSequenceByTaskId(taskId);
  }
  
  function DeleteTaskFromForm(evt) {
    let form = evt.target.form;
    let id = form.id.value;
    
    // console.log(id)
    let taskEl = $(`[data-obj="task"][data-id="${id}"]`);
    if (!taskEl) {
      alert('failed');
      return;
    }
    
    app.TaskDeleteTask(id, taskEl);
    $('#task-modal').close();
  }
  
  function ResetProgressTaskFromForm(evt) {
    let form = evt.target.form;
    let id = form.id.value;
    
    // console.log(id)
    let taskEl = $(`[data-obj="task"][data-id="${id}"]`);
    if (!taskEl) {
      alert('failed');
      return;
    }
    
    app.TaskDeleteTask(id, taskEl);
    $('#task-modal').close();
  }
  

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
  
  function HotReloadListSequenceByTaskId(id) {
    
    let item = app.GetTaskById(id);
    let container = $(`#tasklist-container [data-obj="task"][data-id="${item.id}"] [data-container="sequence-tasks"]`);
    let taskEl = $(`#tasklist-container [data-obj="task"][data-id="${item.id}"]`);
    
    if (!container) return;
    
    compoSequence.Stash(item.sequenceTasks);
  	
  	let activeId = compoSequence.GetActiveId();
  	let items = compoSequence.GetAll();
    let docFrag = document.createDocumentFragment();
    
    for (let item of items) {
      // toggle active
      let el = container.querySelector(`[data-kind="item-sequence-task"][data-id="${item.id}"]`);
      el.classList.toggle('is-active', (item.id == activeId));
    }
    
  }
  
  function RemoveElSequenceById(id, taskId) {
    let container = $(`#tasklist-container [data-obj="task"][data-id="${taskId}"] [data-container="sequence-tasks"]`);
    if (!container) return;
    
    let seqEl = container.querySelector(`[data-kind="item-sequence-task"][data-id="${id}"]`);
    if (!seqEl) return;
    
    seqEl.remove();
  }
  
  function RefreshListSequenceByTaskId(id, container) {
    
    let item = app.GetTaskById(id);
    let taskEl = null;
    
    if (container) {
      taskEl = container.closest('[data-obj="task"]');
    }
    
    if (!container) {
      container = $(`#tasklist-container [data-obj="task"][data-id="${item.id}"] [data-container="sequence-tasks"]`);
      taskEl = $(`#tasklist-container [data-obj="task"][data-id="${item.id}"]`);
    }
    
    if (!container) return;
    
    container.innerHTML = '';
    
    compoSequence.Stash(item.sequenceTasks);
  	
  	let activeId = compoSequence.GetActiveId();
  	let items = compoSequence.GetAll();
    let docFrag = document.createDocumentFragment();
    
    for (let item of items) {
      
      let ratioTimeLeftStr = '';
      let linkedTaskPath = '';
      
      let linkedTask = null;
      if  (item.linkedTaskId) {
        linkedTask = compoTask.GetById(item.linkedTaskId);
        if (linkedTask) {
          ratioTimeLeftStr = `${ secondsToHMS(msToSeconds(linkedTask.targetTime)) }`;
          
          // show mission path
          linkedTaskPath = getAndComputeMissionPath(linkedTask.parentId);
        }
      }
      
      // time left info
      let timeLeftStr = '';
      
      {
        let timeLeft = Math.max(0, item.targetTime - item.progressTime);
        timeLeftStr = secondsToHMS(msToSeconds(timeLeft));
      }
      
      
      let title = linkedTask ? linkedTask.title : item.title;
      let repeatCountProgressLabel = '';
      if (item.repeatCount > 0) {
        repeatCountProgressLabel = `${item.counter.repeatCount}/${item.repeatCount}`;
      }
      
      let el = window.templateSlot.fill({
        data: {
          title,
          ratioTimeLeftStr,
          linkedTaskPath,
          repeatCountProgressLabel,
          targetTimeStr: secondsToHMS(msToSeconds(item.targetTime)), 
          timeLeftStr: ` -- ${timeLeftStr} left`,
        }, 
        template: document.querySelector('#tmp-list-sequence-task').content.cloneNode(true), 
      });
      
      if (linkedTask) {
        el.querySelector('[data-kind="item-sequence-task"]').dataset.viewStates = 'linked-task';
      }
      el.querySelector('[data-kind="item-sequence-task"]').dataset.id = item.id;
      el.querySelector('[data-kind="item-sequence-task"]').classList.toggle('is-active', (item.id == activeId));
      
      docFrag.append(el);
    }
    
    container.append(docFrag);
    
    if (taskEl && items.length > 0) {
      viewStateUtil.Add('task', ['sequence'], taskEl);
    }
    
  }
  
  function SetGlobalTimer() {
    $('#txt-global-preset-timer').textContent = app.GetGlobalTimerStr();
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
  
  async function TaskSavePriorityMapper() {
    
    let nodes = $$('[data-container="list-priority-mapper"] .item');
    
    for (let node of nodes) {
      let id = node.dataset.id;
      let priorityPoint = parseInt(node.querySelector('input').value);
      compoPriorityMapper.UpdateById({
        ratio: priorityPoint,
      }, id);
    }
    
    compoPriorityMapper.Commit();
    await appData.TaskStoreTask();
    
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

    let pressed = {};
    
    function watch(type, key) {
      if (type == 'keydown') {
        if (pressed[key]) {
          
        } else {
          pressed[key] = true;
          return true;
        }
      } else {
        pressed[key] = false;
      }
      
      return false;
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
        if (event.ctrlKey && event.altKey) {
          app.ToggleStartTimerAvailableTime();
          event.preventDefault();
        } else if (event.altKey) {
          toggleStartTimer();
          event.preventDefault();
        }
      }
    }
  }

  function ShowModalAddTask(modalData = {}) {
    
    viewStateUtil.RemoveAll('form-task');
    
    let formValue = {
      parentId: lsdb.data.activeGroupId,
      target: app.GetGlobalTimerStr(),
      taskType: 'T',
    };
    
    let formData = Object.assign(formValue, modalData.formData);
    
    let isEditMode = (formData.id !== undefined);
    
    if (!isEditMode) {
      if (isViewModeMission()) {
        formValue.taskType = 'M';
      }
    }
    
    if (formValue.taskType == 'M') {
      viewStateUtil.Add('form-task', ['collection-only']);
    }
    
    // set form add/edit mode
    if (isEditMode) {
      viewStateUtil.Add('form-task', ['edit']);
    } else {
      viewStateUtil.Add('form-task', ['add']);
    }
    
    if (viewStateUtil.HasViewState('task-view-mode', 'mission')) {
      viewStateUtil.Add('form-task', ['mission-tab']);
    }
    
    let modal = document.querySelectorAll('#task-modal')[0].toggle();
    
    // fill modal data
    modal.querySelector('[data-id="readOnlyId"]').textContent = modalData.readOnlyId;
    
    let form = modal.querySelector('form');
    form.reset();
    form.querySelectorAll('[type="hidden"]').forEach(el => el.value = '');

    modal.classList.toggle('modal--active', modal.isShown);
    modal.addEventListener('onclose', function() {
      modal.classList.toggle('modal--active', false);
    });
    ui.SetFocusEl(modal.querySelector('input[type="text"]'));

    // set default value
    if (typeof(formData.parentId) == 'string') {
      modal.querySelector('[name="parent-id"]').value = formData.parentId;
    }
    
    for (let key in formData) {
      let inputEl = form.querySelector(`[name="${key}"]`);
      if (!inputEl) continue;
      
      inputEl.value = formData[key];
    }
    
  }
  
  async function OnSubmitTask(ev) {
  
		ev.preventDefault();
		
    let form = ev.target;
    
    if (form.id.value.length > 0) {
      
      let task = await app.TaskUpdateTask(form);
      
      await appData.TaskStoreTask();
      partialUpdateUITask(task.id, task);
      form.reset();
      
      app.SyncGroupName(task.id, task.title, task.parentId);
        
    } else {
      
      let taskId = await app.TaskAddTask(form);
      
      if (isViewModeMission()) {
        let missionData = compoMission.CreateItemMission(taskId);
        compoMission.AddMission(missionData);
  
        compoMission.Commit();
  
        appData.Save();
      }
      
      // set as active task if none is active
      let data = await window.service.GetData('start');
      if (!data.start && taskId) {
        await window.service.SetData({'activeTask': taskId});
      }
      await appData.TaskStoreTask();
      await app.TaskListTask();
    
      form.reset();
      updateUI();
      
    }
    
		let modal = document.querySelectorAll('#task-modal')[0].toggle();
		modal.close();
		
  }
  
  function partialUpdateUITask(id, task) {
    let el = $(`[data-obj="task"][data-id="${id}"]`);
    el.querySelector('[data-slot="title"]').textContent = task.title;
    el.querySelector('[data-slot="ratioTimeLeftStr"]').textContent = minutesToHoursAndMinutes(msToMinutes(task.targetTime));
  }
  
  function OnSubmitSequenceTask(ev) {
  
		ev.preventDefault();
		let form = ev.target;
		
		let id = form.id.value;
		let taskId = form.taskId.value;
		let title = form.title.value.trim();
		
    let durationTimeInput = form.duration.value;
    if (isNumber(durationTimeInput)) {
      // set default to minutes
      durationTimeInput = `${durationTimeInput}m`;
    }
    let durationTime = parseHmsToMs(durationTimeInput);
    if (durationTime <= 0) return;
    
    // repeat data
    let repeatCount = 0;
    let repeatRestDurationTime = 0;
    if (form.useRepeat.checked) {
      repeatCount = parseInt(form.repeatCount.value);
      repeatRestDurationTime = parseHmsToMs(form.repeatRestDurationTimeStr.value);
    }
		
    let inputData = {
      title,
      durationTime,
      repeatCount,
      repeatRestDurationTime,
    };
    
    if (ev.target.id.value.length > 0) {
      compoTask.UpdateSequence(inputData, taskId, id);
    } else {
      compoTask.AddSequence(inputData, taskId);
    }
    
		let modal = document.querySelectorAll('#task-sequence-modal')[0];
		modal.close();
		
    RefreshListSequenceByTaskId(taskId);
		
  }
  
  function AddSequenceTask(taskId) {
    let defaultValue = {
      taskId,
      duration: '7m',
    };
    ShowModalAddSequence(defaultValue);
  }
  
  function EditSequenceTask(taskId, id) {
    
    let task = compoTask.GetById(taskId);
    compoSequence.Stash(task.sequenceTasks);
    let sequenceTask = compoSequence.GetById(id);
    let linkedTask = null;
    
    if (sequenceTask.linkedTaskId) {
      linkedTask = compoTask.GetById(sequenceTask.linkedTaskId);
    }
    
    let defaultValue = {
      id,
      taskId,
      useRepeat: sequenceTask.repeatCount > 0,
      repeatCount: sequenceTask.repeatCount > 0 ? sequenceTask.repeatCount : 2,
      title: linkedTask ? linkedTask.title : sequenceTask.title,
      duration: secondsToHMS(msToSeconds(sequenceTask.targetTime)),
    };
    let options = {
      isLinkedTask: (linkedTask != null),
    };
    
    let form = ShowModalAddSequence(defaultValue, options);
  }
  
  function ShowModalAddSequence(defaultValue = {}, options = {}) {
    
    let formValue = {
    };
    
    defaultValue = Object.assign(formValue, defaultValue);
    
    let modal = document.querySelectorAll('#task-sequence-modal')[0].toggle();
    let form = modal.querySelector('form');
    form.reset();
    form.querySelectorAll('[type="hidden"]').forEach(el => el.value = '');

    modal.classList.toggle('modal--active', modal.isShown);
    modal.addEventListener('onclose', function() {
      modal.classList.toggle('modal--active', false);
    });
    ui.SetFocusEl(modal.querySelector('input[type="text"]'));

    // set form add/edit mode
    let isEditMode = (defaultValue.id !== undefined);
    if (isEditMode) {
      viewStateUtil.Set('form-task-sequence', ['edit']);
    } else {
      viewStateUtil.Set('form-task-sequence', ['add']);
    }
    
    if (options.isLinkedTask) {
      viewStateUtil.Add('form-task-sequence', ['linked-task']);
    } else {
      viewStateUtil.Remove('form-task-sequence', ['linked-task']);
    }
    
    
    for (let key in defaultValue) {
      let inputEl = form.querySelector(`[name="${key}"]`);
      if (!inputEl) continue;
      
      if (inputEl.type == 'checkbox') {
        inputEl.checked = defaultValue[key];
      } else {
        inputEl.value = defaultValue[key];
      }
    }
    
    return form;
    
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
  
  let data = {
    prePickCollectionId: null,
  };
  
  return SELF;
  
})();