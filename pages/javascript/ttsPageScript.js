// ttsPageScript.js

const textArea = document.getElementById('textInput');
const playButton = document.getElementById('playButton');
const backButton = document.getElementById('backButton');
const clearButton = document.getElementById('clearButton');

let voices = [];
let isSpeaking = false;

// Load voices when available
function waitForVoices() {
  return new Promise((resolve) => {
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

// Detect whether the text is Persian or English
function detectLanguage(text) {
  const isPersian = /[\u0600-\u06FF]/.test(text);
  return isPersian ? 'fa-IR' : 'en-US';
}

// Speak user text or fallback
function speakWithFallback(text, lang) {
  isSpeaking = true;
  updatePlayButtonState();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  // When speech ends
  utterance.onend = () => {
    isSpeaking = false;
    updatePlayButtonState();
  };

  // If speech is interrupted
  utterance.onerror = () => {
    isSpeaking = false;
    updatePlayButtonState();
  };

  const voice = voices.find(v => v.lang === lang);
  if (voice) {
    utterance.voice = voice;
    speechSynthesis.speak(utterance);
  } else {
    speakFallbackMessages();
  }
}

// Update play button state
function updatePlayButtonState() {
  if (isSpeaking) {
    playButton.textContent = "⏸ Pause";
    playButton.setAttribute('aria-label', 'Pause speech');
  } else {
    playButton.innerHTML = "<span aria-hidden='true'>▶</span> Play Text";
    playButton.setAttribute('aria-label', 'Play text');
  }
}

// Announce page on load
function announcePageLoad() {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.classList.add('sr-only');
  announcement.textContent = 'Text to Speech page loaded. Type your text and press Play to hear it.';
  document.body.appendChild(announcement);

  // Remove announcement after it's been read
  setTimeout(() => {
    announcement.textContent = '';
  }, 3000);
}

// Clear text function
function clearText() {
  textArea.value = '';
  textArea.focus();

  // Announce for screen readers
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.classList.add('sr-only');
  announcement.textContent = 'Text cleared';
  document.body.appendChild(announcement);

  // Remove announcement after it's been read
  setTimeout(() => {
    announcement.textContent = '';
  }, 1000);
}

// Unlock voices silently on first user click (Chrome/macOS workaround)
document.addEventListener('click', () => {
  const silentUtter = new SpeechSynthesisUtterance(" ");
  silentUtter.volume = 0;
  speechSynthesis.speak(silentUtter);
  voices = speechSynthesis.getVoices(); // reload voices just in case
}, { once: true });

// --- Removed hover descriptions per request ---

// Once voices are ready, wire up all speaking behavior
waitForVoices().then(() => {
  // Announce page load
  announcePageLoad();

  // Click: Play button
  playButton.addEventListener('click', () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      isSpeaking = false;
      updatePlayButtonState();
      return;
    }

    const text = textArea.value.trim();
    if (text === "") {
      // No hover fallback here either
      return;
    }

    const detectedLang = detectLanguage(text);
    speakWithFallback(text, detectedLang);
  });

  // Click: Clear button
  clearButton.addEventListener('click', clearText);
});

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Space to play/pause when not in textarea
  if (event.key === ' ' && document.activeElement !== textArea) {
    event.preventDefault();
    playButton.click();
  }

  // Escape to clear text
  if (event.key === 'Escape') {
    clearText();
  }

  // Allow key hold to repeat letters into textArea when not focused
  if (document.activeElement !== textArea && event.key.length === 1) {
    textArea.value += event.key;
    textArea.selectionStart = textArea.selectionEnd = textArea.value.length;
  }
});

// Focus on textarea when page loads
window.addEventListener('DOMContentLoaded', () => {
  textArea.focus();
});
