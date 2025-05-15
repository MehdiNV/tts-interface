const textArea = document.getElementById('textInput');
const playButton = document.getElementById('playButton');
const micButton = document.getElementById('micButton');
const clearButton = document.getElementById('clearButton');

let voices = [];
let isSpeaking = false;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let audioStream;
let audioContext;
let gainNode;
let destination;
let recordingStartTime = null;

function waitForVoices() {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      speechSynthesis.onvoiceschanged = () => {
        resolve(speechSynthesis.getVoices());
      };
    }
  });
}

function detectLanguage(text) {
  if (/[؀-ۿ]/.test(text)) return 'fa-IR';
  if (/[\u00C0-\u024F]/.test(text) || /\b(und|ist|nicht|das|ein)\b/i.test(text)) return 'de-DE';
  return 'en-US';
}

function getPreferredVoice(lang) {
  const preferredNames = {
    'de-DE': ['Google Deutsch', 'Anna', 'Flo', 'Grandma', 'Helena', 'Martin'],
    'en-US': ['Google US English', 'Samantha', 'Aaron'],
    'en-GB': ['Google UK English Female', 'Daniel'],
    'fa-IR': ['Dariush']
  };
  const list = preferredNames[lang] || [];
  for (const name of list) {
    const match = voices.find(v => v.name === name && v.lang === lang);
    if (match) return match;
  }
  return voices.find(v => v.lang === lang);
}

function speakText(text) {
  if (isSpeaking) {
    speechSynthesis.cancel();
    isSpeaking = false;
    return;
  }
  if (!text) return;

  const lang = detectLanguage(text);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voice = getPreferredVoice(lang);
  if (voice) {
    utterance.voice = voice;
    console.log('Using voice:', voice.name, voice.lang);
  } else {
    console.warn('No matching voice found for', lang);
  }
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onstart = () => {
    isSpeaking = true;
    playButton.innerHTML = "⏸ Pause";
  };

  utterance.onend = () => {
    isSpeaking = false;
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
  };

  utterance.onerror = () => {
    isSpeaking = false;
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
  };

  speechSynthesis.speak(utterance);
}

function speakHoverText(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  const voice = getPreferredVoice('de-DE');
  if (voice) utterance.voice = voice;
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function announce(text, lang = 'de-DE') {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voice = getPreferredVoice(lang);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  speechSynthesis.speak(utterance);
}

function clearText() {
  textArea.value = '';
  textArea.focus();
  announce('Text gelöscht');
}

async function toggleRecording() {
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
            textArea.value = data.text;
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



document.addEventListener('DOMContentLoaded', async () => {

  // Unlock speech synthesis voices on first user interaction (Chrome/macOS workaround)


  // Wait until voices are ready
  voices = await waitForVoices();
  console.log('Loaded voices:', voices.map(v => v.name + ' [' + v.lang + ']').join(', '));

  console.log('Voices loaded');

  micButton.addEventListener('mouseenter', () => speakHoverText('Spracheingabe starten oder stoppen'));
  playButton.addEventListener('mouseenter', () => speakHoverText('Text vorlesen'));
  clearButton.addEventListener('mouseenter', () => speakHoverText('Text löschen'));
  textArea.addEventListener('focus', () => speakHoverText('Geben Sie hier Ihren Text ein oder diktieren Sie ihn'));

  // Unlock speech synthesis voices on first user interaction (Chrome/macOS workaround)
  document.body.addEventListener('click', () => {
    const unlock = new SpeechSynthesisUtterance(' ');
    unlock.volume = 0;
    speechSynthesis.speak(unlock);
  }, { once: true });
  const shortcutInfo = document.createElement('div');
  shortcutInfo.className = 'keyboard-shortcuts';
  shortcutInfo.setAttribute('aria-hidden', 'true');
  shortcutInfo.innerHTML = `
    <h2>Tastenkombinationen</h2>
    <ul>
      <li><strong>R</strong>: Aufnahme starten/stoppen</li>
      <li><strong>P</strong>: Text vorlesen</li>
      <li><strong>C</strong>: Text löschen</li>
      <li><strong>Escape</strong>: Text löschen</li>
      <li><strong>Leertaste</strong>: Text abspielen/pause</li>
      <li><strong>Shift + ?</strong>: Tastenkombinationen vorlesen</li>
    </ul>
  `;
  document.body.appendChild(shortcutInfo);
  textArea.focus();
});

playButton.addEventListener('click', () => {
  speakText(textArea.value.trim());
});

clearButton.addEventListener('click', clearText);

micButton.addEventListener('click', toggleRecording);

document.addEventListener('keydown', e => {
  if (e.key === ' ' && document.activeElement !== textArea) {
    e.preventDefault();
    speakText(textArea.value.trim());
  }
  if (e.key === 'Escape') {
    clearText();
  }
  if (e.key.toLowerCase() === 'r') {
    toggleRecording();
  }
  if (e.key.toLowerCase() === 'p') {
    speakText(textArea.value.trim());
  }
  if (e.key.toLowerCase() === 'c') {
    clearText();
  }
  if (e.shiftKey && e.key === '?') {
    announce('Tastenkombinationen: R für Aufnahme, P für Wiedergabe, C für Löschen, Escape zum Leeren des Texts, Leertaste zum Abspielen');
  }
});
