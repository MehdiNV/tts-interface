const uiTranslations = {
  'de-DE': {
    play: 'Text abspielen',
    pause: 'Pause',
    restart: 'Neustart',
    clear: 'Klar',
    mic: '🎤',
    transcriptionSelectorLabel: 'Transkriptionssprache',
    settings: '⚙️',
    settingsHeader: 'Einstellungen',
    settingsSelectorLabel: 'Bevorzugte Sprache für die Benutzeroberfläche',
    saveLabel: 'Speichern',
    closeLabel: 'Schließen',
    info: 'ℹ️',
    informationHeader: 'Information',
    informationText: "Barrierefreiheitstool mit Text-to-Speech- (TTS) und Speech-to-Text-Funktionen (STT). Ich habe dieses Tool für meinen Großvater Rasul entwickelt, um ihm das Leben zu erleichtern. Wenn es auch anderen hilft, dann: Je mehr, desto besser!",
    shortcutsHeading: 'Tastenkombinationen',
    shortcuts: [
      '<strong>R</strong>: Aufnahme starten/stoppen',
      '<strong>P</strong>: Text vorlesen',
      '<strong>C</strong>: Text löschen',
      '<strong>Escape</strong>: Text löschen',
      '<strong>Leertaste</strong>: Text abspielen/pause',
      '<strong>Shift + ?</strong>: Tastenkombinationen vorlesen'
    ],
    germanLanguageOptionLabel: "Deutsch",
    englishLanguageOptionLabel: "Englisch",
    persianLanguageOptionLabel: "Persisch",
  },
  'en-US': {
    play: 'Play Text',
    pause: 'Pause',
    restart: 'Restart',
    clear: 'Clear',
    mic: '🎤',
    transcriptionSelectorLabel: 'Transcription language',
    settings: '⚙️',
    settingsHeader: 'Settings',
    settingsSelectorLabel: 'Preferred language for the UI',
    saveLabel: 'Save',
    closeLabel: 'Close',
    info: 'ℹ️',
    informationHeader: 'Information',
    informationText: "Accessibility tool that provides text-to-speech (TTS) and speech-to-text (STT) capabilities. I created this tool for my grandfather, Rasul, to make his life easier; if this helps anyone else as well, then the more the merrier!",
    shortcutsHeading: 'Keyboard Shortcuts',
    shortcuts: [
      '<strong>R</strong>: Start/stop recording',
      '<strong>P</strong>: Play text',
      '<strong>C</strong>: Clear text',
      '<strong>Escape</strong>: Clear text',
      '<strong>Spacebar</strong>: Play/pause text',
      '<strong>Shift + ?</strong>: Read keyboard shortcuts aloud'
    ],
    germanLanguageOptionLabel: "German",
    englishLanguageOptionLabel: "English",
    persianLanguageOptionLabel: "Persian",
  },
  'fa-IR': {
    play: 'پخش متن',
    pause: 'مکث',
    restart: 'شروع دوباره',
    clear: 'پاک کردن',
    mic: '🎤',
    transcriptionSelectorLabel: 'زبان رونویسی',
    settings: '⚙️',
    settingsHeader: 'تنظیمات',
    settingsSelectorLabel: 'زبان برگزیده برای رابط کاربری',
    saveLabel: 'ذخیره کنید',
    closeLabel: 'بستن',
    info: 'ℹ️',
    informationHeader: 'اطلاعات',
    informationText: "ابزار دسترس‌پذیری که قابلیت‌های تبدیل متن به گفتار (TTS) و گفتار به نوشتار (STT) را فراهم می‌کند. من این ابزار را برای پدربزرگم، رسول، ایجاد کردم تا زندگی او را آسان‌تر کنم. اگر این به شخص دیگری نیز کمک کند، هر چه بیشتر بهتر است!",
    shortcutsHeading: 'میانبرهای صفحه‌کلید',
    shortcuts: [
      '<strong>R</strong>: شروع/توقف ضبط',
      '<strong>P</strong>: پخش متن',
      '<strong>C</strong>: پاک‌سازی متن',
      '<strong>Escape</strong>: پاک‌سازی متن',
      '<strong>Spacebar</strong>: پخش/توقف متن',
      '<strong>Shift + ?</strong>: خواندن میانبرهای صفحه‌کلید'
    ],
    germanLanguageOptionLabel: "آلمانی",
    englishLanguageOptionLabel: "انگلیسی",
    persianLanguageOptionLabel: "فارسی",
  }
};

