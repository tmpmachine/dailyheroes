let uiTask = (function() {
  
  let SELF = {
    HandleTaskClick,
    SwitchActiveTask,
  };
  
  function getActionRole(el) {
    return (el.matches('[data-role]') ? el.dataset.role : '');
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
      case 'delete': app.TaskDeleteTask(id, parentEl); break;
      case 'set-ratio': taskSetTaskRatio(id); break;
      case 'add-label': TaskAddLabel(id); break;
      case 'add-sub-timer': addSubTimer(id); break;
      case 'add-progress-minutes': await ui.TaskAddProgressManually(id); break;
      case 'set-target-time': await ui.TaskSetTargetTime(id); break;
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
        await removeActiveTaskIfExists(id);
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
      
      default: 
        compoSelection.ClearItems();
        compoSelection.AddItem(id);
        uiSelection.ReloadSelection();
    }
    
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
        await removeActiveTask();
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
  
  function addSubTimer(taskId) {
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