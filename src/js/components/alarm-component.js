let compoAlarm = (function() {
  
    let SELF = {
        Set,
    };

    async function Set() {
        if (!window.modeChromeExtension) return;

        let userVal = await windog.prompt('Alarm when (HMS from now)');
        if (userVal === null) return;

        let parsedVal = helper.ParseHmsToMs(userVal, {
            defaultUnit: 'm',
        });

        await chrome.runtime.sendMessage({
            message: 'create-stop-tasks-alarm',
            data: {
                when: Date.now() + parsedVal
            }
        });

        windog.alert('Alarm set');
    }

    return SELF;
    
})();