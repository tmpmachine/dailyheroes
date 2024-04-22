let uiSelection = (function() {
  
  let $$ = document.querySelectorAll.bind(document);
  
  let SELF = {
    FocusTaskElById,
    ReloadSelection,
    GetSingleSelection,
    HighlightNext,
    HighlightPrev,
  };
  
  function FocusTaskElById(id, isScroll) {
    
    let taskEl = getTaskElById(id);
    if (!taskEl) return;
    
    taskEl.classList.add('focused');
    
    if (isScroll) {
      const container = $('._containerScreenHome'); 
      const targetElement = taskEl;
      let navbarHeight = 50;
      const scrollPosition = targetElement.offsetTop - container.offsetTop - navbarHeight;
      let delta = container.scrollTop - scrollPosition;
	
		  if (targetElement.offsetTop + 88 + 50 > container.offsetHeight) {
			  container.scrollTop = (targetElement.offsetTop + 88 + 37 + 50)- container.offsetHeight;
		  }
    }
  }
  
  function getTaskElById(id) {
    let el = $(`[data-obj="task"][data-id="${id}"]`);
    if (!el) return null;
    
    return el;
  }
  
  function HighlightPrev() {
    let selectionId = GetSingleSelection();
    
    if (!selectionId) {
      highlightFirstItem();
      return;
    }
    
    let taskId = getPreviousTaskId(selectionId);
    
    highlightById(taskId);
  }
  
  function HighlightNext() {
    let selectionId = GetSingleSelection();
    
    if (!selectionId) {
      highlightFirstItem();
      return;
    }
    
    let taskId = getNextTaskId(selectionId);
    
    highlightById(taskId);
  }
  
  function highlightById(id) {
    if (!id) return;
    
    let isScroll = true;
    
    clearSelection();
    compoSelection.ReplaceItem(id);
    ui.FocusTaskById(id, isScroll);
  }
  
  function getNextTaskId(id) {
    let taskEl = $(`._wgTaskList [data-obj][data-id="${id}"]`);
    
    return taskEl?.nextElementSibling?.dataset.id;
  }
  
  function getPreviousTaskId(id) {
    let taskEl = $(`._wgTaskList [data-obj][data-id="${id}"]`);
    
    return taskEl?.previousElementSibling?.dataset.id;
  }
  
  function highlightFirstItem() {
    let firstTaskElId = $('._wgTaskList [data-obj]')?.dataset.id;
    if (!firstTaskElId) return;
    
    highlightById(firstTaskElId);
  }
  
  function GetSingleSelection() {
    let ids = compoSelection.GetAllItems();
    if (ids.length != 1) return null;
    
    return ids[0];
  }
  
  function ReloadSelection() {
    let ids = compoSelection.GetAllItems();
    let isScrollToView = false;
    
    clearSelection();
    
    for (let id of ids) {
      ui.FocusTaskElById(id, isScrollToView);
    }
    
  }
  
  function clearSelection() {
    for (let el of $$('[data-obj="task"].focused')) {
      el.classList.remove('focused');
    }
  }
  
  return SELF;
  
})();