function generateUUIDv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Variables to fetch local elements
const textDisplay = document.getElementById('textDisplay');
const playButton = document.getElementById('playButton');
const restartButton = document.getElementById('restartButton');
const micButton = document.getElementById('micButton');
const transcriptionLanguageSelectorLabel = document.getElementById('transcriptionLanguageSelectorLabel');
const transcriptionLanguageSelector = document.getElementById('transcriptionLanguageSelector');
const clearButton = document.getElementById('clearButton');

const settingsBtn = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const settingsModalHeader = document.getElementById('settingsModalHeader');
const closeSettingsButton = document.getElementById('closeSettings');
const uiLanguageSelector = document.getElementById('uiLanguageSelector');
const uiLanguageSelectionLabel = document.getElementById('uiLanguageSelectionLabel');

const infoBtn = document.getElementById('infoButton');
const infoModal = document.getElementById('infoModal');
const infoModalHeader = document.getElementById('infoModalHeader');
const infoModalText = document.getElementById('infoModalText');
const closeInfoButton = document.getElementById('closeInfo');

const germanLanguageOptionLabel = document.getElementById('germanLanguageOptionLabel');
const englishLanguageOptionLabel = document.getElementById('englishLanguageOptionLabel');
const persianLanguageOptionLabel = document.getElementById('persianLanguageOptionLabel');

const germanLanguageModalOptionLabel = document.getElementById('germanLanguageModalOptionLabel');
const englishLanguageModalOptionLabel = document.getElementById('englishLanguageModalOptionLabel');
const persianLanguageModalOptionLabel = document.getElementById('persianLanguageModalOptionLabel');

let highlightFrameId = null;

// Variables and function to handle caching
let lastCachedText = '';
let lastCachedLanguageCode = '';
let lastCachedAudioBlob = null;
let lastCachedTimepoints = [];

function isAudioAlreadyCached(textToVerbalise) {
  if (textToVerbalise === lastCachedText && lastCachedAudioBlob) {
    return true;
  }
  else {
    return false;
  }
}

// Variable and function to handle UI and transcription language
let currentWebsiteUserInterfaceLanguage = 'de-DE';
let currentTranscriptionLanguage = 'de-DE';

const saveSettingsButton = document.getElementById('saveSettings');
let initialUILang = 'de-DE';
let initialTxLang = 'de-DE';

function getLabel(key) {
  return uiTranslations[currentWebsiteUserInterfaceLanguage]?.[key] || uiTranslations['de-DE'][key];
}

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

// Variables to handle speed of audio playback
let repeatSlowerNextTime = false;
const speeds = { 'slow': 0.5, 'normal': 0.8 };
let currentSpeed = 'normal';

// Variables to handle dynamic playback (e.g. click word to jump to it audio-wise)
let activeWordSpans = [];

// Variables and logic to detect if user is on a mobile browser
window.mobileCheck = function () {
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))
    ) check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
};


// Logic to handle loading display
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
  disableInteractiveButtons(true);
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
  disableInteractiveButtons(false);
}

