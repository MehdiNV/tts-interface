const textDisplay = document.getElementById('textDisplay');
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
let currentRate = 'slow';
let currentAudio = null;
let wordMap = {};

function waitForVoices() {
  return new Promise((resolve) => {
    const v = speechSynthesis.getVoices();
    if (v.length > 0) {
      resolve(v);
    } else {
      speechSynthesis.onvoiceschanged = () => {
        resolve(speechSynthesis.getVoices());
      };
    }
  });
}

function interruptAudioPlayback() {
  if (isSpeaking && currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
    isSpeaking = false;
    playButton.classList.remove('playing');
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
    const spans = document.querySelectorAll('#textDisplay .word');
    spans.forEach(span => span.classList.remove('spoken', 'current'));
  }
}

function detectLanguage(text) {
  if (/[؀-ۿ]/.test(text)) return 'fa-IR';
  if (/[À-ɏ]/.test(text) || /\b(und|ist|nicht|das|ein)\b/i.test(text)) return 'de-DE';
  return 'en-US';
}

function clearText() {
  interruptAudioPlayback();
  textDisplay.innerText = '';
  textDisplay.focus();
  announce('Text gelöscht');
}

function highlightTextByWords(text) {
  const words = text.trim().split(/\s+/);
  wordMap = {};
  textDisplay.innerHTML = '';
  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.dataset.index = index;
    const clean = word.replace(/[“”‘’"',.?!:;]/g, '').toLowerCase();
    wordMap[clean + '-' + index] = index;
    span.textContent = word + ' ';
    textDisplay.appendChild(span);
  });
}

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

document.addEventListener('DOMContentLoaded', async () => {
  voices = await waitForVoices();
  console.log('Loaded voices:', voices.map(v => v.name + ' [' + v.lang + ']').join(', '));

  document.body.addEventListener('click', () => {
    const unlock = new SpeechSynthesisUtterance(' ');
    unlock.volume = 0;
    speechSynthesis.speak(unlock);
  }, { once: true });

  const shortcutInfo = document.createElement('div');
  shortcutInfo.className = 'keyboard-shortcuts';
  shortcutInfo.setAttribute('aria-hidden', 'true');

  const heading = document.createElement('h2');
  heading.textContent = 'Tastenkombinationen';

  const list = document.createElement('ul');
  [
    ['R', 'Aufnahme starten/stoppen'],
    ['P', 'Text vorlesen'],
    ['C', 'Text löschen'],
    ['Escape', 'Text löschen'],
    ['Leertaste', 'Text abspielen/pause'],
    ['Shift + ?', 'Tastenkombinationen vorlesen']
  ].forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = key;
    li.appendChild(strong);
    li.append(`: ${label}`);
    list.appendChild(li);
  });

  shortcutInfo.appendChild(heading);
  shortcutInfo.appendChild(list);
  document.body.appendChild(shortcutInfo);

  textDisplay.focus();
});

