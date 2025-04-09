const textArea = document.getElementById('textInput');
const playButton = document.getElementById('playButton');
const submitButton = document.getElementById('submitButton');
const backButton = document.getElementById('backButton');

let voices = [];

// Load system voices
function loadVoices() {
  voices = speechSynthesis.getVoices();
}
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

// Language detection: returns 'fa-IR' for Persian, 'en-US' for everything else
function detectLanguage(text) {
  const isPersian = /[\u0600-\u06FF]/.test(text);
  return isPersian ? 'fa-IR' : 'en-US';
}

// Speak a message using a specific language (optional voice override)
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

// Speak fallback message in Persian (if available) and then English
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
  } else {
    if (enVoice) {
      const utterEn = new SpeechSynthesisUtterance(enMessage);
      utterEn.voice = enVoice;
      utterEn.lang = 'en-US';
      speechSynthesis.speak(utterEn);
    }
  }
}

// Speak user-entered text or fallback if language not supported
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

// Play button click — speak entered text
playButton.addEventListener('click', () => {
  const text = textArea.value.trim();
  if (text === "") return;

  const detectedLang = detectLanguage(text);
  speakWithFallback(text, detectedLang);
});

// Submit button hover — describe in EN/FA
submitButton.addEventListener('mouseenter', () => {
  const text = textArea.value;
  const isPersian = /[\u0600-\u06FF]/.test(text);
  const message = isPersian
    ? "این یک دکمه برای ارسال است."
    : "This is a button for submission.";
  const lang = isPersian ? "fa-IR" : "en-US";
  speakDescription(message, lang);
});

// Back button hover — describe
backButton.addEventListener('mouseenter', () => {
  speakDescription("This is a button to return to the home page.");
});

// Play button hover — describe in EN/FA
playButton.addEventListener('mouseenter', () => {
  const text = textArea.value;
  const isPersian = /[\u0600-\u06FF]/.test(text);
  const message = isPersian
    ? "این یک دکمه برای پخش متن است."
    : "This is a button to play the text.";
  const lang = isPersian ? "fa-IR" : "en-US";
  speakDescription(message, lang);
});

// Optional: allow keypress repetition outside textbox
document.addEventListener('keydown', (event) => {
  if (document.activeElement !== textArea && event.key.length === 1) {
    textArea.value += event.key;
  }
});