function disableInteractiveButtons(disable = true) {
  micButton.disabled = disable;
  playButton.disabled = disable;
  restartButton.disabled = disable;
  clearButton.disabled = disable;
  transcriptionLanguageSelector.disabled = disable;
}

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
    const { uiLanguage, transcriptionLanguage } = await res.json();

    if (uiLanguage && ['de-DE', 'en-US', 'fa-IR'].includes(uiLanguage)) {
      uiLanguageSelector.value = uiLanguage;
      initialUILang = uiLanguage;
      updateInterfaceLanguage(uiLanguage);
      currentWebsiteUserInterfaceLanguage = uiLanguage;
      console.log("🌐 Loaded stored UI language preference:", uiLanguage);
    }

    if (transcriptionLanguage && ['de-DE', 'en-US', 'fa-IR'].includes(transcriptionLanguage)) {
      transcriptionLanguageSelector.value = transcriptionLanguage;
      initialTxLang = transcriptionLanguage;
      currentTranscriptionLanguage = transcriptionLanguage;;
      console.log("🌐 Loaded stored transcription language preference:", transcriptionLanguage);
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
  transcriptionLanguageSelectorLabel.textContent = appropriateLabels.transcriptionSelectorLabel;

  // Update the keyboard shortcuts according to language of the user
  const shortcutHeading = document.querySelector('.keyboardShortcuts h2');
  if (shortcutHeading && appropriateLabels.shortcutsHeading) {
    shortcutHeading.innerText = appropriateLabels.shortcutsHeading;
  }

  const shortcutList = document.querySelector('.keyboardShortcuts ul');
  if (shortcutList && appropriateLabels.shortcuts) {
    shortcutList.innerHTML = appropriateLabels.shortcuts.map(item => `<li>${item}</li>`).join('');
  }

  infoModalHeader.textContent = appropriateLabels.informationHeader;
  infoModalText.textContent = appropriateLabels.informationText;
  closeInfoButton.textContent = appropriateLabels.closeLabel;

  settingsModalHeader.textContent = appropriateLabels.settingsHeader;
  uiLanguageSelectionLabel.textContent = appropriateLabels.settingsSelectorLabel;
  saveSettingsButton.textContent = appropriateLabels.saveLabel;
  closeSettingsButton.textContent = appropriateLabels.closeLabel;

  germanLanguageOptionLabel.textContent = appropriateLabels.germanLanguageOptionLabel;
  englishLanguageOptionLabel.textContent = appropriateLabels.englishLanguageOptionLabel;
  persianLanguageOptionLabel.textContent = appropriateLabels.persianLanguageOptionLabel;

  germanLanguageModalOptionLabel.textContent = appropriateLabels.germanLanguageOptionLabel;
  englishLanguageModalOptionLabel.textContent = appropriateLabels.englishLanguageOptionLabel;
  persianLanguageModalOptionLabel.textContent = appropriateLabels.persianLanguageOptionLabel;
}

