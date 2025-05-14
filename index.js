// combinedScript.js

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

function waitForVoices() {
  return new Promise(resolve => {
    const check = () => {
      voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

function detectLanguage(text) {
  return /[\u0600-\u06FF]/.test(text) ? 'fa-IR' : 'en-US';
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
  const voice = voices.find(v => v.lang === lang);
  if (voice) utterance.voice = voice;

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

function clearText() {
  textArea.value = '';
  textArea.focus();
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
        audioStream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer YOUR_OPENAI_API_KEY`
          },
          body: formData
        });

        const data = await response.json();
        if (data.text) textArea.value = data.text;
      };

      mediaRecorder.start();
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

waitForVoices().then(() => {
  console.log('Voices loaded');
});

document.addEventListener('DOMContentLoaded', () => {
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
});
