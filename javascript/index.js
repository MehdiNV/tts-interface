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
let wordSpans = [], words = [], timepoints = [];

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
  const wordArray = text.trim().split(/\s+/);
  wordMap = {};
  textDisplay.innerHTML = '';

  const isRTL = /[؀-ۿ]/.test(text);
  textDisplay.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  textDisplay.style.textAlign = isRTL ? 'right' : 'left';

  wordArray.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.dataset.index = index;

    const clean = word.replace(/[“”‘’"',.?!:؛،]/g, '').toLowerCase();
    wordMap[`${clean}-${index}`] = index;

    span.textContent = word + ' ';
    textDisplay.appendChild(span);
  });

  wordSpans = document.querySelectorAll('#textDisplay .word');
  words = wordArray.map(word => word.replace(/[“”‘’"',.?!:؛،]/g, '').toLowerCase());
}

function trackAudioProgress() {
  if (!currentAudio || currentAudio.paused || currentAudio.ended) return;

  const currentTime = currentAudio.currentTime;
  const isRTL = textDisplay.getAttribute('dir') === 'rtl';
  let activeIndex = -1;

  if (timepoints.length && 'start' in timepoints[0] && 'end' in timepoints[0]) {
    activeIndex = timepoints.findIndex(tp =>
      currentTime >= parseFloat(tp.start) &&
      currentTime < parseFloat(tp.end)
    );
  } else if (timepoints.length && 'timeSeconds' in timepoints[0]) {
    for (let i = 0; i < timepoints.length; i++) {
      const thisTime = parseFloat(timepoints[i].timeSeconds);
      const nextTime = timepoints[i + 1] ? parseFloat(timepoints[i + 1].timeSeconds) : Infinity;
      if (currentTime >= thisTime && currentTime < nextTime) {
        activeIndex = i;
        break;
      }
    }
  }

  if (activeIndex !== -1 && wordSpans[activeIndex]) {
    wordSpans.forEach(span => span.classList.remove('spoken', 'current'));
    for (let j = 0; j < activeIndex; j++) wordSpans[j]?.classList.add('spoken');

    const currentSpan = wordSpans[activeIndex];
    currentSpan.classList.add('current');
    currentSpan.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: isRTL ? 'center' : 'nearest'
    });
  }

  requestAnimationFrame(trackAudioProgress);
}

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

  const endpoint = languageCode === 'fa-IR'
    ? '/.netlify/functions/openaiFarsiTTS'
    : '/.netlify/functions/googleTTS';

  isSpeaking = true;
  playButton.classList.add('playing');
  playButton.innerHTML = "⏸ Pause";

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.audioContent) {
      console.error('TTS error response:', result);
      throw new Error(result.error || 'Invalid audio response');
    }

    const audioContent = result.audioContent;
    timepoints = result.timepoints || [];

    // Adjust Google TTS timestamps back slightly to compensate for delayed <mark>
    const G_TTS_OFFSET = 0.3;
    if (timepoints.length && 'timeSeconds' in timepoints[0]) {
      timepoints = timepoints.map(tp => ({
        ...tp,
        timeSeconds: Math.max(0, parseFloat(tp.timeSeconds) - G_TTS_OFFSET).toFixed(3)
      }));
    }

    console.log('🧩 Timepoints returned (adjusted):', timepoints);

    const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    highlightTextByWords(originalText);

    audio.onended = () => {
      isSpeaking = false;
      currentAudio = null;
      playButton.classList.remove('playing');
      playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
      document.querySelectorAll('#textDisplay .word').forEach(span =>
        span.classList.remove('spoken', 'current')
      );
    };

    audio.onplay = () => {
      if (timepoints.length > 0) requestAnimationFrame(trackAudioProgress);
    };

    audio.play();

  } catch (err) {
    console.error('TTS error:', err);
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

micButton.addEventListener('click', toggleRecording); // unchanged from earlier


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