function calcSaveButtonsText(saveState){
  if (saveState == 'Saving') {
    if (currentWebsiteUserInterfaceLanguage == 'de-DE') {
      return 'Sparen...';
    }
    else if (currentWebsiteUserInterfaceLanguage == 'en-US') {
      return 'Saving...';
    }
    else {
      return 'صرفه جویی...';
    }
  }
  else if (saveState == 'Saved') {
    if (currentWebsiteUserInterfaceLanguage == 'de-DE') {
      return 'Gespeichert ✔';
    }
    else if (currentWebsiteUserInterfaceLanguage == 'en-US') {
      return 'Saved ✔';
    }
    else {
      return '✔ ذخیره شد';
    }
  }
  else if (saveState == 'Save') {
    if (currentWebsiteUserInterfaceLanguage == 'de-DE') {
      return 'Speichern';
    }
    else if (currentWebsiteUserInterfaceLanguage == 'en-US') {
      return 'Save';
    }
    else {
      return 'ذخیره کنید';
    }
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
  if (!textToVerbalise || textToVerbalise.trim() === '') {
    announce("There is no text to read aloud");
    return;
  }

  if (isCurrentlySpeaking && currentAudio) {
    if (!currentAudio.paused) {
      // 🔴 Pause audio and highlighting
      restartButton.disabled = false;
      currentAudio.pause();
      playButton.innerHTML = `▶ ${getLabel('play')}`;
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
      playButton.innerHTML = `▶ ${getLabel('pause')}`;
      playButton.classList.add('playing');
      return;
    }
  }

  showLoading(); // Show loading display to prevent repeat user inputs

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
  finally {
    hideLoading(); // Processing is over, hide the loading display
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

// Farsi TTS -------------------------------------------------------------------
// Handles languages that read from right-to-left, in paticular Farsi / Persian
function splitTextIntoChunks(text, maxChars = 1000) {
  const chunks = [];
  let currentChunk = '';

  const sentences = text.match(/[^.!؟\n]+[.!؟\n]*\s*/g) || [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks;
}

async function utiliseOpenAiTTS(textToVerbalise, payload) {
  try {
    let audioBlob;

    // Check if we have cached this audio already - if so, just re-play existing one
    if (isAudioAlreadyCached(textToVerbalise)) {
      console.log('📚 Re-playing cached copy...');
      audioBlob = lastCachedAudioBlob;
    }
    else { // Otherwise fetch a new one
      const chunks = splitTextIntoChunks(textToVerbalise, 1000);
      const audioBlobs = [];

      for (const chunk of chunks) {
        const response = await fetch('/.netlify/functions/openaiFarsiTTS', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, text: chunk })
        });

        const result = await response.json();
        if (!response.ok || !result.audioContent) {
          console.error('🔴 OpenAI TTS error response:', result);
          throw new Error(result.error || 'Invalid audio response from OpenAI TTS');
        }

        const chunkBlob = new Blob(
          [Uint8Array.from(atob(result.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mp3' }
        );

        audioBlobs.push(chunkBlob);
      }

      audioBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

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
    lastCachedTimepoints = [];

    audio.play();
  }
  catch (err) {
    console.error('🔴 Google TTS error:', err);
    isCurrentlySpeaking = false;
    playButton.classList.remove('playing');

    adjustPlayButtonByPreferredLanguage();
  }
}
// Farsi TTS -------------------------------------------------------------------


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

  const playbackSpeedEqualiser = repeatSlowerNextTime ? speeds['normal'] : speeds['slow'];

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
    activeWordSpans = Array.from(document.querySelectorAll('#textDisplay .word'));
    const words = textToVerbalise.trim().split(/\s+/).map(word => word.replace(/[“”‘’"',.?!:;]/g, '').toLowerCase());

    function trackAudioProgress() {
      if (!audio || audio.paused || audio.ended) return;

      const playbackSpeedEqualiser = repeatSlowerNextTime ? speeds['normal'] : speeds['slow'];
      const currentTime = audio.currentTime / playbackSpeedEqualiser;

      for (let i = 0; i < timepoints.length; i++) {

        const start = parseFloat(timepoints[i].timeSeconds);
        const nextStart = timepoints[i + 1] ? parseFloat(timepoints[i + 1].timeSeconds): Infinity;

        if (currentTime >= start && currentTime < nextStart) {
          const currentMark = timepoints[i].markName.toLowerCase();
          const index = words.findIndex(w => w === currentMark);

          if (index !== -1) {
            activeWordSpans.forEach(span => span.classList.remove('spoken', 'current'));
            for (let j = 0; j < index; j++) activeWordSpans[j].classList.add('spoken');
            const currentSpan = activeWordSpans[index];
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

      const audioBitRate = 96000; // 96kbps
      mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: audioBitRate
      });

      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const duration = Math.round((Date.now() - recordingStartTime) / 1000);
        audioStream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');
        showLoading(); // ⏳ Show loading indicator + disable buttons

        // Calculate Audio metadata for logging
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await blob.arrayBuffer();

        audioCtx.decodeAudioData(arrayBuffer, decoded => {
          const duration = decoded.duration;
          const sizeBytes = blob.size;
          const bitrateKbps = (sizeBytes * 8) / duration / 1000;

          console.log(`🎧 Recording Duration: ${duration.toFixed(2)}s`);
          console.log(`📦 File Size: ${(sizeBytes / 1024).toFixed(1)} KB`);
          console.log(`📊 Effective Bitrate: ${bitrateKbps.toFixed(1)} kbps`);
        }, err => {
          console.error("🔴 Failed to decode audio:", err);
        });
        // -----------------------------------

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
          const transcriptionJobId = generateUUIDv4();

          const response = await fetch('/.netlify/functions/transcribeAudio-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcriptionJobId: transcriptionJobId,
              audioBase64: base64Audio,
              languageCode: currentTranscriptionLanguage
            })
          });

          console.log("⏳ Job queued. Polling for result...");
          console.log("Full response for the queued job: ", response);

          let attempts = 0;
          let resultData = null;

          while (attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 20000)); // Wait 20 seconds per interval
            const pollRes = await fetch(`/.netlify/functions/getTranscription?id=${transcriptionJobId}`);
            if (pollRes.status === 200) {
              console.log("Status was 200, breaking loop");
              resultData = await pollRes.json();
              break;
            }

            console.log("Proceeding to new attempt: " + attempts);
            attempts++;
          }

          if (resultData?.text) {
            textDisplay.innerText += (textDisplay.innerText.trim() ? ' ' : '') + resultData.text;
            console.log("📗 Transcription retrieved successfully");
          } else {
            console.warn("🔴 Failed to retrieve transcription in time");
          }
        } catch (err) {
          console.error('🔴 API call failed:', err);
        }
        finally {
          hideLoading(); // Disable loading overlays after transcription processing completes
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
  const selection = window.getSelection();
  const selectedText = selection && selection.rangeCount > 0
    ? selection.toString().trim()
    : '';

  const textToVerbalise = selectedText || textDisplay.innerText.trim();

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

    const selection = window.getSelection();
    const selectedText = selection && selection.rangeCount > 0
      ? selection.toString().trim()
      : '';

    const textToVerbalise = selectedText || textDisplay.innerText.trim();
    verbaliseTextViaTTS(textToVerbalise);
  }
  if (!isTyping && e.key.toLowerCase() === 'r') {
    toggleRecording();
  }
  if (!isTyping && e.key.toLowerCase() === 'p') {
    const selection = window.getSelection();
    const selectedText = selection && selection.rangeCount > 0
      ? selection.toString().trim()
      : '';

    const textToVerbalise = selectedText || textDisplay.innerText.trim();
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

  if ((FORCE_SHOW_CAMERA || window.mobileCheck()) && navigator.mediaDevices?.getUserMedia) {
    console.log('✅ Showing camera button...');
    cameraBtn.style.display = 'flex';
  } else {
    cameraBtn.style.display = 'none';
    console.log('⛔ Camera button not shown: not mobile or no getUserMedia');
  }

  await fetchPreferredLanguage();

  textDisplay.focus();
});

restartButton.addEventListener('click', () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    playButton.classList.add('playing');
    isCurrentlySpeaking = true;
    currentAudio.play();

    playButton.innerHTML = `▶ ${getLabel('pause')}`;

    if (highlightFrameId) {
      cancelAnimationFrame(highlightFrameId);
      highlightFrameId = null;
    }

    if (repeatSlowerNextTime) {
      repeatSlowerNextTime = false;
    }
    else {
      repeatSlowerNextTime = true;
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
  }, 600); // 600 is set in order to match the animation duration
}

infoBtn.addEventListener('click', () => {
  infoModal.classList.remove('fade-out');
  infoModal.style.display = 'flex';
  infoModal.classList.add('show');
});

closeInfoButton.addEventListener('click', () => {
  infoModal.classList.add('fade-out');
  setTimeout(() => {
    infoModal.style.display = 'none';
    infoModal.classList.remove('fade-out', 'show');
  }, 600); // matches your CSS transition
});

infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    hideModal(infoModal);
  }
});

