const uiTranslations = {
  'de-DE': {
    play: 'Text abspielen',
    restart: 'Neustart',
    clear: 'Klar',
    mic: '🎤',
    settings: '⚙️',
    info: 'ℹ️',
    shortcutsHeading: 'Tastenkombinationen',
    shortcuts: [
      '<strong>R</strong>: Aufnahme starten/stoppen',
      '<strong>P</strong>: Text vorlesen',
      '<strong>C</strong>: Text löschen',
      '<strong>Escape</strong>: Text löschen',
      '<strong>Leertaste</strong>: Text abspielen/pause',
      '<strong>Shift + ?</strong>: Tastenkombinationen vorlesen'
    ]
  },
  'en-US': {
    play: 'Play Text',
    restart: 'Restart',
    clear: 'Clear',
    mic: '🎤',
    settings: '⚙️',
    info: 'ℹ️',
    shortcutsHeading: 'Keyboard Shortcuts',
    shortcuts: [
      '<strong>R</strong>: Start/stop recording',
      '<strong>P</strong>: Play text',
      '<strong>C</strong>: Clear text',
      '<strong>Escape</strong>: Clear text',
      '<strong>Spacebar</strong>: Play/pause text',
      '<strong>Shift + ?</strong>: Read keyboard shortcuts aloud'
    ]
  },
  'fa-IR': {
    play: 'پخش متن',
    restart: 'شروع دوباره',
    clear: 'پاک کردن',
    mic: '🎤',
    settings: '⚙️',
    info: 'ℹ️',
    shortcutsHeading: 'میانبرهای صفحه‌کلید',
    shortcuts: [
      '<strong>R</strong>: شروع/توقف ضبط',
      '<strong>P</strong>: پخش متن',
      '<strong>C</strong>: پاک‌سازی متن',
      '<strong>Escape</strong>: پاک‌سازی متن',
      '<strong>Spacebar</strong>: پخش/توقف متن',
      '<strong>Shift + ?</strong>: خواندن میانبرهای صفحه‌کلید'
    ]
  }
};

// Variables to fetch local elements
const textDisplay = document.getElementById('textDisplay');
const playButton = document.getElementById('playButton');
const restartButton = document.getElementById('restartButton');
const micButton = document.getElementById('micButton');
const clearButton = document.getElementById('clearButton');

const settingsBtn = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const uiLanguageSelector = document.getElementById('uiLanguageSelector');
const transcriptionLanguageSelector = document.getElementById('transcriptionLanguageSelector');

const infoBtn = document.getElementById('infoButton');
const infoModal = document.getElementById('infoModal');
const closeInfo = document.getElementById('closeInfo');

let highlightFrameId = null;

// Variables and function to handle caching
let lastCachedText = '';
let lastCachedLanguageCode = '';
let lastCachedAudioBlob = null;
let lastCachedTimepoints = [];

function isAudioAlreadyCached(textToVerbalise) {
  return true ? (textToVerbalise === lastCachedText && lastCachedAudioBlob) : false;
}

// Variable to handle UI and transcription language
let currentWebsiteUserInterfaceLanguage = 'de-DE';
let currentTranscriptionLanguage = 'de-DE';

// Variables to handle transcription, TTS and text-highlighting functionality
let isCurrentlySpeaking = false;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let audioStream;
let audioContext;
let gainNode;
let destination;
let recordingStartTime = null;
let currentAudio = null;
let wordMap = {};
let repeatSlowerNextTime = false;

// Logic to handle user preferances --------------------------------------------
function adjustPlayButtonByPreferredLanguage(){
  if (currentWebsiteUserInterfaceLanguage == 'de-DE') {
    console.log("Adjusting interface to match German language...");
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Text abspielen";
  }
  else if (currentWebsiteUserInterfaceLanguage == 'en-US') {
    console.log("Adjusting interface to match English language...");
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
  }
  else {
    console.log("Adjusting interface to match Persian language...");
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> پخش متن";
  }
}

