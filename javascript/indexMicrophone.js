// Microphone functionality ----------------------------------------------------
async function toggleRecording() {
  interruptAudioPlayback();

  if (!isRecording) {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(audioStream);
      gainNode = audioContext.createGain();
      gainNode.gain.value = 2.0;
      destination = audioContext.createMediaStreamDestination();
      source.connect(gainNode);
      gainNode.connect(destination);

      mediaRecorder = new MediaRecorder(destination.stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const duration = Math.round((Date.now() - recordingStartTime) / 1000);
        audioStream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');

        try {
          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer YOUR_OPENAI_API_KEY`
            },
            body: formData
          });

          const data = await response.json();
          if (data.text) {
            textDisplay.innerText = data.text;
            announce('Transkription abgeschlossen');
          } else {
            announce('Fehler bei der Transkription');
          }
        } catch (error) {
          console.error('API call failed:', error);
          announce('Verbindung zur Spracherkennung fehlgeschlagen');
        }

        announce(`Aufnahme gestoppt nach ${duration} Sekunden`);
      };

      mediaRecorder.start();
      recordingStartTime = Date.now();
      isRecording = true;
      micButton.classList.add('recording');
      announce('Aufnahme gestartet');

    } catch (err) {
      console.error('Microphone access error:', err);
      announce('Mikrofonzugriff verweigert');
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    micButton.classList.remove('recording');
  }
}

micButton.addEventListener('click', toggleRecording);
// -- Microphone functionality -------------------------------------------------
