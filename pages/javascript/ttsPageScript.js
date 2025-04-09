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

// Speak a description (used for hover events)
function speakDescription(message, lang = 'en-US') {
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = lang;

  const voice = voices.find(v => v.lang === lang);
  if (voice) {
    utterance.voice = voice;
  }

  speechSynthesis.speak(utterance);
}

// Speak fallback message in Persian first, then English
function speakFallbackMessages() {
  const faMessage = "متاسفم، زبان انتخاب شده در این دستگاه پشتیبانی نمی‌شود.";
  const enMessage = "Sorry, the selected language is not supported on this device.";

  const faVoice = voices.find(v => v.lang === 'fa-IR');
  const enVoice = voices.find(v => v.lang === 'en-US');

  if (faVoice) {
    const utterFa = new SpeechSynthesisUtterance(faMessage);
    utterFa.voice = faVoice;
    utterFa.lang = 'fa-IR';
    speechSynthesis.speak(utterFa);

    utterFa.onend = () => {
      if (enVoice) {
        const utterEn = new SpeechSynthesisUtterance(enMessage);
        utterEn.voice = enVoice;
        utterEn.lang = 'en-US';
        speechSynthesis.speak(utterEn);
      }
    };
  } else if (enVoice) {
    const utterEn = new SpeechSynthesisUtterance(enMessage);
    utterEn.voice = enVoice;
    utterEn.lang = 'en-US';
    speechSynthesis.speak(utterEn);
  }
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

// Once voices are ready, wire up all speaking behavior
waitForVoices().then(() => {
  // Announce page load
  announcePageLoad();

  // Hover: Back button
  backButton.addEventListener('mouseenter', () => {
    speakDescription("Back to home page button. Press to return to the main menu.");
  });

  // Hover: Play button
  playButton.addEventListener('mouseenter', () => {
    const text = textArea.value;
    const isPersian = /[\u0600-\u06FF]/.test(text);
    const message = isPersian
      ? "این دکمه برای پخش متن است."
      : "Play button. Press to hear the text read aloud.";
    const lang = isPersian ? "fa-IR" : "en-US";
    speakDescription(message, lang);
  });

  // Hover: Clear button
  clearButton.addEventListener('mouseenter', () => {
    speakDescription("Clear button. Press to clear all text.");
  });

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
      speakDescription("No text to read. Please type some text first.");
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

    // Move cursor to end of textarea
    textArea.selectionStart = textArea.selectionEnd = textArea.value.length;
  }
});

// Focus on textarea when page loads
window.addEventListener('DOMContentLoaded', () => {
  textArea.focus();
});
