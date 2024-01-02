async function retrieveAudioFile() {
  try {
    const file = await idbKeyval.get('audioFile');
    if (file) {
      return file;
    } else {
      console.log('File Handle not found in IndexedDB.');
    }
  } catch (error) {
    console.log('Error retrieving File Handle:', error);
  }
}

(async function() {
  
  let audioFile = await retrieveAudioFile();
  if (audioFile) {
    
    // load volume preferences
    let alarmVolume = localStorage.getItem('alarm-audio-volume');
    if (alarmVolume === null) {
      alarmVolume = 1;
    } else {
      alarmVolume = parseFloat(alarmVolume);
    }
    
    // play alarm
    let audioEl = document.querySelector('#audio');
    audioEl.src = URL.createObjectURL(audioFile);
    audioEl.volume = alarmVolume;
    audioEl.play();
  }
  
})();