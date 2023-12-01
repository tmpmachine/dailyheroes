let viewUtil = (function() {
    
    let $ = document.querySelector.bind(document);
    let $$ = document.querySelectorAll.bind(document);
    
    let SELF = {
      GetViewGroupNode,
      SetViewTarget,
      Init,
    };
    
    function SetViewTarget(viewTarget) {
      let viewData = viewTarget.split('.');
      let groupName = viewData[0];
      let viewName = viewData[1];
      
      let viewGroupEl = GetViewGroupNode(groupName);
      viewGroupEl.dataset.viewVisible = viewName;
    }
    
    function GetViewGroupNode(groupName) {
      return $(`[data-view-group="${groupName}"]`);
    }
    
    function Init() {
      
      let viewGroupEls = Array.from($$('[data-view-group]'));
    
      for (let viewGroupEl of viewGroupEls) {
        let viewGroupName = viewGroupEl.dataset.viewGroup;
        if ($(`style[data-view-group-control="${viewGroupName}"]`)) continue;
        
        let childViewEls = document.querySelectorAll(`[data-view-group="${viewGroupName}"] [data-view-group-parent="${viewGroupName}"]`);
        
        let childViewNames = Array.from(childViewEls).map(el => el.dataset.viewName);
        let childViewSelectors = childViewNames.map(viewName => `[data-view-group="${viewGroupName}"][data-view-visible~="${viewName}"] [data-view-group-parent="${viewGroupName}"][data-view-name="${viewName}"]`)
        
        let elContainer = document.createElement('style');
        elContainer.dataset.viewGroupControl = viewGroupName;
        elContainer.innerHTML = `${childViewSelectors.join(',')} { display: initial; }`;
        document.body.append(elContainer);
      }
      
    }
    
    return SELF;
    
})();