// Check what the default language is (and if it differs from German)
// @parameter Input: None
// @parameter Outut: None (Simply call updateInterfaceLanguage, and set currentWebsiteUserInterfaceLanguage value)
async function fetchPreferredLanguage(){
  try {
    const res = await fetch('/.netlify/functions/userLanguage');
    const { language } = await res.json();
    const selectedLanguage = document.getElementById('uiLanguageSelector');

    if (language && ['de-DE', 'en-US', 'fa-IR'].includes(language)) {
      selectedLanguage.value = language;

      updateInterfaceLanguage(language); // Apply UI labels throughout the website
      currentWebsiteUserInterfaceLanguage = language;
      console.log("🌐 Loaded stored language preference:", language);
    }
  } catch (err) {
    console.error("🔴 No stored preference or error loading it:", err);
    console.log("🌐 Defaulting to German...");
    selectedLanguage.value = 'de-DE';
    currentWebsiteUserInterfaceLanguage = 'de-DE';
  }
}

// @parameter Input: String (ISO-appropriate code to represent language e.g. en)
// @parameter Outut: None (Simply adjusts UI labels)
function updateInterfaceLanguage(langCode) {
  const appropriateLabels = uiTranslations[langCode] || uiTranslations['de-DE'];

  playButton.innerHTML = `<span aria-hidden="true">▶</span> ${appropriateLabels.play}`;
  restartButton.innerHTML = `<span aria-hidden="true">🔁</span> ${appropriateLabels.restart}`;
  clearButton.innerHTML = `<span aria-hidden="true">✕</span> ${appropriateLabels.clear}`;

  // Update the keyboard shortcuts according to language of the user
  const shortcutHeading = document.querySelector('.keyboardShortcuts h2');
  if (shortcutHeading && appropriateLabels.shortcutsHeading) {
    shortcutHeading.innerText = appropriateLabels.shortcutsHeading;
  }

  const shortcutList = document.querySelector('.keyboardShortcuts ul');
  if (shortcutList && appropriateLabels.shortcuts) {
    shortcutList.innerHTML = appropriateLabels.shortcuts.map(item => `<li>${item}</li>`).join('');
  }
}
// -----------------------------------------------------------------------------

