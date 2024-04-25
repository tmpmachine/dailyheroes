let ui = (function () {
  
  let $$ = document.querySelectorAll.bind(document);
  
  let SELF = {
    RefreshTaskCardAsync,
    FocusTaskById: FocusTaskElById,
    FocusTaskElById,
    TaskDistributeProgressTaskFromForm,
    TaskResetProgressTaskFromForm,
    NavigateViewTask,
    NavigateViewMission,
    TaskLinkTaskWithIdToActiveSequence,
    TaskMoveTaskWithIdToActiveSequence,
    TaskLinkTaskToSequenceByTaskIdInteractiveMode,
    ResetProgressSequenceFromForm,
    OpenLinkedSequenceFromForm,
    OpenLinkedSequenceInPriorityMapper,
    DeleteSequenceFromForm,
    ShowModalAddTask,
    ShowModalAddSequence,
    AddSequenceTask,
    EditSequenceTask,
    
    // groups
    NavigateBreadcrumbs: Navigate,
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
    
    RemoveElSequenceById,
    RefreshSequenceTaskById,
    TaskSetActiveTaskInfo,
    OpenOverview,
    OpenPriorityMapper,
    TaskSavePriorityMapper,
    HandleInputPrioritySlider,
    PickCollection,
    TaskSaveTaskWithIdToSequence,
    ToggleManageSequenceByTaskId,
    ToggleExpandSequenceTask,
    FinishInteractiveSequencePick,
    TaskOpenTaskIntoView,
    ChangeViewModeConfig,
    ResetTargetTime,
    TaskSetTaskTarget,
    TaskAddProgressManually,
    TaskSetTargetTime,
    TaskReloadTotalTargets,
    HandleClickBreadcrumbs,  
    TaskReloadParentTarget,
    ToggleCompactView,
    ReloadETA,
    ReloadTaskOverviewById,
    EditTargetThreshold,
    reloadTargetThreshold,
    TaskAddProgressFromForm,
    CreateMissionFromTask,
    TaskSubmitMissionConvertTask,
    TaskConfirmResetTaskSequenceProgress,
    ToggleSearchFeature,
  };
  
  function ToggleSearchFeature() {
    viewStateUtil.Toggle('features', ['search-bar']);
  }
  
  async function TaskConfirmResetTaskSequenceProgress(id) {
    let isConfirm = await ui.ShowConfirm();
    if (!isConfirm) return; 
    
    await compoTask.TaskResetSequenceByTaskId(id);
    
    uiTask.RefreshListSequenceByTaskId(id);
  }
  
  async function TaskSubmitMissionConvertTask(evt) {
    evt.preventDefault();
		let form = evt.target;
		
		let id = form.id.value;
		
    let task = compoTask.GetById(id);
    
    let taskId = compoTask.AddTaskData({
      title: task.title,
      durationTime: task.durationTime,
      targetTime: task.targetTime,
      parentId: '',
      type: 'M',
    });
    
    let missionData = compoMission.CreateItemMission(taskId);
    compoMission.AddMission(missionData);
    compoMission.Commit();
    
    // add sequence
    if (form.createSequence.checked) {
      let tasks = compoTask.GetAllByParentId(id);
      let missionTask = compoTask.GetById(taskId);
      
      if (tasks.length > 0) {
        compoSequence.Stash(missionTask.sequenceTasks);
        for (let task of tasks) {
          let linkedTask = compoTask.GetById(task.id);
          let targetTime = linkedTask.durationTime;
          compoSequence.AddLinkedTask(linkedTask.id, targetTime);  
        }
        compoSequence.Commit();
      }
    }
    
    appData.Save();
    await appData.TaskStoreTask();
    
    form.reset();
    form.querySelectorAll('[type="hidden"]').forEach(el => el.value = '');
  
		let modal = document.querySelectorAll('#modal-mission-from-task')[0].toggle();
		modal.close();    
		
  }
  
  function CreateMissionFromTask(id) {
    let modal = document.querySelectorAll('#modal-mission-from-task')[0].toggle();    
    modal.classList.toggle('modal--active', modal.isShown);
    modal.addEventListener('onclose', function() {
      modal.classList.toggle('modal--active', false);
    });
    
    let form = modal.querySelector('form');
    form.reset();
    form.querySelectorAll('[type="hidden"]').forEach(el => el.value = '');
    
    // form data
    let formData = {
      id,
    };
    
    // fill form
    for (let key in formData) {
      let inputEl = form.querySelector(`[name="${key}"]`);
      if (!inputEl) continue;
      
      inputEl.value = formData[key];
    }
    
  }
  
  async function TaskAddProgressFromForm(evt) {
    let form = evt.target.closest('button').form;
    let id = form.id.value;
    await TaskAddProgressManually(id);
  }
  
  function EditTargetThreshold() {
    let userVal = window.prompt('Target threshold (hours minutes), example : 1h30m or 30m');
    if (!userVal) return;
    
    try {
      let val = parseHoursMinutesToMinutes(userVal);
      if (typeof(val) != 'number') return;
      
      lsdb.data.targetThreshold = val;
      appData.Save();
      
      reloadTargetsOverview();
      reloadTargetThreshold();
    } catch (err) {
      console.error(err);
    }
  }
  
  function reloadTargetThreshold() {
    let targetThresholdMs = lsdb.data.targetThreshold * 60 * 1000;
    $('#txt-target-threshold')?.replaceChildren( helper.ToTimeString(targetThresholdMs, 'hms') );
  }
  
  function ReloadTaskOverviewById(id) {
    // let task = compoTask.GetById(id);
    
    let el = $(`#list-tasks-by-threshold [data-id="${id}"]`);
    if (!el) return;
    
    if (compoMission.GetMissionById(id)) {
    	 viewStateUtil.Add('task', ['is-collection'], el.querySelector('.container-item'));
	  } else {
    	 viewStateUtil.Remove('task', ['is-collection'], el.querySelector('.container-item'));
	  }
  }
  
  function ReloadETA(totalTargetCapTime) {
    viewStateUtil.Remove('active-task-info', ['has-ETA']);
    
    if (totalTargetCapTime <= 0 || !isViewModeMission()) return;
    
    viewStateUtil.Add('active-task-info', ['has-ETA']);
    
    let now = new Date();
    let eta = new Date(now.getTime() + totalTargetCapTime);
    let dateStr = eta.toDateString();
    let timeStr = eta.toTimeString().substring(0, 5);
    $('#txt-target-eta').textContent = `${timeStr}`;
  }
  
  function ToggleCompactView() {
    lsdb.data.isCompactView = !lsdb.data.isCompactView;
    appData.Save();
    reloadCompactView();
  }
  
  function reloadCompactView() {
    if (lsdb.data.isCompactView) {
      $('.widget-task').classList.add('extend-skin-compact');
    } else {
      $('.widget-task').classList.remove('extend-skin-compact');
    }
  }
  
  async function TaskReloadParentTarget() {
    $('#txt-nav-task-cap-time').textContent = '';
    $('#txt-nav-task-target-cap-time').textContent = '';
    
    let activeGroupId = lsdb.data.activeGroupId;
    let task = compoTask.GetById(lsdb.data.activeGroupId);
    if (!task) return;
    
    $('#txt-nav-task-cap-time').textContent = helper.ToTimeString(task.targetTime, 'hms');
    $('#txt-nav-task-target-cap-time').textContent = helper.ToTimeString(task.targetCapTime, 'hms');
  }
  
  async function TaskReloadTotalTargets() {
    let taskIds = Array.from($$('#tasklist [data-obj="task"]')).map(x => x.dataset.id);
    
    let totalTargetTime = 0;
    let totalTargetCapTime = 0;
    for (let id of taskIds) {
      totalTargetTime += compoTask.GetById(id).targetTime;
      totalTargetCapTime += compoTask.GetById(id).targetCapTime;
    }
    $('#txt-total-target').textContent = helper.ToTimeString(totalTargetTime, 'hms');
    $('#txt-total-target-cap').textContent = helper.ToTimeString(totalTargetCapTime, 'hms');
  }
  
  async function TaskAddProgressManually(id) {
    
    let task = tasks.find(x => x.id == id);
    if (!task) return;
    
    const { value: userVal } = await Swal.fire({
      title: 'Add progress manually (HMS format)',
      input: 'text',
      inputLabel: 'example : 10h5m20s, 1h, 15m, 30s',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
      }
    });
    
    if (!userVal) return;
    
    let addedTime = 0;

	  let hmsParseOpt = {
      defaultUnit: 'm'
    };
    addedTime = helper.ParseHmsToMs(userVal, hmsParseOpt);
    
    try {
      task.progressTime += addedTime;
      // task.targetCapTime = Math.max(0, addOrInitNumber(task.targetCapTime, -1 * addedTime));
      task.totalProgressTime += addedTime;
      
      if (!
        (typeof(task.progressTime) == 'number' && typeof(task.totalProgressTime) == 'number')
      ) {
        throw 'Failed, task data not valid';
      }
      
      task.progressTime = Math.max(0, task.progressTime);
      task.totalProgressTime = Math.max(0, task.totalProgressTime);
      
      await taskApplyNecessaryTaskUpdates(task, addedTime);
      
      app.AddProgressTimeToRootMission(task.parentId, addedTime);
      
      await appData.TaskStoreTask(); 
      
      // update active tracker
      compoTracker.UpdateActiveTrackerProgress(addedTime);
      appData.Save();
      
      // ui update
      app.TaskListTask();
      pageHome.RefreshTrackerOverlay();
      
    } catch (e) {
      console.error(e);
      alert('Failed');
      return;
    }
    
  }
  
  async function TaskSetTargetTime(id) {
    
    let task = tasks.find(x => x.id == id);
    if (!task) return;
    
    const { value: userVal } = await Swal.fire({
      title: 'Set target time (HMS format)',
      input: 'text',
      inputValue: helper.ToTimeString(task.targetCapTime, 'hms'),
      inputLabel: 'example : 10h5m20s, 1h, 15m, 30s',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
      }
    });
    
    if (!userVal) return;
    
    let inputTime = null;
    
    // parse input value
    inputTime = helper.ParseHmsToMs(userVal);
    
    if (inputTime === null) return;
    
    try {
      
      task.targetCapTime = Math.max(0, inputTime);
      
      await appData.TaskStoreTask(); 
      appData.Save();
      
      RefreshTaskCardAsync(task);
      app.TaskRefreshMissionTargetETA();
      
    } catch (e) {
      console.error(e);
      alert('Failed');
      return;
    }
    
  }

  async function TaskSetTaskTarget(id) {
    
    let task = tasks.find(x => x.id == id);
    
    const { value: userVal } = await Swal.fire({
        title: 'Set task duration',
        input: 'text',
        inputLabel: 'example: 1h, 30m, or 1h30m',
        inputValue: helper.ToTimeString(task.durationTime, 'hms'),
        showCancelButton: true,
        inputValidator: (value) => {
          if (!value) {
            return 'You need to write something!';
          }
        }
    });
    
    if (!userVal) return;
    
    task.durationTime = Math.max(0, helper.ParseHmsToMs(userVal));
    await appData.TaskStoreTask();
    await app.TaskListTask();  
    await updateUI();
    loadSearch();
  }
  
  async function ResetTargetTime() {
    
    Swal.fire({
      title: 'Reset all tasks progress and target?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes'
    }).then(async (result) => {
      
      if (!result.isConfirmed) return;
      
      
      await compoTask.TaskResetTasksTargetTime(); 
      await appData.TaskStoreTask();
      await app.TaskListTask();  
        
      Swal.fire(
        'Done!',
        'Successfully reset all tasks time target.',
        'success',
      );
      
    });
    
  }
  
  function NavigateViewTask() {
    viewStateUtil.Remove('active-task-info', ['has-ETA']);
    ChangeViewModeConfig('tasks');
    // resetActiveGroupId();
    lsdb.save();
    ui.BuildBreadcrumbs();
    app.TaskListTask();
  }
  
  function NavigateViewMission() {
    ChangeViewModeConfig('mission');
    // resetActiveGroupId();
    lsdb.save();
    ui.BuildBreadcrumbs();
    app.TaskListTask();
    
    // set mission target info 
    app.TaskRefreshMissionTargetETA();
  }
  
  function resetActiveGroupId() {
    lsdb.data.activeGroupId = '';
  }
  
  function ChangeViewModeConfig(mode) {
    lsdb.data.topMostMissionPath = '';
    lsdb.data.viewMode = mode;
    ui.UpdateViewModeState();
  }
  
  async function TaskOpenTaskIntoView() {
    let activeTask = await getActiveTask();
    if (!activeTask) return;
    
    lsdb.data.viewMode = 'tasks';
    lsdb.save();
    ui.Navigate(activeTask.parentId);
    await app.TaskListTask();
    
    FocusTaskElById(activeTask.id);
  }
  
  function removeTaskEl(id) {
    let el = getTaskElById(id);
    if (!el) return;
    
    el.remove();
  }
  
  function getTaskElById(id) {
    return uiTask.GetTaskElById(id);
  }
  
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
    
    let targetTime = linkedTask.durationTime;
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
  
  async function TaskMoveTaskWithIdToActiveSequence(id) {
    
    if (data.prePickCollectionId == id) {
      alert('Cannot self-linking task as sequence. Try picking another task.');
      return;
    }
    
    await TaskLinkTaskWithIdToActiveSequence(id);
    
    await app.TaskRemoveTaskFromMission(id);
    removeTaskEl(id);
  }
  
  async function TaskLinkTaskWithIdToActiveSequence(id) {

    if (data.prePickCollectionId == id) {
      alert('Cannot self-linking task as sequence. Try picking another task.');
      return;
    }
    
    let task = compoTask.GetById(data.prePickCollectionId);
    let linkedTask = compoTask.GetById(id);
    
    compoSequence.Stash(task.sequenceTasks);
    
    let targetTime = linkedTask.durationTime;
    compoSequence.AddLinkedTask(linkedTask.id, targetTime);  
    
    compoSequence.Commit();
    
    await appData.TaskStoreTask();
      
    let taskEl = $(`[data-eid="widget-task"] [data-obj="task"][data-id="${id}"]`);
    viewStateUtil.Add('task', ['sequence-added'], taskEl);
    
    uiTask.RefreshListSequenceByTaskId(data.prePickCollectionId);
    
  }
  
  function ResetProgressSequenceFromForm(evt) {
    let form = evt.target.form;
    let seqId = form.id.value;
    let taskId = form.taskId.value;
    
    compoTask.TaskResetSequenceById(taskId, seqId);
    
    uiTask.RefreshListSequenceByTaskId(taskId);
  }
  
  async function OpenLinkedSequenceFromForm(evt) {
    let form = evt.target.form;
    let seqId = form.id.value;
    let taskId = form.taskId.value;
    
    let task = compoTask.GetById(taskId);
    
    compoSequence.Stash(task.sequenceTasks);
    let item = compoSequence.GetById(seqId);
    let linkedTask = compoTask.GetById(item.linkedTaskId);
    compoSequence.Pop();
    
    await app.TaskNavigateToMission(linkedTask.id);
    FocusTaskElById(linkedTask.id);
    
    $('#task-sequence-modal').close();
  }
  
  async function OpenLinkedSequenceInPriorityMapper(evt) {
    let form = evt.target.closest('form');
    let seqId = form.id.value;
    let taskId = form.taskId.value;
    
    let task = compoTask.GetById(taskId);
    
    compoSequence.Stash(task.sequenceTasks);
    let item = compoSequence.GetById(seqId);
    let linkedTask = compoTask.GetById(item.linkedTaskId);
    compoSequence.Pop();
    
    openPriorityMapperByParentId(linkedTask.parentId);
    
    $('#task-sequence-modal').close();
  }
  
  function FocusTaskElById(id, isScroll = true) {
    uiSelection.FocusTaskElById(id, isScroll);
  }
  
  function DeleteSequenceFromForm(evt) {
    let form = evt.target.form;
    let seqId = form.id.value;
    let taskId = form.taskId.value;
    
    compoTask.TaskDeleteSequenceById(taskId, seqId);
    
    $('#task-sequence-modal').close();
    uiTask.RefreshListSequenceByTaskId(taskId);
  }
  
  async function TaskResetProgressTaskFromForm(evt) {
    let form = evt.target.form;
    let id = form.id.value;
    
    let task = await compoTask.ResetProgressById(id); 

    await appData.TaskStoreTask();

    RefreshTaskCardAsync(task);
    
    $('#task-modal').close();
  }
  
  async function TaskDistributeProgressTaskFromForm(evt) {
    let form = evt.target.form;
    let id = form.id.value;
    
    let task = await compoTask.ResetProgressById(id); 

    await appData.TaskStoreTask();

    RefreshTaskCardAsync(task);
    
    $('#task-modal').close();
  }

  async function TaskSetActiveTaskInfo() {
    
    $('#txt-active-task-name')?.replaceChildren();
    
    let activeTask = await getActiveTask();
    if (!activeTask) return;
    
    let ratioTimeLeftStr = '';
    let ratioTimeLeft = timeLeftRatio.find(x => x.id == activeTask.id);
    if (ratioTimeLeft && ratioTimeLeft.timeLeft > 0) {
      ratioTimeLeftStr = `${minutesToHoursAndMinutes(ratioTimeLeft.timeLeft)}`;
    }
    
    $('#txt-active-task-name')?.replaceChildren(`${activeTask.title} ${ratioTimeLeftStr}`);
    
    // task target
    viewStateUtil.Remove('active-task-info', ['has-target', 'is-sequence']);
    
    // target time info
    if (activeTask.targetTime > 0 || activeTask.targetCapTime > 0) {
    
      viewStateUtil.Add('active-task-info', ['has-target']);
      
      $('#txt-active-task-target').innerHTML = helper.ToTimeString(activeTask.targetTime, 'hms');
      $('#txt-active-task-target-cap').innerHTML = helper.ToTimeString(activeTask.targetCapTime, 'hms');
      
      // set quota time 
      let targetQuotaTime = compoTask.GetTaskQuotaTimeById(activeTask.id);
      $('#txt-active-task-target-limit').innerHTML = ``;
      if (targetQuotaTime > 0 && activeTask.parentId != '') {
        $('#txt-active-task-target-limit').innerHTML = ` -- Quota : ${secondsToHMS( msToSeconds(targetQuotaTime) )}`;
      }
      
    }
    
    // active task : sequence info
    {
      compoSequence.Stash(activeTask.sequenceTasks);

    	let activeId = compoSequence.GetActiveId();
    	let activeSeq = compoSequence.GetActive();
    	if (activeSeq) {
	      viewStateUtil.Add('active-task-info', ['is-sequence']);
    	  $('#txt-active-task-sequence-name').textContent = activeSeq.title;
    	}

    	compoSequence.Pop();
    }
    
    uiPiP.ReloadActiveTaskInfo();
  }
  
  function RefreshSequenceTaskById(id) {
    
    let item = app.GetTaskById(id);
    let container = $(`[data-eid="widget-task"] [data-obj="task"][data-id="${item.id}"] [data-container="sequence-tasks"]`);
    let taskEl = $(`[data-eid="widget-task"] [data-obj="task"][data-id="${item.id}"]`);
    
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
    
    // count total sequence target 
    let totalSequenceTargetTime = 0;
    {
      for (let item of items) {
        if (item.targetCapTime > 0) {
          totalSequenceTargetTime += Math.max(0, item.targetCapTime - item.progressCapTime);
        }
      }
    }
    
    // total sequence target
    if (totalSequenceTargetTime > 0) {
      viewStateUtil.Add('task', ['has-target'], taskEl);
      taskEl.querySelector('[data-slot="sequenceTargetTotalTime"]').textContent = `${helper.ToTimeString(totalSequenceTargetTime, 'hms')}`;
    } else {
      // viewStateUtil.Remove('task', ['has-target'], taskEl);
      taskEl.querySelector('[data-slot="sequenceTargetTotalTime"]').textContent = '';
    }
    
    if (items.length === 0) {
      viewStateUtil.Remove('task', ['sequence-mode'], taskEl);
    }
    
  }
  
  function RemoveElSequenceById(id, taskId) {
    let container = $(`[data-eid="widget-task"] [data-obj="task"][data-id="${taskId}"] [data-container="sequence-tasks"]`);
    if (!container) return;
    
    let seqEl = container.querySelector(`[data-kind="item-sequence-task"][data-id="${id}"]`);
    if (!seqEl) return;
    
    seqEl.remove();
  }
  
  function refreshGlobalTimer() {
    $('#txt-global-preset-timer').textContent = minutesToHoursAndMinutes( app.GetGlobalTimer() );
  }
  
  function ChangeGlobalPresetTimer() {
    let globalTimerStr = minutesToHoursAndMinutes( app.GetGlobalTimer() );
    
    let userVal = window.prompt('Value', globalTimerStr);
    if (!userVal) return;
    
    let parsedMinutes = parseHoursMinutesToMinutes(userVal);
    if (parsedMinutes === null) return;
    
    app.SetGlobalTimer(parsedMinutes);
    app.Commit();
    appSettings.Save();
    refreshGlobalTimer();
  }
  
  function NavigateScreen(evt) {
    if (!evt.target.closest('[data-view-target]')) return;
    
    let viewTarget = evt.target.closest('[data-view-target]').dataset.viewTarget;
    if (!viewTarget) return;
    
    screenStateUtil.NavigateTo(viewTarget);
    // viewStateUtil.Set('screens', [viewTarget]);
  }
  
  function openPriorityMapperByParentId(id) {
    screenStateUtil.NavigateTo('priority-mapper');
    compoPriorityMapper.Stash(id);
    refreshListPriorityItems();
  }
  
  function OpenPriorityMapper() {
    let activeTaskParentId = appData.GetActiveTaskParentId();
    openPriorityMapperByParentId(activeTaskParentId);
  }
  
  async function OpenOverview() {
    screenStateUtil.NavigateTo('by-threshold');
    reloadTargetThreshold();
    
    await reloadTargetsOverview();
  }
  
  async function reloadTargetsOverview() {
    let items = await app.TaskListTargets();
    // let taskItems = buildTaskItemData(items);
    
    displayListTasksByThreshold(items);
  }
  
  function buildTaskItemData(items) {
    
    let fillDatas = [];
    
    for (let item of items) {
      
      let liveProgress = 0;
      let liveProgressTime = 0;
      
      let targetMinutesLeft = item.durationTime - item.progressTime - liveProgress;
      let progressMinutesLeft = msToMinutes(item.progressTime);
      
      // # set ratio time left string
      let ratioTimeLeftStr = '';
      
      // ## handle if self task
      if (item.ratio > 0 || item.targetTime > 0)
      {
        {
          let targetTime = item.targetTime;
          if (targetTime > 0) {
            ratioTimeLeftStr = `${ secondsToHMS(msToSeconds(targetTime)) }`;
          }
        }
        

      
      }
      
      // show mission path
      let missionPath = '';
      let isTopPath = isTopMissionPath(item.id);
      if (isTopPath) {
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
      
      fillDatas.push(fillData)
      
    }
    
    return fillDatas;  
  }
  
  
  async function displayListTasksByThreshold(items) {
    
    let treeParentIds = [];
    
    {
      let output = []; 
      
      for (let item of items) {
          
          let parentId = item.parentId;
          let tp = [];
          
          let taskInTree = output.find(x => x.id == item.parentId);
          let isInsertLater = false;
          
          if (taskInTree) {
            let ref = {
              id: item.id,
              parentId: item.parentId,
              title: item.title,
              task: item,
              items: [],
            };
            taskInTree.items.push(ref);
            output.push(ref)
            
          } else {
            
            while (parentId) {
              
              let taskInTree = output.find(x => x.id == parentId);
              if (taskInTree) {

                let ref = {
                  id: item.id,
                  parentId: item.parentId,
                  title: item.title,
                  task: item,
                  items: [],
                };
                let seekTask = output.find(x => x.id == ref.parentId)
                if (!seekTask) {
                  isInsertLater = true;
                }
                
                break;
                
              } else {
                
                let seekTask = compoTask.GetById(parentId)
                // console.log(seekTask)
                tp.push(seekTask);
                parentId = seekTask.parentId;
                
              }
              
            }
          
          }
          
          // buuld tree
          while (tp.length > 0) {
            
            let bb = tp.pop();
            if (bb) {
              
              let ref = {
                id: bb.id,
                parentId: bb.parentId,
                title: bb.title,
                task: bb,
                items: [],
              };
              
              let taskInTree = output.find(x => x.id == ref.parentId);
              if (taskInTree) {
                if (!taskInTree.items.find(x => x.id == ref.id)) {
                  taskInTree.items.push(ref)
                }
                output.push(ref)
              } else {
                
                treeParentIds.push(ref)
                output.push(ref)
              }
              
            } 

          }
          
          if (isInsertLater) {
            let taskInTree = output.find(x => x.id == item.parentId);
            // if (!taskInTree.items.find(x => x.id == item.id)) {
              taskInTree.items.push({
                id: item.id,
                parentId: item.parentId,
                title: item.title,
                task: item,
                items: [],
              });
            // }
          }
          
        
      }
      
      
    }
    
  
    let docFrag = document.createDocumentFragment();
    $('#list-tasks-by-threshold')?.replaceChildren();
    
    let level = 1;
    logTask(treeParentIds, level, docFrag);
    
    $('#list-tasks-by-threshold')?.append(docFrag);
  }
  
  function logTask(treeParentIds, level, docFrag) {
    if (treeParentIds.length === 0) return;
    
    for (let item of treeParentIds) {
      let sub = generateSub(level);
      
      let el = window.templateSlot.fill({
    	  data: {
    	    title: item.task.title,
    	    ratioTimeLeftStr: helper.ToTimeString(item.task.targetTime, 'hms'),
    	  }, 
    	  template: document.querySelector('#tmp-task-simple-v2').content.cloneNode(true), 
    	});
  	  
      let taskEl = el.querySelector('[data-kind="task"]');
    	taskEl.dataset.id = item.id;	
    	
    	if (compoMission.GetMissionById(item.id)) {
    	  viewStateUtil.Add('task', ['is-collection'], taskEl.querySelector('.container-item'));
    	}
    	
    	{
    	  let target = docFrag.querySelector(`[data-kind="task"][data-id="${item.parentId}"]`);
    	  if (target) {
    	    let container = target.querySelector('.container-child-tasks');
    	    container.append(el);
    	  } else {
  	      docFrag.append(el);
    	  }
    	}
      
      logTask(item.items, level+1, docFrag);
    }
    
    
  }
  
  function generateSub(level) {
    let txt = '';
    while (level > 0) {
      txt += '-'
      level -= 1;
    }
    return txt;
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
    screenStateUtil.NavigateTo('home');
  }
  
  function refreshListPriorityItems() {
    
    let parentTaskId = compoPriorityMapper.GetParentTaskId();
    let items = compoPriorityMapper.GetAll();
    
    let container = $('[data-container="list-priority-mapper"]');
    container?.replaceChildren();
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
    
    container?.append(docFrag);
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
    reloadCompactView();
    initSimpleElementFilter();
    attachKeyboardShortcuts();
    compoKeyboardControl.Init();
    
    BuildBreadcrumbs();
    
    // # mission and mission groups
    ui.UpdateViewModeState();
    uiMission.ListGroup();
    
    initAudioSettings();
    refreshGlobalTimer();
    
    screenStateUtil.TaskRestoreStates();
  }
  
  function initAudioSettings() {
    $('[data-jsq="alarm-volume"]').value = app.GetAlarmVolume();
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
      buildSubPath(subPaths, lsdb.data.activeGroupId, safeLoopCount);
      breadcrumbs = [...breadcrumbs, ...subPaths];
    } catch (err) {
      console.error(err);
    }
      
    $('#container-breadcrumbs').innerHTML = '';
    for (let item of breadcrumbs) {
      if (item.id == lsdb.data.activeGroupId) {
        $('#container-breadcrumbs').innerHTML += `
          <button class="active">${item.name}</button>
        `;
      } else {
        $('#container-breadcrumbs').innerHTML += `
          <button data-id="${item.id}">${item.name}</button>
        `;
      }
    }

  }
  
  function buildSubPath(breadcrumbs, parentId, safeLoopCount) {
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
        buildSubPath(breadcrumbs, parentId, safeLoopCount + 1);
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
    compoSelection.ClearItems();
  }
  
  function getActiveGroupId() {
    return lsdb.data.activeGroupId;
  }
  
  async function HandleClickBreadcrumbs(evt) {
    let targetEl = evt.target;
    
    if (evt.target.classList.contains('active')) return;

    let activeGroupId = getActiveGroupId();
    
    Navigate(evt.target.dataset.id);
    await app.TaskListTask();
    
    let isScroll = false;
    // FocusTaskElById(activeGroupId, isScroll);
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
    listenAndToggleVisibility('#node-filter-box', '[data-slot="title"]', 'd-none', '[data-eid="widget-task"] [data-obj="task"]');
  }
  
  function attachKeyboardShortcuts() {
    Mousetrap.bind('alt+n', function(e) {
      ShowModalAddTask();
      return false;
    });
    Mousetrap.bind('del', function(e) {
      handleDeleteSelection();
    });
    Mousetrap.bind(['p'], handlePKey, 'keydown');
    Mousetrap.bind(['p'], handlePKey, 'keyup');
    Mousetrap.bind('backspace', function(e) {
      handleBackspaceKey();
    });
    
    // attach keyboard listeners
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('keyup', keyHandler);
  }
  
  function handleBackspaceKey() {
    let breadcrumbsBtns = Array.from($$('._wgBreadcrumbs button'));
    let isTaskViewMode = viewStateUtil.HasViewState('task-view-mode', 'task');
    let hasBreadcrumbsBtns = ( isTaskViewMode && breadcrumbsBtns.length > 1 );
    let screenNavBtnEl = $('._backNavBtn');
    
    if (hasBreadcrumbsBtns) {
      // click previous path button
      breadcrumbsBtns[breadcrumbsBtns.length-2].click();
    } else if (screenNavBtnEl) {
      // go back to previous screen
      screenNavBtnEl.click();
    }
  }
  
  function handlePKey(evt) {
    let selectedTaskId = uiSelection.GetSingleSelection();
    if (!selectedTaskId) return;
    
    let itemEl = $(`._wgTaskList [data-obj="task"][data-id="${selectedTaskId}"]`);
    if (!itemEl) return;
    
    if (onePress.watch(evt.type, evt.key)) {
      if (itemEl.querySelector('._btnStart').offsetHeight) {
        app.StartTaskTimer(itemEl, selectedTaskId);
      } else {
        app.TaskStopActiveTask();
      }
    }
  }
  
  function handleDeleteSelection() {
    let selectedTaskId = uiSelection.GetSingleSelection();
    if (!selectedTaskId) return;
    
    let itemEl = $(`._wgTaskList [data-obj="task"][data-id="${selectedTaskId}"]`);
    if (!itemEl) return;

    if (pageHome.IsTaskViewMode()) {
      
      uiTask.DeleteAsync(selectedTaskId);
      itemEl.remove();
      
    } else {
      let isConfirm = window.confirm('Delete this task? This process cannot be undone.');
      if (!isConfirm) return;
      
      app.TaskAddToMission(selectedTaskId, itemEl);
    }
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
    
    // return promise implementation is still unclear
    return new Promise(resolve => {
      
      let modalResponse = {
        isSubmit: false,
        isDismissed: false,
        form: null,
      };
      
      viewStateUtil.RemoveAll('form-task');
      
      let formValue = {
        parentId: lsdb.data.activeGroupId,
        durationTime: minutesToHoursAndMinutes( app.GetGlobalTimer() ),
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
      
      modal.addEventListener('onclose', function(evt) {
        modal.classList.toggle('modal--active', false);
        modalResponse.isDismissed = true;
        resolve(modalResponse);
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
      
    });
    
  }
  
  function RefreshTaskCardAsync(task) {
    
    try {
      
      let el = $(`[data-obj="task"][data-id="${task.id}"]`);
      if (!el) return;
      
      let ratioTimeLeftStr = task.targetTime > 0 ? helper.ToTimeString(task.targetTime, 'hms') : '';
      let targetCapTimeStr = task.targetCapTime > 0 ? helper.ToTimeString(task.targetCapTime, 'hms') : '';
      
      el.querySelector('[data-slot="progress"]').textContent = helper.ToTimeString(task.progressTime, 'hms');
      el.querySelector('[data-slot="title"]').textContent = task.title;
      el.querySelector('[data-slot="ratioTimeLeftStr"].sc-1').textContent = ratioTimeLeftStr;
      el.querySelector('[data-slot="targetCapTimeStr"].sc-1').textContent = targetCapTimeStr;
      el.querySelector('[data-slot="durationTimeStr"]').textContent = helper.ToTimeString(task.durationTime, 'hms');
      
      if (task.targetTime > 0 || task.targetCapTime > 0) {
        viewStateUtil.Add('active-task-info', ['has-target'], el);
      }
      
      uiTask.RefreshListSequenceByTaskId(task.id);
      
    } catch (e) {
      
      console.error(e);
      
    }
    
  }
  
  function AddSequenceTask(taskId) {
    let defaultValue = {
      taskId,
      duration: minutesToHoursAndMinutes( app.GetGlobalTimer() ),
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
    
    let targetCapTimeStr = '';
    if (sequenceTask.targetCapTime > 0) {
      targetCapTimeStr = helper.ToTimeString(sequenceTask.targetCapTime, 'hms');
    }
    
    let defaultValue = {
      id,
      taskId,
      useRepeat: sequenceTask.repeatCount > 0,
      repeatCount: sequenceTask.repeatCount > 0 ? sequenceTask.repeatCount : 2,
      title: linkedTask ? linkedTask.title : sequenceTask.title,
      duration: secondsToHMS(msToSeconds(sequenceTask.targetTime)),
      targetCapTime: targetCapTimeStr,
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
      
  	taskEl.querySelector('[data-slot="targetString"]').textContent = `${helper.ToTimeString(task.durationTime - task.progressTime - liveProgressTime, 'hms')} left`;
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
        resolve(isConfirm);
        return;
      } 
      
      confirmationPopup.style.display = "block";
      modalResolver = resolve;
      
    });
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