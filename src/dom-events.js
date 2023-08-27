window.DOMEvents = {
	clickable: {
	  	'show-modal-add-task': () => showModalAddTask(),
		'show-active': () => document.body.stateList.toggle('--list-mission-archived', false),
		'show-completed': () => document.body.stateList.toggle('--list-mission-archived', true),
		'set-sleep-time': () => setSleepTime(),
		'export-tasks': () => exportTasks(),
		'import-tasks': () => document.body.stateList.toggle('--import-mode'),
		'manage-tasks': () => $('#tasklist-container').stateList.toggle('--manage-mode'),
		'get-report': () => {
			let totalProgessString = GetTotalProgressString();
			alert(`Total timer progress : ${totalProgessString}`) ;
		},
		'reset-progress': async () => {
			// if (!window.confirm('Are you sure?')) return;
			
			await window.service.SetData({ 'history': 0 });
			await window.service.RemoveData('rest');
			clearTaskHistory();
			if (window.modeChromeExtension) {
				await listTask();
			} else {
				await listTask();
				location.reload();
			}
		},
		'reset-history': async () => {
			if (!window.confirm('Are you sure?')) return;

			clearTaskTotalProgressTime();
			if (window.modeChromeExtension) {
			window.close();
			} else {
				await listTask();
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
	  	'task-click-handler': (ev) => taskClickHandler(ev.target),
		'stop-timer': () => stopTimer(),
		'start-or-restart-timer': () => startOrRestartTask(),
		'finish-timer': () => finishTimer(),
		'set-alarm': async (ev) => {
		  let duration = parseInt(ev.target.dataset.time); // in minutes
		  await setTimer(duration);
	  },
	},
	inputable: {
	  'save-word-template': (e) => {
	    let val = e.target.value;
	    window.clearTimeout(window.saveTimeout);
	    window.saveTimeout = window.setTimeout(async function() {
	      window.lsdb.data.search = val;
	      window.lsdb.save();
        // await window.service.SetData({'search': val});
	    }, 250);
	  }
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
  		  await setTimer(duration);
      } else {
	      alert('Time format not recognized. Try: 10m, 1h, 1h20m, 1AM, 1:30PM');
	    }
	  },
	  'add-task': (ev) => {
	    ev.preventDefault();
	    if (ev.target.id.value.length > 0) {
	      updateTask(ev.target);
	    } else {
	      addTask(ev.target)
	    }
		let modal = document.querySelectorAll('#projects-modal')[0].toggle();
		modal.close();
      },
	  'add-note': (ev) => {
	    ev.preventDefault();
		let form = ev.target;
		addNote(form)
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
        // asd();
      }
      
      form.reset();
      await storeTask();
      listTask();
      // const data = {};
      // data.title = formData.get('title') || null;
      // data.ratio = parseFloat(formData.get('ratio')) || null;
      // data.duration = parseInt(formData.get('duration')) || null;
      // return data;
      // asd(data)
    },
	}
};