uiLanguageSelector.addEventListener('change', async (e) => {
  const selected = uiLanguageSelector.value;
  saveSettingsButton.disabled = (selected === initialUILang);
});

transcriptionLanguageSelector.addEventListener('change', async (e) => {
  currentTranscriptionLanguage = transcriptionLanguageSelector.value;
});

// TODO - Add transcription preference in settings, as default starter
function persistPreferences() {
  const payload = JSON.stringify({
    transcriptionLanguage: currentTranscriptionLanguage
  });

  try {
    navigator.sendBeacon(
      '/.netlify/functions/userLanguage',
      new Blob([payload], { type: 'application/json' })
    );
  }
  catch (err) {
    console.log("💾 Transcription language saved before exit");
  }
}

saveSettingsButton.addEventListener('click', async () => {
  const uiLang = uiLanguageSelector.value;
  const transcriptionLang = transcriptionLanguageSelector.value;

  if (uiLang !== initialUILang || transcriptionLang !== initialTxLang) {
    saveSettingsButton.textContent = calcSaveButtonsText('Saving');
    saveSettingsButton.disabled = true;

    try {
      await fetch('/.netlify/functions/userLanguage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uiLanguage: uiLang,
          transcriptionLanguage: transcriptionLang
        })
      });

      // Apply updates
      currentWebsiteUserInterfaceLanguage = uiLang;
      currentTranscriptionLanguage = transcriptionLang;
      updateInterfaceLanguage(uiLang);
      initialUILang = uiLang;
      initialTxLang = transcriptionLang;

      // Close the modal after a brief confirmation
      saveSettingsButton.textContent = calcSaveButtonsText('Saved');

      // Step 1: Let the user read the confirmation
      setTimeout(() => {
        saveSettingsButton.textContent = calcSaveButtonsText('Save');

        // Step 2: Start fade-out animation
        settingsModal.classList.add('fade-out');

        // Step 3: Remove modal after fade completes
        setTimeout(() => {
          settingsModal.style.display = 'none';
          settingsModal.classList.remove('fade-out');
          saveSettingsButton.disabled = true;
        }, 600); // Match CSS transition duration

      }, 2000); // Show "Saved ✔" for 2 second


    } catch (err) {
      console.error('🔴 Failed to save preferences:', err);
      saveSettingsButton.textContent = 'Error ❌';
      setTimeout(() => {
        saveSettingsButton.textContent = calcSaveButtonsText('Save');
        saveSettingsButton.disabled = false;
      }, 1500);
    }
  } else {
    // If nothing changed, just close immediately
    settingsModal.style.display = 'none';
  }
});