// TTS capability for English and German ---------------------------------------
async function detectWhichLanguage(text) {
  try {
    console.log("🟨 Attempting to determine language...")
    const res = await fetch('/.netlify/functions/detectLang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const result = await res.json();
    const detectedLangCode = result.data.detections[0]?.language;

    console.log('🌐 Language is detected as...', detectedLangCode);

    switch (detectedLangCode) {
      case 'fa': return 'fa-IR';
      case 'de': return 'de-DE';
      default: return 'en-US';
    }

  } catch (err) {
    console.error("🔴 Failed to liase with Detect Language API, error: ", error)
    console.warn('🔍 Detect Language API failed, falling back to regex-based detection');

    // Fallback via regex logic...
    if (/[؀-ۿ]/.test(text)) return 'fa-IR'; // Regex detected as Farsi/Persian
    if (/[À-ɏ]/.test(text) || /\b(und|ist|nicht|das|ein)\b/i.test(text)) return 'de-DE'; // Regex detected as German
    return 'en-US'; // Default Regex fallback - rely and return English language
  }
}

function convertTextToSSML(text) {
  const words = text.trim().split(/\s+/);
  const markedWords = words.map(word => {
    const clean = word.replace(/[“”‘’"',.?!:;]/g, '').toLowerCase();
    return `<mark name="${clean}"/> ${word}`;
  });
  return `<speak xmlns="http://www.w3.org/2001/10/synthesis" version="1.0">${markedWords.join(' ')}</speak>`;
}

function interruptAudioPlayback() {
  if (isCurrentlySpeaking && currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
    isCurrentlySpeaking = false;
    playButton.classList.remove('playing');
    restartButton.disabled = true;

    adjustPlayButtonByPreferredLanguage();

    const spans = document.querySelectorAll('#textDisplay .word');
    spans.forEach(span => span.classList.remove('spoken', 'current'));
  }
}

async function verbaliseTextViaTTS(textToVerbalise) {
  if (isCurrentlySpeaking && currentAudio) {
    if (!currentAudio.paused) {
      // 🔴 Pause audio and highlighting
      restartButton.disabled = false;
      currentAudio.pause();
      playButton.innerHTML = currentWebsiteUserInterfaceLanguage === 'fa-IR' ? "▶ پخش متن" :
                             currentWebsiteUserInterfaceLanguage === 'de-DE' ? "▶ Text abspielen" : "▶ Play Text";
      playButton.classList.remove('playing');
      if (highlightFrameId) {
        cancelAnimationFrame(highlightFrameId);
        highlightFrameId = null;
      }
      return;
    } else {
      // 🟢 Resume audio and highlighting
      currentAudio.play();
      restartButton.disabled = true;
      playButton.innerHTML = currentWebsiteUserInterfaceLanguage === 'fa-IR' ? "⏸ مکث" :
                             currentWebsiteUserInterfaceLanguage === 'de-DE' ? "⏸ Pause" : "⏸ Pause";
      playButton.classList.add('playing');
      return;
    }
  }

  try {
    isCurrentlySpeaking = true;
    playButton.classList.add('playing');

    if (currentWebsiteUserInterfaceLanguage == 'de-DE' || currentWebsiteUserInterfaceLanguage == 'en-US') {
      playButton.innerHTML = "⏸ Pause";
    }
    else {
      playButton.innerHTML = "⏸ مکث";
    }

    const languageCode = await detectWhichLanguage(textToVerbalise);

    if (languageCode !== 'fa-IR') {
      const payload = {
        text: convertTextToSSML(textToVerbalise),
        languageCode,
        isSSML: true
      };

      console.log("Using Google's TTS as language is English or German");

      utiliseGoogleTTS(textToVerbalise, payload)
    }
    else {
      const payload = {
        text: textToVerbalise,
        languageCode,
        isSSML: false
      };

      console.log("Using OpenAI's TTS as language is Farsi");
      utiliseOpenAiTTS(textToVerbalise, payload)
    }
  }
  catch (err) {
    console.error("🔴 Failed to execute TTS: ", err);

    isCurrentlySpeaking = false;
    currentAudio = null;
    playButton.classList.remove('playing');

    adjustPlayButtonByPreferredLanguage();
  }

}

function highlightTextByWordsRightToLeft(text) {
  textDisplay.setAttribute('dir', 'rtl');
  textDisplay.style.textAlign = 'right';

  const words = text.trim().split(/\s+/);
  wordMap = {};
  textDisplay.innerHTML = '';

  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.dataset.index = index;

    const clean = word.replace(/[“”‘’"',.?!:؛،]/g, '').toLowerCase();
    wordMap[clean + '-' + index] = index;

    span.textContent = word + ' ';
    textDisplay.appendChild(span);
  });
}

// Handles languages that read from right-to-left, in paticular Farsi / Persian
async function utiliseOpenAiTTS(textToVerbalise, payload) {
  try {
    let audioBlob;
    let timepoints;

    // Check if we have cached this audio already - if so, just re-play existing one
    if (isAudioAlreadyCached(textToVerbalise)) {
      console.log('📚 Re-playing cached copy...');
      audioBlob = lastCachedAudioBlob;
      timepoints = convertTimestampsBetweenSpeeds(lastCachedTimepoints);
    }
    else { // Otherwise fetch a new one
      const response = await fetch('/.netlify/functions/openaiFarsiTTS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.audioContent) {
        console.error('🔴 OpenAI TTS error response:', result);
        throw new Error(result.error || 'Invalid audio response from OpenAI TTS');
      }

      timepoints = adjustInitialTimepointsToPlaybackSpeed(result.timepoints, true);
      audioBlob = new Blob([Uint8Array.from(atob(result.audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    highlightTextByWordsRightToLeft(textToVerbalise);
    const wordSpans = document.querySelectorAll('#textDisplay .word');
    const words = textToVerbalise.trim().split(/\s+/).map(word => word.replace(/[“”‘’"',.?!:;]/g, '').toLowerCase());

    function trackAudioProgress() {
      if (!audio || audio.paused || audio.ended) return;

      const playbackSpeedEqualiser = repeatSlowerNextTime ? 0.5 : 0.8;
      const currentTime = (audio.currentTime / playbackSpeedEqualiser);

      // Find the currently spoken word based on timestamp
      const activeIndex = timepoints.findIndex(tp => {
        const start = parseFloat(tp.start);
        const end = parseFloat(tp.end);
        return currentTime >= start && currentTime < end;
      });

      console.log(`🎧 time=${currentTime.toFixed(2)}s → activeIndex=${activeIndex}`);

      if (activeIndex !== -1 && wordSpans[activeIndex]) {
        wordSpans.forEach(span => span.classList.remove('spoken', 'current'));

        // Mark all previous words as spoken
        for (let j = 0; j < activeIndex; j++) {
          wordSpans[j]?.classList.add('spoken');
        }

        // Highlight the current word
        const currentSpan = wordSpans[activeIndex];
        currentSpan.classList.add('current');
        currentSpan.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline:'center'
        });
      }

      highlightFrameId = requestAnimationFrame(trackAudioProgress);
    }

    audio.onended = () => {
      isCurrentlySpeaking = false;
      currentAudio = null;
      restartButton.disabled = true;
      playButton.classList.remove('playing');

      adjustPlayButtonByPreferredLanguage();

      if (repeatSlowerNextTime) {
        repeatSlowerNextTime = false;
      }
      else {
        repeatSlowerNextTime = true;
      }
    };

    audio.onplay = () => {
      console.log("▶️ Farsi audio is starting or resuming — scheduling highlights...");
      if (timepoints.length > 0) {
        highlightFrameId = requestAnimationFrame(trackAudioProgress);
      }
    };

    if (repeatSlowerNextTime) {
      console.log("Farsi audio is set to play at 0.5 speed...");
      audio.playbackRate = 0.5;
    }
    else {
      console.log("Farsi audio is set to play at 0.8 speed...");
      audio.playbackRate = 0.8;
    }

    lastCachedText = textToVerbalise;
    lastCachedLanguageCode = payload.languageCode;
    lastCachedAudioBlob = audioBlob;
    lastCachedTimepoints = timepoints;

    audio.play();
  }
  catch (err) {
    console.error('🔴 Google TTS error:', err);
    isCurrentlySpeaking = false;
    playButton.classList.remove('playing');

    adjustPlayButtonByPreferredLanguage();
  }
}

function highlightTextByWordsLeftToRight(text) {
  textDisplay.setAttribute('dir', 'ltr');
  textDisplay.style.textAlign = 'left';

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

function adjustInitialTimepointsToPlaybackSpeed(timepoints, isLeftToRightAudio) {
  if (timepoints == undefined || timepoints.length == 0) {
    return [];
  }

  console.log("Attempting to alter timepoints...");
  console.log(timepoints);

  const playbackSpeedEqualiser = repeatSlowerNextTime ? 0.5 : 0.8;

  if (isLeftToRightAudio) {
    return timepoints.map(timepointElement => {
      return {
        start: (parseFloat(timepointElement.start) / playbackSpeedEqualiser),
        end: (parseFloat(timepointElement.end) / playbackSpeedEqualiser)
      }
    });
  }
  else {
    return timepoints.map(timepointElement => {
      return {
        timeSeconds: (parseFloat(timepointElement.timeSeconds) / playbackSpeedEqualiser),
        markName: timepointElement.markName
      }
    });
  }
}

function convertTimestampsBetweenSpeeds(timestamps) {
  let fromSpeed;
  let toSpeed;

  if (repeatSlowerNextTime) {
    fromSpeed = 0.8;
    toSpeed = 0.5;
  }
  else {
    fromSpeed = 0.5;
    toSpeed = 0.8;
  }

  const factor = fromSpeed / toSpeed;

  return timestamps.map(ts => {
    if (typeof ts === 'number') {
      return ts * factor;
    }

    const adjusted = { ...ts };

    if ('start' in ts) adjusted.start = parseFloat(ts.start) * factor;
    if ('end' in ts) adjusted.end = parseFloat(ts.end) * factor;
    if ('timeSeconds' in ts) adjusted.timeSeconds = ts.timeSeconds * factor;

    return adjusted;
  });
}


// Handles languages that read from left-to-right, such as English or German
// For Farsi / Persian, we'll need to refer to OpenAI's TTS model as the language...
// ...isn't currently supported fully in Google's TTS
async function utiliseGoogleTTS(textToVerbalise, payload) {
  try {
    let audioBlob;
    let timepoints;

    // Check if we have cached this audio already - if so, just re-play existing one
    if (isAudioAlreadyCached(textToVerbalise)) {
      console.log('📚 Re-playing cached copy...');
      audioBlob = lastCachedAudioBlob;
      timepoints = convertTimestampsBetweenSpeeds(lastCachedTimepoints);
    }
    else { // Otherwise fetch a new one
      const response = await fetch('/.netlify/functions/googleTTS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.audioContent) {
        console.error('🔴 Google TTS error response:', result);
        throw new Error(result.error || 'Invalid audio response from Google TTS');
      }

      timepoints = adjustInitialTimepointsToPlaybackSpeed(result.timepoints, false);
      audioBlob = new Blob([Uint8Array.from(atob(result.audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    highlightTextByWordsLeftToRight(textToVerbalise);
    const wordSpans = document.querySelectorAll('#textDisplay .word');
    const words = textToVerbalise.trim().split(/\s+/).map(word => word.replace(/[“”‘’"',.?!:;]/g, '').toLowerCase());

    function trackAudioProgress() {
      if (!audio || audio.paused || audio.ended) return;

      const playbackSpeedEqualiser = repeatSlowerNextTime ? 0.5 : 0.8;
      const currentTime = audio.currentTime / playbackSpeedEqualiser;

      for (let i = 0; i < timepoints.length; i++) {

        const start = parseFloat(timepoints[i].timeSeconds);
        const nextStart = timepoints[i + 1] ? parseFloat(timepoints[i + 1].timeSeconds): Infinity;

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

      highlightFrameId = requestAnimationFrame(trackAudioProgress);
    }

    audio.onended = () => {
      isCurrentlySpeaking = false;
      currentAudio = null;
      restartButton.disabled = true;
      playButton.classList.remove('playing');

      adjustPlayButtonByPreferredLanguage();

      if (repeatSlowerNextTime) {
        repeatSlowerNextTime = false;
      }
      else {
        repeatSlowerNextTime = true;
      }
    };

    audio.onplay = () => {
      console.log("▶️ English / German audio is starting or resuming — scheduling highlights...");

      if (timepoints.length > 0) {
        highlightFrameId = requestAnimationFrame(trackAudioProgress);
      }
    };

    if (repeatSlowerNextTime) {
      console.log("▶️ English / German audio is set to play at 0.5 speed...");
      audio.playbackRate = 0.5;
    }
    else {
      console.log("▶️ English / German audio is set to play at 0.8 speed...");
      audio.playbackRate = 0.8;
    }

    lastCachedText = textToVerbalise;
    lastCachedLanguageCode = payload.languageCode;
    lastCachedAudioBlob = audioBlob;
    lastCachedTimepoints = timepoints;

    audio.play();

  } catch (err) {
    console.error('🔴 Google TTS error:', err);
    isCurrentlySpeaking = false;
    playButton.classList.remove('playing');

    adjustPlayButtonByPreferredLanguage();
  }
}
// -----------------------------------------------------------------------------

// Speech to text functionality ------------------------------------------------
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
          function arrayBufferToBase64(buffer) {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
          }

          const arrayBuffer = await blob.arrayBuffer();
          const base64Audio = arrayBufferToBase64(arrayBuffer);

          const response = await fetch('/.netlify/functions/transcribeAudio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              languageCode: currentTranscriptionLanguage
            })
          });

          const data = await response.json();
          if (data.text) {
            textDisplay.innerText += (textDisplay.innerText.trim() ? ' ' : '') + data.text;
            console.log("📗 Transcription was successful")
          } else {
            console.error("🔴 There was a failure in accessing the transcription")
          }
        } catch (err) {
          console.error('🔴 API call failed:', error);
        }
      };

      mediaRecorder.start();
      recordingStartTime = Date.now();
      isRecording = true;
      micButton.classList.add('recording');

    } catch (err) {
      console.error('🔴 Microphone access error:', err);
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    micButton.classList.remove('recording');
  }
}
// -----------------------------------------------------------------------------

// Button-based functionality: Clear (aka Klar ) -------------------------------
function clearText() {
  interruptAudioPlayback();
  repeatSlowerNextTime = false;
  textDisplay.innerText = '';
  restartButton.disabled = true;
  textDisplay.focus();
}
// -----------------------------------------------------------------------------

// Event listeners for the UI --------------------------------------------------
playButton.addEventListener('click', () => {
  const textToVerbalise = textDisplay.innerText.trim();
  verbaliseTextViaTTS(textToVerbalise);
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
    const textToVerbalise = textDisplay.innerText.trim();
    verbaliseTextViaTTS(textToVerbalise);
  }
  if (!isTyping && e.key.toLowerCase() === 'r') {
    toggleRecording();
  }
  if (!isTyping && e.key.toLowerCase() === 'p') {
    const textToVerbalise = textDisplay.innerText.trim();
    verbaliseTextViaTTS(textToVerbalise);
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
    // TODO announce('Tastenkombinationen: R für Aufnahme, P für Wiedergabe, C für Löschen, Escape zum Leeren des Texts, Leertaste zum Abspielen');
  }
});

function blobToBase64(blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

function shouldShowCameraButton() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 400;
  return isTouchDevice && isSmallScreen;
}

document.addEventListener('DOMContentLoaded', async () => {
  const cameraBtn = document.getElementById('cameraButton');
  const FORCE_SHOW_CAMERA = false; // Force button to be visible for local development
  // const FORCE_SHOW_CAMERA = (window.location.hostname === 'localhost'); // Force button to be visible for local development


  if ((FORCE_SHOW_CAMERA || shouldShowCameraButton()) && navigator.mediaDevices?.getUserMedia) {
    console.log('✅ Showing camera button...');
    cameraBtn.style.display = 'flex';
  } else {
    console.log('⛔ Camera button not shown: not mobile or no getUserMedia');
  }

  await fetchPreferredLanguage();
  const selectedLang = document.getElementById('uiLanguageSelector').value;
  updateInterfaceLanguage(selectedLang);

  textDisplay.focus();
});

restartButton.addEventListener('click', () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    playButton.classList.add('playing');
    isCurrentlySpeaking = true;
    currentAudio.play();

    playButton.innerHTML = currentWebsiteUserInterfaceLanguage === 'fa-IR' ? "⏸ مکث" :
                           currentWebsiteUserInterfaceLanguage === 'de-DE' ? "⏸ Pause" : "⏸ Pause";

    if (highlightFrameId) {
      cancelAnimationFrame(highlightFrameId);
      highlightFrameId = null;
    }
  }
});


document.getElementById('cameraButton').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    track.stop(); // Stop camera
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));

    const base64Image = await blobToBase64(blob);

    const response = await fetch('/.netlify/functions/describeImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64Image })
    });

    const { descriptionText } = await response.json();
    textDisplay.innerText = descriptionText;
    verbaliseTextViaTTS(descriptionText);

  } catch (err) {
    console.error('🔴 Camera capture failed:', err);
  }
});

function showModal(modal) {
  modal.classList.remove('hide');
  modal.classList.add('show');
}

function hideModal(modal) {
  modal.classList.remove('show');
  modal.classList.add('hide');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300); // 300 is set in order to match the animation duration
}

infoBtn.addEventListener('click', () => {
  infoModal.style.display = 'flex';
  showModal(infoModal);
});

closeInfo.addEventListener('click', () => {
  hideModal(infoModal);
});

infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    hideModal(infoModal);
  }
});

uiLanguageSelector.addEventListener('change', async (e) => {
  const selectedLang = e.target.value;
  currentWebsiteUserInterfaceLanguage = selectedLang;
  updateInterfaceLanguage(selectedLang);

  if (selectedLang !== 'de-DE') {
    // Persist non-default preferences
    await fetch('/.netlify/functions/userLanguage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: selectedLang })
    });
  }
});

transcriptionLanguageSelector.addEventListener('change', async (e) => {
  const selectedLang = e.target.value;
  currentTranscriptionLanguage = selectedLang;

  // TODO - Remember user preferances
});

// Repeat the same for settingsModal
settingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'flex';
  showModal(settingsModal);
});

closeSettings.addEventListener('click', () => {
  hideModal(settingsModal);
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    hideModal(settingsModal);
  }
});


document.addEventListener("paste", function(e) {
    // Cancel the paste
    e.preventDefault();

    // Fetch text representation of whatever's in the clipboard
    var text = (e.originalEvent || e).clipboardData.getData('text/plain');

    // Then insert text manually
    document.execCommand("insertHTML", false, text);
});
// Event listeners for the UI --------------------------------------------------
