let uiQuickSearch = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    HandleSearch,
    OpenModal,
    HandleCloseModal,
  };
  
  let eventsMap = {
    'handle-click-qs-result': (evt) => handleClickResult(evt),
  };
  
  function handleClickAction(action, data, itemEl) {
    switch (action) {
      case 'unarchive': unarchive(data.id, itemEl); break;
    }
  }
  
  async function OpenModal() {
    windog.quickSearch({
      initCallback: (dialogEl) => onModalInit(dialogEl),
    });
  }
  
  function onModalInit(dialogEl) {
    DOMEvents.InitLazy(dialogEl, eventsMap);
    compoQuickSearch.RefreshItems();
    let searchResult = compoQuickSearch.SearchByTitle('');
    refreshSearchResult(searchResult);
    dialogEl.querySelector('form').reset();
    dialogEl.querySelector('[type="search"]').addEventListener('input', uiQuickSearch.HandleSearch);
    dialogEl.addEventListener('close', HandleCloseModal);
  }
  
  function HandleCloseModal(evt) {
    let dialog = evt.target;
    let taskId = dialog.returnValue;
    if (!taskId) return;

    compoMission.MoveToActive(taskId);
    compoMission.Commit();
    appData.Save();
    compoTimer.ToggleStartByTaskIdAsync(taskId);
  }
  
  function HandleSearch(evt) {
    let searchResult = compoQuickSearch.SearchByTitle(evt.target.value);
    refreshSearchResult(searchResult);
  }
  
  function refreshSearchResult(items = []) {
    let container = $('._quickSearchResult');
    let docFrag = document.createDocumentFragment();
    
    for (let item of items) {
      let { title } = item;
      let ratioTimeLeftStr = getRatioTimeLeftStr(item);
      let el = window.templateSlot.fill({
        data: {
          title,
          ratioTimeLeftStr,
        }, 
        template: document.querySelector('#tmp-qs-result-item').content.cloneNode(true), 
      });
      el.querySelector('[data-kind="item"]').dataset.id = item.id;
      el.querySelector('[data-action="take-mission"]').value = item.id;
      docFrag.append(el);
    }
    
    container.replaceChildren(docFrag);
  }
  
  function getRatioTimeLeftStr(item) {
    let originTask = app.GetTaskById(item.originId);
    let ratioTimeLeftStr = '';
    
    if ((originTask ?? item).ratio > 0 || (originTask ?? item).targetTime > 0) {
      {
        let targetTime = (originTask ?? item).targetTime;
        if (targetTime > 0) {
          ratioTimeLeftStr = `${ secondsToHMS(msToSeconds(targetTime)) }`;
        }
      }
    }
    
    return ratioTimeLeftStr;
  }
  
  function unarchive(id, itemEl) {
    itemEl.remove();
    compoMission.MoveToActive(id);
    compoMission.Commit();
    appData.Save();
    app.TaskListTask();
  }
  
  function handleClickResult(evt) {
    let targetEl = evt.target;
    let itemEl = targetEl?.closest('[data-kind="item"]');
    let action = targetEl?.closest('[data-action]')?.dataset.action;
    
    if (!itemEl) return;
  
    let data = {
        id: itemEl.dataset.id,
    };
    
    handleClickAction(action, data, itemEl);
  }
  
  
  return SELF;
  
})();