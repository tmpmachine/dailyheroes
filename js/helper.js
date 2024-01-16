export let helper = (function() {
  
  let SELF = {
    ParseHmsToMs,
    ParseHoursMinutesToMinutes,
    ToTimeString,
  };
  
  function ToTimeString(time, format) {
    if (format == 'hms') {
      return secondsToHMS( msToSeconds(time) );
    }
    
    console.log('Time format not recognizable');
    return '';
  }
  
  function msToSeconds(milliseconds) {
    return Math.floor(milliseconds / 1000);
  }
  
  function secondsToHMS(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainderSeconds = seconds % 60;
    let timeString = '';
  
    if (hours > 0) {
      timeString += `${hours}h`;
    }
  
    if (minutes > 0 || hours > 0) {
      timeString += `${minutes}m`;
    }
  
    if (remainderSeconds > 0 || (hours === 0 && minutes === 0)) {
      timeString += `${remainderSeconds}s`;
    }
  
    if (seconds === 0) {
      timeString = '0s';
    }
  
    return timeString;
  }
  
  function ParseHoursMinutesToMinutes(timeString) {
    if (!timeString) {
      return null;
    }
    
    const regex = /^(\d+h)?(\d+m)?$/;
    const match = regex.exec(timeString);
    
    let hours = 0;
    let minutes = 0;
    
    if (match[1]) {
      hours = parseInt(match[1].slice(0, -1));
    }
    
    if (match[2]) {
      minutes = parseInt(match[2].slice(0, -1));
    }
    
    return (hours * 60) + minutes;
  }
  
  function ParseHmsToMs(timeString) {
  
    if (!timeString) return 0;
  
    try {
      const regex = /^(\d+h)?(\d+m)?(\d+s)?$/;
      const match = regex.exec(timeString);
    
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
    
      if (match[1]) {
        hours = parseInt(match[1].slice(0, -1));
      }
    
      if (match[2]) {
        minutes = parseInt(match[2].slice(0, -1));
      }
    
      if (match[3]) {
        seconds = parseInt(match[3].slice(0, -1));
      }
    
      return (hours * 3600000) + (minutes * 60000) + (seconds * 1000);
      
    } catch (e) {
      throw e;
    }
    
    return 0;
    
  }
  
  return SELF;
  
})();