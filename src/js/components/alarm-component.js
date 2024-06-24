let compoAlarm = (function() {
  
    let SELF = {
        Set,
    };

    async function Set() {
        if (!window.modeChromeExtension) return;

        // get alarm
        let alarms = await chrome.alarms.getAll();
        let alarm = alarms.find(x => x.name == 'stop-alarm');
        let defaultValue = null;
        if (alarm?.scheduledTime) {
            defaultValue = helper.ToTimeString(alarm.scheduledTime - Date.now(), 'hms');
        }

        // get user value
        let userVal = await windog.prompt('Alarm when (HMS from now)', defaultValue);
        if (userVal === null) return;

        let parsedVal = helper.ParseHmsToMs(userVal, {
            defaultUnit: 'm',
        });

        // reset alarm
        await chrome.alarms.clear('stop-alarm')
        if (parsedVal > 0) {
                await chrome.runtime.sendMessage({
                    message: 'create-stop-tasks-alarm',
                data: {
                    when: Date.now() + parsedVal
                }
            });
        }

        windog.alert('Alarm set');
        pageHome.RefreshAlarmBadge_();
    }

    return SELF;
    
})();