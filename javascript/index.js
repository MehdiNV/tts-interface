const textDisplay = document.getElementById('textDisplay');
const playButton = document.getElementById('playButton');
const micButton = document.getElementById('micButton');
const clearButton = document.getElementById('clearButton');

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

// TTS capability for English and German ---------------------------------------
async function detectWhichLanguage(text) {
  try {
    const res = await fetch('/.netlify/functions/detectLang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const result = await res.json();
    const detectedLangCode = result.data.detections[0]?.language;

    console.warn('⚠️ Language is detected as...', detectedLangCode);

    switch (detectedLangCode) {
      case 'fa': return 'fa-IR';
      case 'de': return 'de-DE';
      default: return 'en-US';
    }

  } catch (error) {
    console.warn('⚠️ Detect Language API failed, falling back to regex-based detection.', error);

    // Fallback using your original regex logic
    if (/[؀-ۿ]/.test(text)) return 'fa-IR'; // Farsi/Persian
    if (/[À-ɏ]/.test(text) || /\b(und|ist|nicht|das|ein)\b/i.test(text)) return 'de-DE'; // German
    return 'en-US'; // Default fallback
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
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
    const spans = document.querySelectorAll('#textDisplay .word');
    spans.forEach(span => span.classList.remove('spoken', 'current'));
  }
}

async function verbaliseTextViaTTS(textToVerbalise) {
  if (isCurrentlySpeaking) {
    interruptAudioPlayback();
    return;
  }

  const languageCode = await detectWhichLanguage(textToVerbalise);

  isCurrentlySpeaking = true;
  playButton.classList.add('playing');
  playButton.innerHTML = "⏸ Pause";

  if (languageCode !== 'fa-IR') {
    const payload = {
      text: convertTextToSSML(textToVerbalise),
      languageCode,
      isSSML: true
    };

    utiliseGoogleTTS(textToVerbalise, payload)
  }
  else {
    const payload = {
      text: textToVerbalise,
      languageCode,
      isSSML: false
    };

    utiliseOpenAiTTS(textToVerbalise, payload)
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
    const response = await fetch('/.netlify/functions/openaiFarsiTTS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.audioContent) {
      console.error('OpenAI TTS error response:', result);
      throw new Error(result.error || 'Invalid audio response from OpenAI TTS');
    }

    const audioContent = result.audioContent;
    const timepoints = result.timepoints || [];

    const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    highlightTextByWordsRightToLeft(textToVerbalise);
    const wordSpans = document.querySelectorAll('#textDisplay .word');
    const words = textToVerbalise.trim().split(/\s+/).map(word => word.replace(/[“”‘’"',.?!:;]/g, '').toLowerCase());

    function trackAudioProgress() {
      if (!audio || audio.paused || audio.ended) return;

      const currentTime = audio.currentTime;

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

      requestAnimationFrame(trackAudioProgress);
    }

    audio.onended = () => {
      isCurrentlySpeaking = false;
      currentAudio = null;
      playButton.classList.remove('playing');
      playButton.innerHTML = "<span aria-hidden='true'>▶</span> Text abspielen";
      const spans = document.querySelectorAll('#textDisplay .word');
      spans.forEach(span => span.classList.remove('spoken', 'current'));
    };

    audio.onplay = () => {
      if (timepoints.length > 0) requestAnimationFrame(trackAudioProgress);
    };

    audio.play();
  }
  catch (err) {
    console.error('Google TTS error:', err);
    isCurrentlySpeaking = false;
    playButton.classList.remove('playing');
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Text abspielen";
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

// Handles languages that read from left-to-right, such as English or German
// For Farsi / Persian, we'll need to refer to OpenAI's TTS model as the language...
// ...isn't currently supported fully in Google's TTS
async function utiliseGoogleTTS(textToVerbalise, payload) {
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

    highlightTextByWordsLeftToRight(textToVerbalise);
    const wordSpans = document.querySelectorAll('#textDisplay .word');
    const words = textToVerbalise.trim().split(/\s+/).map(word => word.replace(/[“”‘’"',.?!:;]/g, '').toLowerCase());

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
      isCurrentlySpeaking = false;
      currentAudio = null;
      playButton.classList.remove('playing');
      playButton.innerHTML = "<span aria-hidden='true'>▶</span> Text abspielen";
      const spans = document.querySelectorAll('#textDisplay .word');
      spans.forEach(span => span.classList.remove('spoken', 'current'));
    };

    audio.onplay = () => {
      if (timepoints.length > 0) requestAnimationFrame(trackAudioProgress);
    };

    audio.play();

  } catch (err) {
    console.error('Google TTS error:', err);
    isCurrentlySpeaking = false;
    playButton.classList.remove('playing');
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Text abspielen";
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
            body: JSON.stringify({ audioBase64: base64Audio })
          });

          const data = await response.json();
          if (data.text) {
            textDisplay.innerText = data.text;
            console.log("Transcription was successful")
          } else {
            console.log("There was a failure in accessing the transcription")
          }
        } catch (error) {
          console.error('API call failed:', error);
        }
      };

      mediaRecorder.start();
      recordingStartTime = Date.now();
      isRecording = true;
      micButton.classList.add('recording');

    } catch (err) {
      console.error('Microphone access error:', err);
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
  textDisplay.innerText = '';
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

document.addEventListener('DOMContentLoaded', async () => {
  textDisplay.focus();
});
// Event listeners for the UI --------------------------------------------------
