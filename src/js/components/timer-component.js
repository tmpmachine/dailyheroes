let compoTimer = (function() {
  
  let SELF = {
    ToggleStartByTaskIdAsync,
  };
  
  async function ToggleStartByTaskIdAsync(id) {
    let parentEl = null;
    let task = await compoTask.TaskGetActive();
    if (!task) return;
    
    await app.TaskStopActiveTask();
    await uiTask.SwitchActiveTask(parentEl, id, true);
    await app.TaskContinueTask(id);
    await compoTask.StartTimerByTaskId(id);
    
    app.TaskListTask();
    ui.TaskSetActiveTaskInfo();
  }
  
  return SELF;
  
})();