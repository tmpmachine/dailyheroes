(function() {
  let $ = document.querySelector.bind(document);
  let templateId = `taskdrawer-v1`;

  class CustomElement extends HTMLElement {
    constructor() {
      super();
      // this._shadowRoot = this.attachShadow({ 'mode': 'open' });
      let templateEl = $('#'+templateId).content.cloneNode(true);
      this.appendChild(templateEl);
    }
    
    connectedCallback() { }
    
  }
  window.requestAnimationFrame(() => {
    customElements.define(templateId, CustomElement);
  });
})();