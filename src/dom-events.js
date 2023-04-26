window.DOMEvents = {
	clickable: {
	  'set-sleep-time': () => setSleepTime(),
	  'export-tasks': () => exportTasks(),
	  'import-tasks': () => document.body.stateList.toggle('--import-mode'),
	  'manage-tasks': () => $('#tasklist').stateList.toggle('--manage-mode'),
	  'clear-history': async () => {
		  await chrome.storage.local.set({ 'history': 0 });
		  await chrome.storage.local.remove('rest');
	    clearTaskHistory();
	    window.close();
	  },
	  'mode-day-off': async () => {
	    // 3h20m + 8h (work substutude)
	    await chrome.storage.local.set({ 'target': (3+8)*60 + 20 });
	    updateUI();
	  },
	  'mode-work-day': async () => {
	    // 3h20m
	    await chrome.storage.local.set({ 'target': 3*60 + 20 });
	    updateUI();
	  },
	  'task-click-handler': (ev) => taskClickHandler(ev.target),
		'stop-timer': () => stopTimer(),
		'set-alarm': async (ev) => {
		  let duration = parseInt(ev.target.dataset.time); // in minutes
		  await setTimer(duration);
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