let pageDetail = (function() {
  
  let $ = document.querySelector.bind(document);

  let SELF = {
    OpenByTaskId,
  };
  
  function OpenByTaskId(id) {
    viewStateUtil.Set('screens', ['task-detail']);
    
    taskDisplayTaskInfo(id);
  }
  
  async function taskDisplayTaskInfo(id) {
    
    let activeTask = await compoTask.TaskGetActive();
    let item = compoTask.GetById(id);
    
    let activeTimerDistance = await getActiveTimerDistance(); // minutes
    let activeTimerDistanceTime = await getActiveTimerDistanceTime(); // milliseconds
    
    let liveProgress = 0;
    let liveProgressTime = 0;
    if (activeTask && item.id == activeTask.id) {
      liveProgress = activeTimerDistance;
      liveProgressTime = activeTimerDistanceTime;
    }
    
    let durationTime = item.durationTime - item.progressTime - liveProgressTime;
    let progressMinutesLeft = msToMinutes(item.progressTime);
  
    // # set ratio time left string
    let ratioTimeLeftStr = '';
    let targetCapTimeStr = '';
    
    if (item.targetCapTime > 0) {
      targetCapTimeStr = helper.ToTimeString(item.targetCapTime, 'hms');
    }
    
    // ## handle if self task
    if (item.ratio > 0 || item.targetTime > 0)
    {
      {
        let targetTime = item.targetTime;
        if (activeTask && activeTask.id == item.id) {
          targetTime = Math.max(0, targetTime - activeTimerDistanceTime);
        }
        if (targetTime > 0) {
          ratioTimeLeftStr = `${ secondsToHMS(msToSeconds(targetTime)) }`;
        }
      }
      
      // ## handle if other task
      if (activeTask && activeTask.id != item.id && item.ratio > 0 && item.targetTime > 0) {
        
        let targetTime = item.targetTime;
        
        // calculate active task progress and target difference
        try {
  
          let addedTime = activeTimerDistanceTime;
          let ratio = activeTask.ratio;
          if (ratio > 0) {
            let excessTime = activeTask.targetTime - addedTime;
            if (excessTime < 0) {
              
              let remainingRatio = 100 - ratio;
              let timeToDistribute = ( addedTime *  ( remainingRatio / 100 ) ) / ( ratio / 100 );
            
              let addedTargetTime = Math.round(timeToDistribute * (item.ratio / remainingRatio));
              targetTime = addOrInitNumber(targetTime, addedTargetTime);
            }
          }
          
          if (isSubTaskOf(activeTask.parentId, item.id)) {
            targetTime -= activeTimerDistanceTime;
          }
          
        } catch (e) {
          console.error(e);
        }
        
        if (targetTime > 0) {
          ratioTimeLeftStr = `${ secondsToHMS(msToSeconds(targetTime)) }`;
        }
        
      }
    
    }
    
    // ROP info
    let ratioStr = '';
    if (item.ratio) {
      let totalPriorityPoint = compoTask.GetTotalPriorityPointByParentTaskId(item.parentId);
      let rop = Math.round(item.ratio / totalPriorityPoint * 10000) / 100;
      ratioStr = `ROP ${rop}%`;
    }
    
    // show mission path
    let missionPath = '';
    let isTopPath = isTopMissionPath(item.id);
    if (isMissionView && isTopPath || IsShowTargetTimeOnly()) {
      ratioStr = '';
      missionPath = getAndComputeMissionPath(item.parentId);
    }
    
    
    // show total task progress (self + child tasks)
    let totalProgressStr = '';
    {
      let totalMsProgressChildTask = sumAllChildProgress(item.id);
      let totalProgressTime = item.totalProgressTime + totalMsProgressChildTask;
      if (totalProgressTime > 0) {
        totalProgressStr = `${helper.ToTimeString(totalProgressTime, 'hms')}`;
      }
    }

    let durationTimeStr = helper.ToTimeString(durationTime, 'hms');
    let fillData = {...item, ...{
      // targetString: minutesToHoursAndMinutes(item.target),
      // rankLabel: ` | Rank #${rankLabel}`,
      missionPath,
      ratio: ratioStr,
      ratioTimeLeftStr,
      durationTimeStr: helper.ToTimeString(item.durationTime, 'hms'),
      targetCapTimeStr,
      totalProgressStr,
      targetString: (durationTimeStr.trim().length > 0 ? `${durationTimeStr} left` : ''),
      allocatedTimeString: minutesToHoursAndMinutes(item.target),
      progress: progressMinutesLeft ? minutesToHoursAndMinutes(progressMinutesLeft) : '0m',
    }};


    // set note progress time label
    if (fillData.note) {
      fillData.note.map(item => {
        if (item.totalProgressTime) {
          item.progressTimeLabel = minutesToHoursAndMinutes(msToMinutes(item.totalProgressTime));
        }
        return item;
      });
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

    if (fillData.note) {
      let index = 0;
      fillData.note = fillData.note.map(x => { x.index = index; index++; return x})
    }

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

    // star button
    if (isMissionView && isTopPath) {
      let mission = compoMission.GetMissionById(item.id);
      if (mission) {
        let isStarred = (typeof(mission.lastStarredDate) == 'number');
        el.querySelector('.btn-star').classList.toggle('is-starred', isStarred);
      }
    } else {
      let isStarred = (typeof(item.lastStarredDate) != 'undefined');
      el.querySelector('.btn-star').classList.toggle('is-starred', isStarred);
    }
    
  	taskEl = el.querySelector('[data-obj="task"]');
  	taskEl.dataset.id = item.id;
  	setActiveSubTaskItem(taskEl, item);
  	if (item.untracked) {
  	  taskEl.stateList.add('--untracked');
  	}
  	
  	// todo: check active task path
  	if (activeTask) {
    	if (item.id == activeTask.id || activeTaskPath.includes(item.id)) {
    	  taskEl.stateList.add('--active');
    	}
  	}

    taskEl.stateList.add('--is-mission');
    el.querySelector('.container-navigate-mission').classList.remove('d-none');
    
    if (lsdb.data.groups.find(x => x.id == item.id)) {
      el.querySelector('.container-navigate').classList.remove('d-none');
    } else {
      el.querySelector('.container-create-sub').classList.remove('d-none');
    }
  	el.querySelector('[data-role="progress-bar"]').style.width = percentageProgressTime+'%';
  	
  	
  	// # display sequence tasks
  	ui.RefreshListSequenceByTaskId(item.id, el.querySelector('[data-container="sequence-tasks"]'));
  	
  	if (fillData.type == 'M') {
      viewStateUtil.Add('task', ['collection-only'], el.querySelector('[data-view-group="task"]'));
    }
  
    if (item.targetTime > 0 || item.targetCapTime > 0) {
      viewStateUtil.Add('task', ['has-target'], el.querySelector('[data-view-group="task"]'));
    }
  	
  	
  	$('.page-TaskDetail .widget-task').append(el);
    
  }
  
  return SELF;
  
})();