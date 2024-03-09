let pageDetail = (function() {
  
  let $ = document.querySelector.bind(document);

  let SELF = {
    OpenByTaskId,
  };
    
  function OpenByTaskId(id) {
    screenStateUtil.Navigate('task-detail');
    screenStateUtil.SaveState({
      taskId: id,
    });
    taskDisplayTaskInfo(id);
    app.TaskRefreshMissionTargetETA();
  }
  
  async function taskDisplayTaskInfo(id) {
    
    let item = compoTask.GetById(id);
    let fillData = await compoTask.GetFormattedData(item);
    
    // generate task element
  	let el = window.templateSlot.fill({
  	  data: fillData, 
  	  template: document.querySelector('#tmp-task').content.cloneNode(true), 
  	});

    // el.querySelector('.container-item').classList.toggle('is-child-task', typeof(fillData.parentId) == 'string');

    // set finish count label
    if (fillData.finishCount) {
      el.querySelector('.label-finish-count').textContent = `(${fillData.finishCountProgress} left)`;
    }

    // if (isMissionView && isTopPath) {
      let mission = compoMission.GetMissionById(item.id);
      if (mission) {
        let isStarred = (typeof(mission.lastStarredDate) == 'number');
        el.querySelector('.btn-star').classList.toggle('is-starred', isStarred);
      }
    // } else {
      // let isStarred = (typeof(item.lastStarredDate) != 'undefined');
      // el.querySelector('.btn-star').classList.toggle('is-starred', isStarred);
    // }
    
  	taskEl = el.querySelector('[data-obj="task"]');
  	taskEl.dataset.id = item.id;
  	setActiveSubTaskItem(taskEl, item);
  	if (item.untracked) {
  	  taskEl.stateList.add('--untracked');
  	}
  	
  	// todo: check active task path
  // 	if (activeTask) {
    // 	if (item.id == activeTask.id || activeTaskPath.includes(item.id)) {
    	 // taskEl.stateList.add('--active');
    // 	}
  // 	}

    taskEl.stateList.add('--is-mission');
    el.querySelector('.container-navigate-mission').classList.remove('d-none');
    
    if (lsdb.data.groups.find(x => x.id == item.id)) {
      el.querySelector('.container-navigate').classList.remove('d-none');
    } else {
      el.querySelector('.container-create-sub').classList.remove('d-none');
    }
  // 	el.querySelector('[data-role="progress-bar"]').style.width = percentageProgressTime+'%';
  	
  	
  	// # display sequence tasks
  	ui.RefreshListSequenceByTaskId(item.id, el.querySelector('[data-container="sequence-tasks"]'));
  	
  	if (fillData.type == 'M') {
      viewStateUtil.Add('task', ['collection-only'], el.querySelector('[data-view-group="task"]'));
    }
  
    if (item.targetTime > 0 || item.targetCapTime > 0) {
      viewStateUtil.Add('task', ['has-target'], el.querySelector('[data-view-group="task"]'));
    }
  	
  	
  	$('.page-TaskDetail .widget-task').innerHTML = '';
  	$('.page-TaskDetail .widget-task').append(el);
  	
  }
  
  return SELF;
  
})();