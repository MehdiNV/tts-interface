// index.js

// Wait for the voices to load before setting up the language selector.
function waitForVoices() {
  return new Promise((resolve) => {
    let voices = speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
    } else {
      speechSynthesis.onvoiceschanged = () => {
        voices = speechSynthesis.getVoices();
        resolve(voices);
      };
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // Announce page load for screen readers
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.classList.add('sr-only');
  announcement.textContent = 'Welcome to Accessibility Reading Tools. Please select Text to Speech or Speech to Text option.';
  document.body.appendChild(announcement);

  // Remove announcement after it's been read
  setTimeout(() => {
    announcement.textContent = '';
  }, 3000);

  // Once voices are loaded, set up the language selector.
  waitForVoices().then((voices) => {
    console.log('Voices loaded:', voices);
    setupLanguageSelector(voices);
  });

  // Add keyboard navigation for the two main buttons.
  document.addEventListener('keydown', (event) => {
    if (event.key === '1') {
      document.getElementById('ttsButton').click();
    } else if (event.key === '2' && !document.getElementById('sttButton').hasAttribute('aria-disabled')) {
      document.getElementById('sttButton').click();
    }
  });
});

function setupLanguageSelector(voices) {
  const languageButton = document.getElementById('languageButton');
  const languageList = document.getElementById('languageList');

  // Get stored language; default to English if not present.
  const storedLang = localStorage.getItem('preferredLanguage') || 'en';
  updateLanguageButton(storedLang);

  // When the language button is clicked, toggle the dropdown.
  languageButton.addEventListener('click', () => {
    languageList.classList.toggle('show');
  });

  // For each option, add a click handler that speaks the language name and saves the selection.
  document.querySelectorAll('.language-list li').forEach(li => {
    li.addEventListener('click', () => {
      // Cancel any currently queued utterances.
      speechSynthesis.cancel();

      const textToSpeak = li.textContent.trim();
      console.log('Attempting to speak:', textToSpeak);

      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Set the appropriate language and choose a voice matching the language.
      if (li.dataset.value === 'fa') {
        utterance.lang = 'fa-IR';
        const chosenVoice = voices.find(v => v.lang && v.lang.startsWith('fa'));
        if (chosenVoice) utterance.voice = chosenVoice;
      } else if (li.dataset.value === 'de') {
        utterance.lang = 'de-DE';
        const chosenVoice = voices.find(v => v.lang && v.lang.startsWith('de'));
        if (chosenVoice) utterance.voice = chosenVoice;
      } else {
        utterance.lang = 'en-US';
        const chosenVoice = voices.find(v => v.lang && v.lang.startsWith('en'));
        if (chosenVoice) utterance.voice = chosenVoice;
      }

      // Optional: Adjust rate and pitch if needed.
      utterance.rate = 1;
      utterance.pitch = 1;

      // Log start and potential errors.
      utterance.onstart = () => {
        console.log('Speech synthesis started for:', textToSpeak);
      };
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
      };

      // Speak the utterance.
      speechSynthesis.speak(utterance);

      // Save the selected language and update the language button text.
      const selectedLang = li.dataset.value;
      localStorage.setItem('preferredLanguage', selectedLang);
      updateLanguageButton(selectedLang);

      // Hide the dropdown.
      languageList.classList.remove('show');
      console.log('Preferred language set to:', selectedLang);
    });

    // If you wish, you may add a mouseover handler here for testing, but note that hover events sometimes
    // might not trigger speech synthesis due to browser gesture requirements.
  });
}

function updateLanguageButton(lang) {
  const languageButton = document.getElementById('languageButton');
  let displayText = 'English';
  if (lang === 'de') {
    displayText = 'Deutsch';
  } else if (lang === 'fa') {
    displayText = 'فارسی';
  }
  languageButton.textContent = displayText;
}
