let uiTask = (function() {
  
  let $$ = document.querySelectorAll.bind(document);
  
  let SELF = {
    HandleTaskClick,
    SwitchActiveTask,
    OnSubmitTask,
    NavigateSubTaskAsync,
	  DeleteAsync,
	  OnSubmitSequenceTask,
	  RefreshListSequenceByTaskId,
	  DeleteTaskFromForm,
	  GetTaskElById,
	  RefreshTaskCardAsync,
	  TaskResetProgressTaskFromForm,
	  TaskDistributeProgressTaskFromForm,
  };
  
  function GetTaskElById(id) {
    let el = $(`[data-obj="task"][data-id="${id}"]`);
    if (!el) return null;
    
    return el;
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
    
    DeleteAsync(id, taskEl);
    $('#task-modal').close();
  }
  
  function OnSubmitSequenceTask(ev) {
  
		ev.preventDefault();
		let form = ev.target;
		
		let id = form.id.value;
		let taskId = form.taskId.value;
		let title = form.title.value.trim();
		let durationTime = 0;
		let targetCapTime = 0;
		
		// duration time
		{
      let durationTimeInput = form.duration.value;
      if (isNumber(durationTimeInput)) {
        // set default to minutes
        durationTimeInput = `${durationTimeInput}m`;
      }
      durationTime = parseHmsToMs(durationTimeInput);
		}
		
		// target time
		{
      let targetCapTimeInput = form.targetCapTime.value;
      if (isNumber(targetCapTimeInput)) {
        // set default to minutes
        targetCapTimeInput = `${targetCapTimeInput}m`;
      }
      targetCapTime = parseHmsToMs(targetCapTimeInput);
		}
    
    // validate all input data  
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
      targetCapTime,
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
  
  function RefreshListSequenceByTaskId(id, container) {
    
    let item = app.GetTaskById(id);
    let taskEl = null;
    
    if (container) {
      taskEl = container.closest('[data-obj="task"]');
    }
    
    if (!container) {
      container = $(`[data-eid="widget-task"] [data-obj="task"][data-id="${item.id}"] [data-container="sequence-tasks"]`);
      taskEl = $(`[data-eid="widget-task"] [data-obj="task"][data-id="${item.id}"]`);
    }
    
    if (!container) return;
    
    container.innerHTML = '';
    
    compoSequence.Stash(item.sequenceTasks);
  	
  	let activeId = compoSequence.GetActiveId();
  	let items = compoSequence.GetAll();
    let docFrag = document.createDocumentFragment();
    
    let lowestCompleteCount = compoSequence.GetLowestCompletedCount();

    for (let item of items) {
      
      let ratioTimeLeftStr = '';
      let targetCapTimeStr = '';
      let linkedTaskPath = '';
      
      let linkedTask = null;
      if  (item.linkedTaskId) {
        linkedTask = compoTask.GetById(item.linkedTaskId);
        if (linkedTask) {
          ratioTimeLeftStr = `${ helper.ToTimeString(linkedTask.targetTime, 'hms') }`;
          if (linkedTask.targetCapTime) {
            targetCapTimeStr = `${ helper.ToTimeString(linkedTask.targetCapTime, 'hms') }`;
          }
          
          // show mission path
          linkedTaskPath = getAndComputeMissionPath(linkedTask.parentId);
        }
      } else {
        if (item.targetCapTime > 0) {
          let targetCapLimitStr = helper.ToTimeString(item.targetCapTime, 'hms');
          // let targetCapProgressStr = helper.ToTimeString(item.progressCapTime, 'hms');
          targetCapTimeStr = `${targetCapLimitStr}`;
        }
      }
      
      // time left info
      let timeLeftStr = '';
      
      {
        let timeLeft = Math.max(0, item.targetTime - item.progressTime);
        timeLeftStr = helper.ToTimeString(timeLeft, 'hms');
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
          targetCapTimeStr,
          linkedTaskPath,
          repeatCountProgressLabel,
          targetTimeStr: secondsToHMS(msToSeconds(item.targetTime)), 
          timeLeftStr: `${timeLeftStr} left`,
        }, 
        template: document.querySelector('#tmp-list-sequence-task').content.cloneNode(true), 
      });
      
      if (linkedTask) {
        el.querySelector('[data-kind="item-sequence-task"]').dataset.viewStates = 'linked-task';
      }
      el.querySelector('[data-kind="item-sequence-task"]').dataset.id = item.id;
      el.querySelector('[data-kind="item-sequence-task"]').classList.toggle('is-active', (item.id == activeId));
      
      // progress bar
      // if (item.targetCapTime > 0)
      {
        viewStateUtil.Add('sequence-item', ['track-progress'], el.firstElementChild);
        try {
          let progressEl = el.querySelector('.wg-TaskProgressBar');
          if (progressEl) {
            let percentage = 0;
            
            if (item.targetCapTime > 0) {
              percentage = Math.min(100, Math.floor(item.progressCapTime / item.targetCapTime * 10000) / 100);
            } else {
              percentage = Math.min(100, Math.floor(item.progressTime / item.targetTime * 10000) / 100);
            }
            
            let percentageStr = `${percentage}%`;
            progressEl.querySelector('.progress').style.width = percentageStr;
            progressEl.querySelector('.label').textContent = percentageStr;
            
            // overdrive level
            let overdriveLevelStr = '';
            if (item.counter.completed - lowestCompleteCount > 1) {
              overdriveLevelStr = `Lv.${item.counter.completed - lowestCompleteCount - 1}`;
            }
            progressEl.querySelector('.label-overdrive').textContent = overdriveLevelStr;
            
          }
        } catch (e) {}      
      }
      
      docFrag.append(el);
      
    }
    
    container.append(docFrag);
    
    // count total sequence target 
    let totalSequenceTargetTime = 0;
    {
      for (let item of items) {
        if (item.targetCapTime > 0) {
          totalSequenceTargetTime += Math.max(0, item.targetCapTime - item.progressCapTime);
        }
      }
    }
    
    // store task el states
    let taskElViewStates = {
      manageMode: viewStateUtil.HasViewState('task', 'manage-sequence', taskEl),
      toolbarExpanded: viewStateUtil.HasViewState('task', 'toolbarExpanded', taskEl),
      hasSubTask: viewStateUtil.HasViewState('task', 'hasSubTask', taskEl),
    };
    
    viewStateUtil.RemoveAll('task', taskEl);
    
    let totalSequenceTargetTimeStr = '';
    
    // total sequence target
    if (totalSequenceTargetTime > 0) {
      viewStateUtil.Add('task', ['has-target'], taskEl);
      totalSequenceTargetTimeStr = `${helper.ToTimeString(totalSequenceTargetTime, 'hms')}`;
    }
    
    taskEl.querySelector('[data-slot="sequenceTargetTotalTime"]').textContent = totalSequenceTargetTimeStr;
    
    if (item.targetTime > 0 || item.targetCapTime > 0) {
      viewStateUtil.Add('task', ['has-target'], taskEl);
    }
    if (item.type == 'M') {
      viewStateUtil.Add('task', ['collection-only'], taskEl);
    }
    
    // restore task el states
    if (taskElViewStates.manageMode) {
      viewStateUtil.Add('task', ['manage-sequence'], taskEl);
    }
    if (taskElViewStates.toolbarExpanded) {
      viewStateUtil.Add('task', ['toolbarExpanded'], taskEl);
    }
    if (taskElViewStates.hasSubTask) {
      viewStateUtil.Add('task', ['hasSubTask'], taskEl);
    }
    
    
    if (taskEl && items.length > 0) {
      viewStateUtil.Add('task', ['sequence', 'sequence-mode'], taskEl);
    }
    
  }
  
  function getActionRole(el) {
    let roleEl = el.closest('[data-role]');
    return roleEl?.dataset.role;
  }
  
  async function HandleTaskClick(evt, el) {

    let actionRole = getActionRole(el);
    let parentEl = el.closest('[data-obj="task"]');
    if (!parentEl) return;
    
    let id = parentEl.dataset.id;
    
    let seqEl = el.closest('[data-kind="item-sequence-task"]');
    let seqId = seqEl ? seqEl.dataset.id : null;
    
    let seqTitleEl = evt.target.closest(['[data-closest="title"]']);
    if (seqTitleEl) {
      compoTask.FocusSequenceById(id, seqId);
      ui.RefreshSequenceTaskById(id);
      return;
    }
    
    switch (actionRole) {
      case 'add-to-sequence': ui.TaskLinkTaskWithIdToActiveSequence(id); break;
      case 'move-to-sequence': ui.TaskMoveTaskWithIdToActiveSequence(id); break;
      case 'save-to-collection': ui.TaskSaveTaskWithIdToSequence(id); break;
      case 'pick-collection': ui.PickCollection(); break;
      case 'reset-count-active-seq': compoTask.TaskResetSequenceCountByTaskId(id); break;
      case 'reset-sequence': ui.TaskConfirmResetTaskSequenceProgress(id); break;
      case 'manage-sequence': ui.ToggleManageSequenceByTaskId(id); break;
      case 'toggle-expand-sequence-task': ui.ToggleExpandSequenceTask(id); break;
      case 'link-task-to-sequence-interactive-mode': ui.TaskLinkTaskToSequenceByTaskIdInteractiveMode(id); break;
      case 'add-sequence-task': ui.AddSequenceTask(id); break;
      case 'delete-sequence-task': 
        compoTask.TaskDeleteSequenceById(id, seqId); 
        ui.RemoveElSequenceById(seqId, id);
        ui.RefreshSequenceTaskById(id);
      break;
      case 'edit-sequence-task': ui.EditSequenceTask(id, seqId); break;
      case 'navigate-mission': 
        viewStateUtil.RemoveAll('screens');
        viewStateUtil.Add('screens', ['home']);
        
        await app.TaskNavigateToMission(id); 
        ui.FocusTaskById(id);
        
        break;
      case 'navigate-sub':
        ui.Navigate(id);
        await app.TaskListTask();
        break;
      case 'edit': app.EditTask(id); break;
      case 'create-mission': ui.CreateMissionFromTask(id); break;
      case 'star-task': app.TaskStarTask(id); break;
      case 'delete': DeleteAsync(id, parentEl); break;
      case 'set-ratio': taskSetTaskRatio(id); break;
      case 'add-label': TaskAddLabel(id); break;
      case 'add-sub-task': showModalSubTask(id); break;
      case 'add-progress-minutes': await ui.TaskAddProgressManually(id); break;
      case 'set-target-time': setTargetTimeAsync(id); break;
      case 'open': await pageDetail.OpenByTaskId(id); break;
      case 'set-active': SwitchActiveTask(parentEl, id); break;
      case 'remove-mission': app.TaskAddToMission(id, parentEl); break;
      case 'add-to-mission': app.TaskAddToMission(id, parentEl); break;
      case 'set-target': await ui.TaskSetTaskTarget(id); break;
      case 'archive':
        let activeTask = await compoTask.TaskGetActive();
        if (activeTask && activeTask.id == id) {
          await TaskStopActiveTask();
        }
        await taskArchiveTask(id);
        await compoTask.RemoveActiveTaskIfExists(id);
        updateUI();
      break;
      case 'unarchive': await taskUnarchive(id); break;
      case 'restart': 
        await compoTask.ResetProgressById(id); 
        await appData.TaskStoreTask();
        await TaskListTask();  
      break;
      case 'take-note': showModalNote(id); break;
      case 'start': await app.StartTaskTimer(parentEl, id); break;
      case 'expandToolbar': uiMission.ExpandToolbar(id); break;
      case 'stop': await app.TaskStopActiveTask(); break;
        
      // notes
      case 'rename-sub-task': renameNote(id, el); break;
      case 'start-sub-task':
        await fixMissingNoteId(id, el); await setSubTask(id, el); break;
      case 'delete-note': deleteNote(id, el); break;
      
      default: toggleSelection(id);

    }
    
  }
  
  async function setTargetTimeAsync(id) {
    
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
      
      RefreshListSequenceByTaskId(task.id);
      
    } catch (e) {
      console.error(e);
    }
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

	async function DeleteAsync(id, taskEl, isBypassConfirm = false) {
  
    if (!isBypassConfirm) {
      let isConfirm = await ui.ShowConfirm();
      if (!isConfirm) return; 
      
    }
    
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
        compoMission.RemoveMissionById(id);
      }
    }
  
    // delete child task recurisively
    totalDeletedProgressTime += compoTask.DeleteAllChildTasksByParentId(id);
    // console.log(totalDeletedProgressTime)
    
    // put total progress time of deleted tasks into the parent progress
    if (parentTask) {
      parentTask.totalProgressTime += totalDeletedProgressTime;
    }
    
    await appData.TaskStoreTask();
    lsdb.save();
    
    await compoTask.RemoveActiveTaskIfExists(id);
    taskEl?.remove();
  
  	// if tasklist is empty, remove parentId from groups
  	if ($$('._wgTaskList [data-obj="task"]').length == 0) {
  		let deleteIndex = lsdb.data.groups.findIndex(x => x.id == parentTask.id);
  	    if (deleteIndex >= 0) {
  		    lsdb.data.groups.splice(deleteIndex, 1);
  			  appSettings.ResetActiveGroup();
  			  lsdb.save();
  	    }
  	}
	  
    updateUI();
  }
	
  async function NavigateSubTaskAsync(id) {
    ui.NavigateBreadcrumbs(id);
    await app.TaskListTask();
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
    await appData.TaskStoreTask();
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
    await appData.TaskStoreTask();
    parentEl.remove();
  }
  
  function partialUpdateNoteName(noteEl, desc) {
    let descEl = $kind({kind:'note.desc'}, noteEl);
    if (descEl) {
      descEl.textContent = desc;
    }
  }

  
  async function fixMissingNoteId(taskId, el) {
    let parentEl = el.closest('.i-item');
    let noteId = parentEl.querySelector('[data-slot="id"]').textContent;
    if (noteId) return;
    
    let task = tasks.find(x => x.id == taskId);
    let noteIndex = parseInt(parentEl.querySelector('[data-slot="index"]').textContent);
    let newId = generateUniqueId();
    task.note[noteIndex].id = newId;
    parentEl.querySelector('[data-slot="id"]').textContent = newId;
    await appData.TaskStoreTask();
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
    await appData.TaskStoreTask();
    if (noteId) {
      partialUpdateNoteName(parentEl, newDesc);
    }
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
    ui.SetFocusEl(modal.querySelector('input[type="text"]'));
    modal.querySelector('form').id.value = id;
  }

  
  async function SwitchActiveTask(taskEl, id, persistent = false) {
    
    let activeTask = await compoTask.TaskGetActive();
    
    // switch task
    if (activeTask) {
      if (id == activeTask.id && !persistent) {
        await compoTask.RemoveActiveTaskData();
        disableAllActive();
        ui.updateTaskProgressBar(id, false);
      } else {
        ui.updateTaskProgressBar(activeTask.id, false);
        await window.service.SetData({'activeTask': id});
        disableAllActive();
        taskEl.stateList.add('--active');
        await ui.updateTaskProgressBar(id);
        
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
  
  async function OnSubmitTask(ev) {
  
		ev.preventDefault();
		
    let form = ev.target;
    
    if (form.id.value.length > 0) {
      
      let task = await app.TaskUpdateTask(form);
      
      await appData.TaskStoreTask();
      RefreshTaskCardAsync(task);
      form.reset();
      
      app.SyncGroupName(task.id, task.title, task.parentId);
        
    } else {
      
      let taskId = await compoTask.AddTaskAsync(form);
      
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
    
    app.TaskRefreshMissionTargetETA();
    
		let modal = document.querySelectorAll('#task-modal')[0].toggle();
		modal.close();
		
  }
  
  function showModalSubTask(taskId) {
    let modalData = {
      formData: {
        parentId: taskId,
      }
    };
    ui.ShowModalAddTask(modalData);
  }
  
  async function taskSetTaskRatio(id) {
    let task = tasks.find(x => x.id == id);
    if (!task) return;
    
    const { value } = await Swal.fire({
        title: 'Set Priority Point',
        input: 'text',
        inputLabel: 'Non negative number. Example: 5, 100, 200. Enter zero (0) to unset.',
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
    await appData.TaskStoreTask();
    app.TaskListTask();
  }
  
  return SELF;
  
})();