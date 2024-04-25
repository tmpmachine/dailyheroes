let compoKeyboardControl = (function() {
  
  let SELF = {
    Init,
  };
  
  let keyLogged = false;
    
  function Init() {
    // Bind arrow key press events
    Mousetrap.bind('up', function(evt) { handleKeyPress(evt, 'ArrowUp'); });
    Mousetrap.bind('down', function(evt) { handleKeyPress(evt, 'ArrowDown'); });

    // Reset keyLogged variable when any key is released
    document.addEventListener('keyup', handleKeyRelease);
  }
  
  function handleKeyPress(evt, key) {
    if (!keyLogged) {
      // console.log(key);
      keyLogged = true;
      
      let isTaskViewMode = viewStateUtil.HasViewState('task-view-mode', 'task');
      if (!isTaskViewMode) return;

      evt.preventDefault();
      
      if (key == 'ArrowUp') {
        uiSelection.HighlightPrev();
      } else if (key == 'ArrowDown') {
        uiSelection.HighlightNext();
      }
      
    }
  }

  function handleKeyRelease() {
    keyLogged = false;
  }
  
  return SELF;
  
})();