// Repeat the same for settingsModal
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('fade-out');
  settingsModal.style.display = 'flex'; // center modal
  settingsModal.classList.add('show');  // triggers fade-in
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add('fade-out');
    setTimeout(() => {
      settingsModal.style.display = 'none';
      settingsModal.classList.remove('fade-out', 'show');
    }, 300);
  }
});

closeSettingsButton.addEventListener('click', () => {
  settingsModal.classList.add('fade-out');
  setTimeout(() => {
    settingsModal.style.display = 'none';
    settingsModal.classList.remove('fade-out', 'show');
  }, 300);
});

textDisplay.addEventListener('click', (e) => {
  const target = e.target;
  if (!target.classList.contains('word') || !currentAudio || !lastCachedTimepoints.length) return;

  const index = parseInt(target.dataset.index);
  if (isNaN(index)) return;

  let seekTo;
  if ('start' in lastCachedTimepoints[index]) {
    seekTo = lastCachedTimepoints[index].start;
  } else if ('timeSeconds' in lastCachedTimepoints[index]) {
    seekTo = lastCachedTimepoints[index].timeSeconds;
  } else {
    return;
  }

  console.log(`⏩ Seeking to word ${index} at ${seekTo.toFixed(2)}s`);
  const playbackRate = currentAudio.playbackRate;
  currentAudio.currentTime = seekTo * playbackRate;

  const wordSpans = document.querySelectorAll('#textDisplay .word');
  wordSpans.forEach(span => span.classList.remove('spoken', 'current'));
  for (let i = 0; i < index; i++) wordSpans[i].classList.add('spoken');
  wordSpans[index].classList.add('current');

  // 🔥 Flash animation
  target.classList.add('flash');
  setTimeout(() => target.classList.remove('flash'), 400);

  if (navigator.vibrate) {
    navigator.vibrate(30);
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
