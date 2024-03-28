(function() {
  let $ = document.querySelector.bind(document);
  let templateId = `taskdrawer-v1`;

  class CustomElement extends HTMLElement {
    constructor() {
      super();
      // this._shadowRoot = this.attachShadow({ 'mode': 'open' });
      let templateEl = $('#'+templateId).content.cloneNode(true);
      this.appendChild(templateEl);
      
      this.taskInitListeners();
    }
    
    connectedCallback() { }
    
    async taskInitListeners() {
      await componentLoader.WaitUntil(() => typeof(DOMEvents) != 'undefined');
      DOMEvents.InitLazy(this);
    }
    
  }
  window.requestAnimationFrame(() => {
    customElements.define(templateId, CustomElement);
  });
})();