let windog = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    alert,
    confirm,
    prompt,
  };
  
  let local = {
    dialogQueueResolver: [],
  };
  
  
  // $useroptions # user defined value
  
  let dialogOptions = {
    alert: {
      templateId: 'tmp-dialog-alert',
      onResolve: () => true,
    },
    confirm: {
      templateId: 'tmp-dialog-confirm',
      onResolve: (resolve, dialogEl) => handleConfirmDialog(resolve, dialogEl),
    },
    prompt: {
      defaultValue: null,
      templateId: 'tmp-dialog-prompt',
      onResolve: (resolve, dialogEl) => handlePromptDialog(resolve, dialogEl),
    },
  };
  
  async function prompt(message='', defaultValue='') {
    return await showDialogAsync(dialogOptions.prompt, {
      message,
      defaultValue,
    });
  }
  
  async function confirm(message='') {
    return await showDialogAsync(dialogOptions.confirm, {
      message,
    });
  }
  
  async function alert(message='') {
    return await showDialogAsync(dialogOptions.alert, {
      message,
    });
  }
  
  // $useroptions
  
  
  function handleConfirmDialog(resolve, dialogEl) {
    let result = (dialogEl.returnValue == 'ok');
    resolve(result);
  }
  
  function handlePromptDialog(resolve, dialogEl) {
    if (dialogEl.returnValue == 'ok') {
      resolve(dialogEl.querySelector('[data-kind="input"]')?.value);
    } else {
      resolve(null);
    }
  }
  
  async function showDialogAsync(dialogOption, userOptions) {
    return new Promise(async resolve => {
      let persistentOptions = {
        resolver: {
          resolve,
        },
      };
      let mixedOptions = Object.assign(dialogOption, userOptions, persistentOptions);
      let {templateId, message, defaultValue} = mixedOptions;
      
      // queue this dialog and wait for previous dialog to resolve
      await subscribeDialogAsync();
      
      let el = $(`#${templateId}`).content.cloneNode(true);
      let dialogEl = el.querySelector('dialog');
      let inputEl = el.querySelector('[data-kind="input"]');
      let dialogData = {
        dialogItem: mixedOptions,
      };
      
      el.querySelector('[data-kind="message"]')?.replaceChildren(message);
      if (inputEl) {
        inputEl.value = defaultValue;
      };
      
      dialogEl.querySelector('.backdrop')?.addEventListener('click', () => dialogEl.close());
      dialogEl.addEventListener('close', onModalClose);
      attachKeytrap(dialogEl, dialogData);
      dialogEl._windogData = dialogData;
      
      document.body.append(el);
      dialogEl.showModal();
    });
  }
  
  function onModalClose(evt) {
    let dialogItem = evt.target._windogData.dialogItem;
    let dialogEl = evt.target;
    
    dialogEl.remove();
    dialogItem.onResolve(dialogItem.resolver.resolve, dialogEl);
    
    let nextDialog = local.dialogQueueResolver.pop();
    nextDialog?.resolve();
  }
  
  async function subscribeDialogAsync() {
    return new Promise(resolve => {
      if (local.dialogQueueResolver.length == 0) {
        resolve();
      }
      
      // we still push the first dialog even after resolve so that the later can wait in line
      local.dialogQueueResolver.push({
        resolve,
      });
    });
  }

  function attachKeytrap(dialogEl, dialogData) {
    let focusableContent = dialogEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    
    dialogData.firstFocusableElement = focusableContent[0];
    dialogData.lastFocusableElement = focusableContent[focusableContent.length - 1];

    dialogEl.addEventListener('keydown', keyTrapper);
  }
        
  function keyTrapper(evt) {
    let isTabPressed = (evt.key == 'Tab');
    if (!isTabPressed) return;
    
    let dialogEl = evt.target.closest('dialog');
    let {firstFocusableElement, lastFocusableElement} = dialogEl._windogData;
    
    if (evt.shiftKey) { 
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement.focus(); 
        evt.preventDefault();
      }
    } else if (document.activeElement === lastFocusableElement) {
      firstFocusableElement.focus();
      evt.preventDefault();
    }
  }

  return SELF;
  
})();