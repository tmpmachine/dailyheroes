let uiSelection = (function() {
  
  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);
  
  let SELF = {
    FocusTaskElById,
    RefreshSelection,
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
      let offsetNavbar = 14;
      let offsetFloatBar = 42;
      let navbarHeight = 35 + offsetNavbar;
      let floatBarHeight = $('._wgActiveTask').offsetHeight + offsetFloatBar;
      let elOffsetTop = targetElement.offsetTop;
      let elOffsetBottom = targetElement.offsetTop + targetElement.offsetHeight;
      let screenBottom = container.offsetHeight - floatBarHeight;
	
		  if (elOffsetBottom < container.scrollTop + container.offsetHeight - floatBarHeight) {
		    if (elOffsetTop < container.scrollTop + navbarHeight) {
			    container.scrollTop = elOffsetTop - navbarHeight;
		    }
		  } else {
			  container.scrollTop = elOffsetBottom - screenBottom;
		  }
    }
    
    let taskDrawerEl = screenStateUtil.GetActiveScreenEl()?.querySelector('._wgActiveTask')
    viewStateUtil.Add('taskFloatBar', ['quickAction'], taskDrawerEl);
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
  
  function RefreshSelection() {
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

	  let taskDrawerEl = screenStateUtil.GetActiveScreenEl()?.querySelector('._wgActiveTask')
    viewStateUtil.Remove('taskFloatBar', ['quickAction'], taskDrawerEl);
  }
  
  return SELF;
  
})();