function convertTextToSSML(text) {
  const words = text.trim().split(/\s+/);
  const markedWords = words.map(word => {
    const clean = word.replace(/[“”‘’"',.?!:;]/g, '').toLowerCase();
    return `<mark name="${clean}"/> ${word}`;
  });
  return `<speak xmlns="http://www.w3.org/2001/10/synthesis" version="1.0">${markedWords.join(' ')}</speak>`;
}

async function speakWithGoogleTTS(ssmlText, originalText) {
  if (!ssmlText) return;
  if (isSpeaking) {
    interruptAudioPlayback();
    return;
  }

  const languageCode = detectLanguage(originalText);
  const useSSML = languageCode !== 'fa-IR';
  const payload = {
    text: useSSML ? ssmlText : originalText,
    languageCode,
    isSSML: useSSML
  };

  isSpeaking = true;
  playButton.classList.add('playing');
  playButton.innerHTML = "⏸ Pause";

  try {
    const response = await fetch('/.netlify/functions/googleTTS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.audioContent) {
      console.error('Google TTS error response:', result);
      throw new Error(result.error || 'Invalid audio response from Google TTS');
    }

    const audioContent = result.audioContent;
    const timepoints = result.timepoints || [];

    const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    highlightTextByWords(originalText);
    const wordSpans = document.querySelectorAll('#textDisplay .word');
    const words = originalText.trim().split(/\s+/).map(word => word.replace(/[“”‘’"',.?!:;]/g, '').toLowerCase());

    function trackAudioProgress() {
      if (!audio || audio.paused || audio.ended) return;
      const currentTime = audio.currentTime;

      for (let i = 0; i < timepoints.length; i++) {
        const start = parseFloat(timepoints[i].timeSeconds);
        const nextStart = timepoints[i + 1] ? parseFloat(timepoints[i + 1].timeSeconds) : Infinity;

        if (currentTime >= start && currentTime < nextStart) {
          const currentMark = timepoints[i].markName.toLowerCase();
          const index = words.findIndex(w => w === currentMark);

          if (index !== -1) {
            wordSpans.forEach(span => span.classList.remove('spoken', 'current'));
            for (let j = 0; j < index; j++) wordSpans[j].classList.add('spoken');
            const currentSpan = wordSpans[index];
            currentSpan.classList.add('current');
            currentSpan.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
          break;
        }
      }

      requestAnimationFrame(trackAudioProgress);
    }

    audio.onended = () => {
      isSpeaking = false;
      currentAudio = null;
      playButton.classList.remove('playing');
      playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
      const spans = document.querySelectorAll('#textDisplay .word');
      spans.forEach(span => span.classList.remove('spoken', 'current'));
    };

    audio.onplay = () => {
      if (timepoints.length > 0) requestAnimationFrame(trackAudioProgress);
    };

    audio.play();

  } catch (err) {
    console.error('Google TTS error:', err);
    isSpeaking = false;
    playButton.classList.remove('playing');
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
  }
}

playButton.addEventListener('click', () => {
  const originalText = textDisplay.innerText.trim();
  const ssml = convertTextToSSML(originalText);
  speakWithGoogleTTS(ssml, originalText);
});




clearButton.addEventListener('click', () => {
  interruptAudioPlayback();
  textDisplay.innerText = '';
  textDisplay.focus();
});

micButton.addEventListener('click', toggleRecording);

document.addEventListener('keydown', (e) => {
  const isTyping = document.activeElement === textDisplay;
  if (!isTyping && e.key === ' ') {
    e.preventDefault();
    const originalText = textDisplay.innerText.trim();
    const ssml = convertTextToSSML(originalText);
    speakWithGoogleTTS(ssml, originalText);
  }
  if (!isTyping && e.key.toLowerCase() === 'r') {
    toggleRecording();
  }
  if (!isTyping && e.key.toLowerCase() === 'p') {
    const originalText = textDisplay.innerText.trim();
    const ssml = convertTextToSSML(originalText);
    speakWithGoogleTTS(ssml, originalText);
  }
  if (!isTyping && e.key.toLowerCase() === 'c') {
    interruptAudioPlayback();
    textDisplay.innerText = '';
    textDisplay.focus();
  }
  if (e.key === 'Escape') {
    interruptAudioPlayback();
    textDisplay.innerText = '';
    textDisplay.focus();
  }
  if (!isTyping && e.shiftKey && e.key === '?') {
    announce('Tastenkombinationen: R für Aufnahme, P für Wiedergabe, C für Löschen, Escape zum Leeren des Texts, Leertaste zum Abspielen');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  voices = await waitForVoices();
  console.log('Loaded voices:', voices.map(v => v.name + ' [' + v.lang + ']').join(', '));

  document.body.addEventListener('click', () => {
    const unlock = new SpeechSynthesisUtterance(' ');
    unlock.volume = 0;
    speechSynthesis.speak(unlock);
  }, { once: true });

  const shortcutInfo = document.createElement('div');
  shortcutInfo.className = 'keyboard-shortcuts';
  shortcutInfo.setAttribute('aria-hidden', 'true');

  const heading = document.createElement('h2');
  heading.textContent = 'Tastenkombinationen';

  const list = document.createElement('ul');
  [
    ['R', 'Aufnahme starten/stoppen'],
    ['P', 'Text vorlesen'],
    ['C', 'Text löschen'],
    ['Escape', 'Text löschen'],
    ['Leertaste', 'Text abspielen/pause'],
    ['Shift + ?', 'Tastenkombinationen vorlesen']
  ].forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = key;
    li.appendChild(strong);
    li.append(`: ${label}`);
    list.appendChild(li);
  });

  shortcutInfo.appendChild(heading);
  shortcutInfo.appendChild(list);
  document.body.appendChild(shortcutInfo);

  textDisplay.focus();
});
