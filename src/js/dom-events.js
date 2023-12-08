window.DOMEvents = {
	clickable: {
	  
	  'navigate-screen': (evt) => ui.NavigateScreen(evt),
	  
	  
	  'turn-off-screen': () => ui.TaskTurnOffScreen(),
	  
	  // # settings data
	  'reset-data': () => app.ResetData(),
	  'backup-data': () => app.BackupData(),
	  'restore-data': () => app.UploadBackupFile(),
	  
	  
	  'show-modal-add-task': () => ui.AddTask(),
    
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
		'show-active': () => document.body.stateList.toggle('--list-mission-archived', false),
		'show-completed': () => document.body.stateList.toggle('--list-mission-archived', true),
		'export-tasks': () => exportTasks(),
		'import-tasks': () => document.body.stateList.toggle('--import-mode'),
		'manage-tasks': () => $('#tasklist-container').stateList.toggle('--manage-mode'),
		
		// bottom buttons
		'ratio-settings': () => RatioSettings(),
		'ratio-config': () => {
		  $('.container-ratio-config').classList.toggle('d-none');
		},
		'save-ratio': () => {
		  let settingsJSON = $('#in-ratio-settings').value.trim();
		  localStorage.setItem('ratio-settings', settingsJSON);
		},
		
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
		'reset-history': async () => {
			if (!window.confirm('Are you sure?')) return;

			clearTaskTotalProgressTime();
			if (window.modeChromeExtension) {
			window.close();
			} else {
				await app.TaskListTask();
				location.reload();
			}
		},
		'mode-day-off': async () => {
			await window.service.SetData({ 'target': (3+8)*60 + 20 });
			updateUI();
		},
		'mode-work-day': async () => {
			await window.service.SetData({ 'target': 3*60 + 20 });
			updateUI();
		},
  	'task-click-handler': (ev) => app.TaskClickHandler(ev.target),
		
		'stop-timer': () => app.TaskStopActiveTask(),
		'start-or-restart-timer': () => startOrRestartTask(),
		
		'finish-timer': () => finishTimer(),
		'set-alarm': async (ev) => {
		  let duration = parseInt(ev.target.dataset.time); // in minutes
		  await setTimerByMinutes(duration);
	  },
	  
	  
	  // # mission groups 
    'new-mission-group': () => uiMission.NewGroup(),
    'rename-active-mission-group': () => uiMission.RenameActiveGroup(),
    'delete-mission-group': () => uiMission.DeleteGroupByName(),
    
    'pick-audio': () => app.SetAlarmAudio(), 
    'remove-audio': () => app.RemoveAlarmAudio(), 
    'test-audio': () => app.TaskPlayAlarmAudio(), 
    
    'change-global-preset-timer': () => ui.ChangeGlobalPresetTimer(),
	},
	
	inputable: {
	  
	  'toggle-sort-by-progress': (evt) => {
	    app.SetSortMode(evt);
	    app.Commit();
	    appSettings.Save();
	    app.TaskListTask();
	  },
	  'toggle-show-target-only': (evt) => {
	    app.SetViewTargetTimeOnly(evt);
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
	  
	  'set-timer': async (ev) => {
	    ev.preventDefault();
	    let form = ev.target;
	    let formData = new FormData(form);
	    let val = formData.get('target');
	    
	    let isValidFormat = false;
	    let duration;
	    try {
	      duration = parseHoursMinutesToMinutes(val);
	      isValidFormat = true;
	    } catch(e) {}
	    try {
	      duration = calculateMinutesUntilTime(val);
	      isValidFormat = true;
	    } catch(e) {}
	    
	    if (isValidFormat) {
  		  await setTimerByMinutes(duration);
      } else {
	      alert('Time format not recognized. Try: 10m, 1h, 1h20m, 1AM, 1:30PM');
	    }
	  },
	  'submit-task': (ev) => {
  		ev.preventDefault();
	    if (ev.target.id.value.length > 0) {
	      app.TaskUpdateTask(ev.target);
	    } else {
	      app.TaskAddTask(ev.target);
	    }
  		let modal = document.querySelectorAll('#projects-modal')[0].toggle();
  		modal.close();
	  },
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
		let taskString = formData.get('tasksString')
		let tasksList = taskString.trim().split('\n')
		.map(x => x.trim().split('- [ ] ')[1]);
		let data = parseList(tasksList)
		
		for (let d of data) {
			addTaskData({
			title: d.title,
			target: parseHoursMinutesToMinutes(d.duration),
			});
		}
		
		form.reset();
		await storeTask();
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
	  
	}
	
};


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


;(() => {
 
  function keyHandler(event) {
    if (event.key == 's') {
      if (onePress.watch(event.type, event.key)) {
        if (event.altKey) {
          toggleStartTimer();
        }
      }
    }
  }
  window.addEventListener('keydown', keyHandler);
  window.addEventListener('keyup', keyHandler);
  
})();