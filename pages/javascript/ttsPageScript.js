const textArea = document.getElementById('textInput');
const playButton = document.getElementById('playButton');
const submitButton = document.getElementById('submitButton');
const backButton = document.getElementById('backButton');

let voices = [];

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
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  const voice = voices.find(v => v.lang === lang);
  if (voice) {
    utterance.voice = voice;
    speechSynthesis.speak(utterance);
  } else {
    speakFallbackMessages();
  }
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
  // Hover: Back button
  backButton.addEventListener('mouseenter', () => {
    speakDescription("This is a button to return to the home page.");
  });

  // Hover: Submit button
  submitButton.addEventListener('mouseenter', () => {
    const text = textArea.value;
    const isPersian = /[\u0600-\u06FF]/.test(text);
    const message = isPersian
      ? "این یک دکمه برای ارسال است."
      : "This is a button for submission.";
    const lang = isPersian ? "fa-IR" : "en-US";
    speakDescription(message, lang);
  });

  // Hover: Play button
  playButton.addEventListener('mouseenter', () => {
    const text = textArea.value;
    const isPersian = /[\u0600-\u06FF]/.test(text);
    const message = isPersian
      ? "این یک دکمه برای پخش متن است."
      : "This is a button to play the text.";
    const lang = isPersian ? "fa-IR" : "en-US";
    speakDescription(message, lang);
  });

  // Click: Play button
  playButton.addEventListener('click', () => {
    const text = textArea.value.trim();
    if (text === "") return;

    const detectedLang = detectLanguage(text);
    speakWithFallback(text, detectedLang);
  });
});

// Optional: Allow key hold to repeat letters into textArea
document.addEventListener('keydown', (event) => {
  if (document.activeElement !== textArea && event.key.length === 1) {
    textArea.value += event.key;
  }
});
