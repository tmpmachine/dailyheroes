let DOMEvents = (function() {
  
  let eventsMap = {
    
  	clickable: {
  	  
  	  'navigate-screen': (evt) => ui.NavigateScreen(evt),
  	  
  	  
  	  'turn-off-screen': () => ui.TaskTurnOffScreen(),
  	  
  	  // # settings data
  	  'reset-data': () => app.ResetData(),
  	  'backup-data': () => app.BackupData(),
  	  'restore-data': () => app.UploadBackupFile(),
  	  'authorize': () => compoGsiChrome.InitTokenClient(),
  	  'backup-to-cloud': () => compoBackup.TaskBackupAndUploadToCloud(),
  	  'restore-from-cloud': () => compoBackup.TaskRestore(),
  	  
  	  
  	  'show-modal-add-task': () => ui.ShowModalAddTask(),
  	  'show-modal-add-sequence': () => ui.ShowModalAddSequence(),
      
      'view-mission': () => ui.NavigateViewMission(),
      'view-tasks': () => ui.NavigateViewTask(),
      
      'open-task-into-view': () => ui.TaskOpenTaskIntoView(),
  		'manage-tasks': () => $('#tasklist-container').stateList.toggle('--manage-mode'),
  		
  		'task-click-handler': (evt) => app.TaskClickHandler(evt, evt.target),
  		
  		'stop-timer': () => app.TaskStopActiveTask(),
  		'start-or-restart-timer': () => startOrRestartTask(),
  		
  		'finish-timer': () => finishTimer(),
  		
  	  
      'pick-audio': () => app.SetAlarmAudio(), 
      'remove-audio': () => app.TaskRemoveAlarmAudio(), 
      'test-audio': () => app.TaskPlayAlarmAudio(), 
      'stop-test-audio': () => app.StopTestAlarmAudio(), 
      
      'change-global-preset-timer': () => ui.ChangeGlobalPresetTimer(),
      
      
      // # trackers
      'new-tracker': () => uiTracker.NewItem(),
      'stop-tracker': () => uiTracker.StopTracker(),
      'handle-click-list-tracker': (evt) => uiTracker.HandleClickListTracker(evt),
      
      'save-priority-mapper': () => ui.TaskSavePriorityMapper(),
  	},
  	
  	inputable: {
  	  
  	  'handle-input-priority-slider': (evt) => ui.HandleInputPrioritySlider(evt),
  	  
  	  'toggle-sort-by-progress': (evt) => {
  	    app.SetSortMode(evt);
  	    app.Commit();
  	    appSettings.Save();
  	    app.TaskListTask();
  	  },
  	  'toggle-show-target-only': (evt) => {
  	    app.SetViewTargetTimeOnly(evt.target.checked);
  	    app.Commit();
  	    appSettings.Save();
  	    ui.UpdateViewModeState();
  	    app.TaskListTask();
      },
  	  'save-word-template': (e) => {
  	    let val = e.target.value;
  	    window.clearTimeout(window.saveTimeout);
  	    window.saveTimeout = window.setTimeout(async function() {
  	      window.lsdb.data.search = val;
  	      window.lsdb.save();
          // await window.service.SetData({'search': val});
  	    }, 250);
  	  },
  	  'save-label-filter': (e) => {
  	    let val = e.target.value;
  	    window.clearTimeout(window.saveTimeout);
  	    window.saveTimeout = window.setTimeout(async function() {
  	      window.lsdb.data.labelFilter = val;
  	      window.lsdb.save();
  	      loadSearch();
  	    }, 250);
  	  },
  	  
  	},
  	
  	submittable: {
  	  
  	  'submit-task': (evt) => ui.OnSubmitTask(evt),
  	  'submit-sequence-task': (evt) => ui.OnSubmitSequenceTask(evt),
  	  'add-note': (ev) => {
  	    ev.preventDefault();
    		let form = ev.target;
    		addNote(form);
    		let modal = form.closest('.is-modal');
    		modal.close();
      },
  	  
  	},
  	
  	
  	// # onchange
  	changeable: {
  	  
  	  'on-mission-group-change': (evt) => uiMission.OnChangeGroup(evt),
  	  
  	},
  	
  	oninput: {
  	  'handle-input-alarm-volume': (evt) => app.HandleInputAlarmVolume(evt),
  	},
  	onclick: {
  	  'task-click-handler': (evt) => app.TaskClickHandler(evt, evt.target),
  	  'open-by-threshold': () => ui.OpenByThreshold(),
  	  'open-priority-mapper': () => ui.OpenPriorityMapper(),
  	  'finish-interactive-sequence-pick': () => ui.FinishInteractiveSequencePick(),
  	  'new-collection': () => uiCollection.NewItem(),
  	  'handle-click-list-collection': (evt) => uiCollection.HandleClickListContainer(evt),
  	  'open-linked-sequence-from-form': (evt) => ui.OpenLinkedSequenceFromForm(evt),
  	  'open-linked-sequence-priority-mapper': (evt) => ui.OpenLinkedSequenceInPriorityMapper(evt),
  	  'reset-progress-task-from-form': (evt) => ui.TaskResetProgressTaskFromForm(evt),
  	  'distribute-progress-task-from-form': (evt) => ui.TaskDistributeProgressTaskFromForm(evt),
  	  'delete-task-from-form': (evt) => ui.DeleteTaskFromForm(evt),
  	  'convert-collection-sequence': () => ui.TaskConvertCollectionSequence(),
  	  'reset-progress-sequence-from-form': (evt) => ui.ResetProgressSequenceFromForm(evt),
  	  'delete-sequence-from-form': (evt) => ui.DeleteSequenceFromForm(evt),
  	},
  	
  };
  
  
  let listenOn=function(e,t,l){for(let n of document.querySelectorAll(e))n.addEventListener(t,l[n.dataset.callback])};
  
  let listening = function(selector, dataKey, eventType, callbacks) {
    let elements = document.querySelectorAll(selector);
    for (let el of elements) {
      let callbackFunc = callbacks[el.dataset[dataKey]];
      el.addEventListener(eventType, callbackFunc);
    }
  };
  
  function Init() {
    listenOn('.clickable', 'click', eventsMap.clickable);
    listenOn('.submittable', 'submit', eventsMap.submittable);
    listenOn('.inputable', 'input', eventsMap.inputable);
    listenOn('.changeable', 'change', eventsMap.changeable);
    
    listening('[data-onclick]', 'onclick', 'click', eventsMap.onclick);
    listening('[data-oninput]', 'oninput', 'input', eventsMap.oninput);
  }
  
  return {
    Init,
  };
  
})();