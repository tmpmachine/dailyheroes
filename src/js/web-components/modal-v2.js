(function() {
    let $ = (selector, node = document) => node.querySelectorAll(selector);
    let version = Math.floor(2.1); // modified for blogsphere2D
    let templateId = `modal-v${version}`;
    class CustomElement extends HTMLElement {
        constructor() {
        super();
        //  /* production-script
        let template = document.createElement('template');
        template.setAttribute('id', templateId);
        template.innerHTML = `<style>
            :host {
            position: relative;
            }
            *,:after,:before{box-sizing:border-box}
            .window {
            padding: 16px 0;
            /*position:fixed;*/
            position: absolute;
            top:0;
            left:0;
            right:0;
            bottom:0;
            /*bottom:2rem;*/
            visibility: visible;
            opacity: 1;
            display: grid;
            margin:0 auto;
            max-width:544px;
            align-items: center;
            transition: 0.25s
            }
            .window.hide {
            visibility: hidden;
            opacity: 0;
            }
            .window .modal {
            transition: 0.25s;
            transform: scale(1);
            display: grid;
            grid-template-rows: 1fr;
            align-items:  center;
            /*grid-template-rows: auto 1fr auto;*/
            margin: 0 16px;
            position: relative;
            overflow: hidden;
            max-height: 100%;
            }
            .window.hide .modal {
            transform: scale(0.95);
            visibility: hidden;;
            }
            .window .overlay{
            background: #000000aa;
            width: 100%;
            height: 100%;
            position: fixed;
            top: 0;
            left: 0;
            }
            slot {
            overflow:  hidden;
            display: grid;
            max-height: 100%;
            grid-template-rows:  1fr;
            }
        </style>
        
        <div class="window hide">
            <div class="overlay"></div>
            <div class="modal">
            <slot name="content"></slot>
            </div>
        </div>`;
        document.querySelector('html').append(template);
        // */
        let content = $(`template#${templateId}`)[0].content.cloneNode(true);
        this.attachShadow({mode: 'open'}).append(content);
        $('slot', this.shadowRoot)[0].addEventListener('slotchange', this.updateContent.bind(this));
        this.onclose = new CustomEvent('onclose');
        this.keyTrapper = this.keyTrapper.bind(this);
        }
        
        hideOverlay() {
        $('.overlay', this.shadowRoot)[0].style.display = 'none'
        }
        
        toggleOverlay() {
        let elOv = this.shadowRoot.q('.overlay');
        if (elOv.getAttribute('style')) {
            elOv.removeAttribute('style')
        } else {
            elOv.style.display = 'none'
        }
        }
        
        toggle(state) {
        let isClosed = $('.window', this.shadowRoot)[0].classList.toggle('hide', state);
        this.isShown = !isClosed;
        if (isClosed) {
            this.dispatchEvent(this.onclose);
            this.removeListener();
        } else {
            this.attachKeytrap();
        }
        return this;
        }
        
        close() {
        let isClosed = $('.window', this.shadowRoot)[0].classList.toggle('hide', true);
        this.dispatchEvent(this.onclose);
        this.removeListener();
        }
        
        removeListener() {
        document.removeEventListener('keydown', this.keyTrapper);
        }
        
        attachKeytrap() {
        let focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        let focusableContent = $(focusableElements, this.modalContent);
        this.firstFocusableElement = focusableContent[0]
        this.lastFocusableElement = focusableContent[focusableContent.length - 1]; 
        let autofocusElement = $('.autofocus', this.modalContent)[0];
        document.addEventListener('keydown', this.keyTrapper);
        let self = this;
        document.activeElement.blur();
        if (autofocusElement) {
            window.setTimeout(function() {
            autofocusElement.focus()
            }, 150);
        }
        }
        
        
        keyTrapper(e) {
        let isTabPressed = e.key === 'Tab' || e.keyCode === 9;
        let isEscape = e.key === 'Escape' || e.keyCode === 27;
        if (isEscape)
            this.close();
        if (!isTabPressed) {
            return;
        }
        
        if (e.shiftKey) { 
            if (document.activeElement === this.firstFocusableElement) {
            this.lastFocusableElement.focus(); 
            e.preventDefault();
            }
        } else {
            if (document.activeElement === this.lastFocusableElement) {
            this.firstFocusableElement.focus();
            e.preventDefault();
            }
        }
        }
        
        connectedCallback() {
        $('.overlay', this.shadowRoot)[0].addEventListener('click', this.close.bind(this));
        }
        
        updateContent(evt) {
        let contentDOM = evt.target.assignedNodes()[0];
        this.modalContent = contentDOM;
        this.modalContent.addEventListener('click', this.closeHandler.bind(this))
        // for (let node of $('.toggler', contentDOM))
            // node.addEventListener('click', this.close.bind(this));
        }
        
        closeHandler(event) {
        let el = event.target;
        if (el.closest('.toggler')) {
            let isClosed = $('.window', this.shadowRoot)[0].classList.toggle('hide', true);
            this.dispatchEvent(this.onclose);
            this.removeListener();
        }
        }
        
    }
    customElements.define(templateId, CustomElement);
})();