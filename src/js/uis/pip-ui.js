let uiPiP = (function() {
  
  let $q = null;
  
  let SELF = {
    OpenPiP,
    UpdateCountdownText,
    ReloadActiveTaskInfo,
    StartOrRestartTimer,
    StopTimer,
  };
  
  let local = {
    pipWindow: null,
  };
  
  function StartOrRestartTimer() {
    app.TaskStartOrRestartTask();
  }
  
  function StopTimer() {
    app.TaskStopActiveTask();
  }
  
  async function OpenPiP() {
    
    let el = window.templateSlot.fill({
      data: {}, 
      template: document.querySelector('#tmp-pip-doc').content.cloneNode(true), 
    });
    
    // const player = $("#container-pip");
    local.pipWindow = await documentPictureInPicture.requestWindow();
    
    let docPiP = local.pipWindow.document;
    
    // Copy style sheets over from the initial document
    // so that the player looks the same.
    [...document.styleSheets].forEach((styleSheet) => {
      try {
        const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
        const style = document.createElement('style');
  
        style.textContent = cssRules;
        docPiP.head.appendChild(style);
      } catch (e) {
        const link = document.createElement('link');
  
        link.rel = 'stylesheet';
        link.type = styleSheet.type;
        link.media = styleSheet.media;
        link.href = styleSheet.href;
        docPiP.head.appendChild(link);
      }
    });
    
    docPiP.body.append(el);
    
    local.pipWindow.addEventListener("pagehide", (event) => {
      local.pipWindow = null;
    });
    
    $q = docPiP.querySelector.bind(docPiP);
    
    DOMEventsPiP.Init(docPiP);
    
    ReloadActiveTaskInfo();
  }
  
  async function ReloadActiveTaskInfo() {
    if (!local.pipWindow) return;
    
    let data = await TaskActiveTaskInfoAPI();
    $q('#task-title').textContent = data.taskTitle;
    $q('#sequence-task-title').textContent = data.activeSeqTitle;
  }
  
  
  async function TaskActiveTaskInfoAPI() {
    
    let activeTask = await getActiveTask();
    if (!activeTask) return null;
      
    let uiData = {
      activeSeqTitle: '',
      ratioTimeLeftStr: '',
      taskTitle: activeTask.title,
      targetTime: activeTask.targetTime,
      targetQuotaTime: compoTask.GetTaskQuotaTimeById(activeTask.id),
    };
      
    let ratioTimeLeft = timeLeftRatio.find(x => x.id == activeTask.id);
    if (ratioTimeLeft && ratioTimeLeft.timeLeft > 0) {
      uiData.ratioTimeLeftStr = `${minutesToHoursAndMinutes(ratioTimeLeft.timeLeft)}`;
    }
    
    // active task : sequence info
    {
      compoSequence.Stash(activeTask.sequenceTasks);

    	let activeId = compoSequence.GetActiveId();
    	let activeSeq = compoSequence.GetActive();
    	if (activeSeq) {
        uiData.activeSeqTitle = activeSeq.title;
    	}

    	compoSequence.Pop();
    }
    
    return uiData;
  }
  
  function UpdateCountdownText(countdownStr) {
    if (!local.pipWindow) return;
    
    $q('#txt-countdown').textContent = countdownStr;
  }
  
  
  return SELF;
  
})();