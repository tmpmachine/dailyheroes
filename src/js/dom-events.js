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
      
      'view-mission': () => {
        changeViewModeConfig('mission');
        resetActiveGroupId();
        lsdb.save();
        ui.BuildBreadcrumbs();
        app.TaskListTask();
      },
      'view-tasks': () => {
        changeViewModeConfig('tasks');
        resetActiveGroupId();
        lsdb.save();
        ui.BuildBreadcrumbs();
        app.TaskListTask();
      },
      
      'open-task-into-view': () => taskOpenTaskIntoView(),
  		'export-tasks': () => exportTasks(),
  		'import-tasks': () => document.body.stateList.toggle('--import-mode'),
  		'manage-tasks': () => $('#tasklist-container').stateList.toggle('--manage-mode'),
  		
  		'reset-progress': async () => {
  			// if (!window.confirm('Are you sure?')) return;
  			
  			await window.service.SetData({ 'history': 0 });
  			await window.service.RemoveData('rest');
  			clearTaskHistory();
  			if (window.modeChromeExtension) {
  				await app.TaskListTask();
  			} else {
  				await app.TaskListTask();
  				location.reload();
  			}
  		},
  		'task-click-handler': (evt) => app.TaskClickHandler(evt, evt.target),
  		
  		'stop-timer': () => app.TaskStopActiveTask(),
  		'start-or-restart-timer': () => startOrRestartTask(),
  		
  		'finish-timer': () => finishTimer(),
  		
  	  
      'pick-audio': () => app.SetAlarmAudio(), 
      'remove-audio': () => app.RemoveAlarmAudio(), 
      'test-audio': () => app.TaskPlayAlarmAudio(), 
      
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
  	  'import-tasks': async (ev) => {
  	    ev.preventDefault();
  	    let form = ev.target;
  		const formData = new FormData(form);
  		let taskString = formData.get('tasksString');
  		let tasksList = taskString.trim().split('\n')
  		.map(x => x.trim().split('- [ ] ')[1]);
  		let data = parseList(tasksList);
  		
  		for (let d of data) {
  			addTaskData({
  			title: d.title,
  			target: parseHoursMinutesToMinutes(d.duration),
  			});
  		}
  		
  		form.reset();
  		await appData.TaskStoreTask();
  		app.TaskListTask();
  		// const data = {};
  		// data.title = formData.get('title') || null;
  		// data.ratio = parseFloat(formData.get('ratio')) || null;
  		// data.duration = parseInt(formData.get('duration')) || null;
  		// return data;
      },
  	  
  	},
  	
  	
  	// # onchange
  	changeable: {
  	  
  	  'on-mission-group-change': (evt) => uiMission.OnChangeGroup(evt),
  	  
  	},
  	
  	onclick: {
  	  'open-priority-mapper': () => ui.OpenPriorityMapper(),
  	  'finish-interactive-sequence-pick': () => ui.FinishInteractiveSequencePick(),
  	  'new-collection': () => uiCollection.NewItem(),
  	  'handle-click-list-collection': (evt) => uiCollection.HandleClickListContainer(evt),
  	  'open-linked-sequence-from-form': (evt) => ui.OpenLinkedSequenceFromForm(evt),
  	  'open-linked-sequence-priority-mapper': (evt) => ui.OpenLinkedSequenceInPriorityMapper(evt),
  	  'reset-progress-task-from-form': (evt) => ui.ResetProgressTaskFromForm(evt),
  	  'delete-task-from-form': (evt) => ui.DeleteTaskFromForm(evt),
  	  'convert-collection-sequence': () => ui.TaskConvertCollectionSequence(),
  	  'reset-progress-sequence-from-form': (evt) => ui.ResetProgressSequenceFromForm(evt),
  	  'delete-sequence-from-form': (evt) => ui.DeleteSequenceFromForm(evt),
  	}
  	
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
  }
  
  return {
    Init,
  };
  
})();