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

    // Clear highlights
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

async function speakWithGoogleTTS(text) {
  if (!text) return;
  if (isSpeaking) {
    interruptAudioPlayback();
    return;
  }

  const languageCode = detectLanguage(text);

  isSpeaking = true;
  playButton.classList.add('playing');
  playButton.innerHTML = "⏸ Pause";

  try {
    const response = await fetch('/.netlify/functions/googleTTS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, languageCode })
    });

    const { audioContent, timepoints } = await response.json();

    const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    highlightTextByWords(text);
    const wordSpans = document.querySelectorAll('#textDisplay .word');

    audio.ontimeupdate = () => {
      const currentTime = audio.currentTime;
      if (!timepoints || !timepoints.length) return;

      let i = 0;
      for (; i < timepoints.length; i++) {
        const start = parseFloat(timepoints[i].startTime.replace('s', ''));
        const nextStart = timepoints[i + 1] ? parseFloat(timepoints[i + 1].startTime.replace('s', '')) : Infinity;
        if (currentTime >= start && currentTime < nextStart) break;
      }

      wordSpans.forEach(span => span.classList.remove('spoken', 'current'));
      for (let j = 0; j < i; j++) wordSpans[j].classList.add('spoken');
      if (i < wordSpans.length) wordSpans[i].classList.add('current');
    };

    audio.onended = () => {
      isSpeaking = false;
      currentAudio = null;
      playButton.classList.remove('playing');
      playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
      const spans = document.querySelectorAll('#textDisplay .word');
      spans.forEach(span => span.classList.remove('spoken', 'current'));
    };

    audio.play();

  } catch (err) {
    console.error('Google TTS error:', err);
    isSpeaking = false;
    playButton.classList.remove('playing');
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
  }
}

function highlightTextByWords(text) {
  const words = text.trim().split(/\s+/);
  const html = words.map(word => `<span class="word">${word}</span>`).join(' ');
  textDisplay.innerHTML = html;
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

playButton.addEventListener('click', () => {
  speakWithGoogleTTS(textDisplay.innerText.trim());
});

clearButton.addEventListener('click', clearText);
micButton.addEventListener('click', toggleRecording);

document.addEventListener('keydown', e => {
  const isTyping = document.activeElement === textDisplay;
  if (!isTyping && e.key === ' ') {
    e.preventDefault();
    speakWithGoogleTTS(textDisplay.innerText.trim());
  }
  if (!isTyping && e.key.toLowerCase() === 'r') toggleRecording();
  if (!isTyping && e.key.toLowerCase() === 'p') speakWithGoogleTTS(textDisplay.innerText.trim());
  if (!isTyping && e.key.toLowerCase() === 'c') clearText();
  if (e.key === 'Escape') clearText();
  if (!isTyping && e.shiftKey && e.key === '?') {
    announce('Tastenkombinationen: R für Aufnahme, P für Wiedergabe, C für Löschen, Escape zum Leeren des Texts, Leertaste zum Abspielen');
  }
});
