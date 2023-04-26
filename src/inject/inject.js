document.querySelector('[data-tooltip="Save"]').style.borderBottom = '1px solid dodgerblue';
let keyLocked = false; 

window.addEventListener('blur', (e) => {
	keyLocked = false;
});

window.addEventListener('keydown', keyhandler)
window.addEventListener('keyup', keyhandler)

function keyhandler(e) {
	switch(e.key) {
		case 's':
			if (e.type == 'keydown' && e.ctrlKey) {
				e.preventDefault()
				if (!keyLocked) {
					keyLocked = true;
					autoClickSave();
				}
			} else if (e.type == 'keyup'){
				keyLocked = false;
			}
			break;
	}
}

function autoClickSave() {
	document.querySelector('[data-tooltip="Save"]').click();
}