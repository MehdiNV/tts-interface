// index.js

// Unlock voices on first user click (Chrome/macOS workaround)
// Note: We now reset the voices array after calling speechSynthesis.speak().
document.addEventListener('click', () => {
  const silentUtter = new SpeechSynthesisUtterance(" ");
  silentUtter.volume = 0;
  speechSynthesis.speak(silentUtter);
  // Force-refresh voices; this line is present in ttsPageScript.js.
  window.voices = speechSynthesis.getVoices();
}, { once: true });

// Function to wait until voices are loaded.
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
  // Announce page load for screen readers.
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.classList.add('sr-only');
  announcement.textContent =
    'Welcome to Accessibility Reading Tools. Please select Text to Speech or Speech to Text option.';
  document.body.appendChild(announcement);

  // Remove the announcement after it's been read.
  setTimeout(() => {
    announcement.textContent = '';
  }, 3000);

  // Wait for voices to be loaded before setting up the language selector.
  waitForVoices().then(() => {
    console.log('Voices loaded.');
    setupLanguageSelector();
  });

  // Add keyboard navigation for the two main buttons.
  document.addEventListener('keydown', (event) => {
    if (event.key === '1') {
      document.getElementById('ttsButton').click();
    } else if (
      event.key === '2' &&
      !document.getElementById('sttButton').hasAttribute('aria-disabled')
    ) {
      document.getElementById('sttButton').click();
    }
  });
});

function setupLanguageSelector() {
  const languageButton = document.getElementById('languageButton');
  const languageList = document.getElementById('languageList');

  // Retrieve stored language from localStorage (default to English "en").
  const storedLang = localStorage.getItem('preferredLanguage') || 'en';
  updateLanguageButton(storedLang);

  // Toggle dropdown when the language button is clicked.
  languageButton.addEventListener('click', () => {
    languageList.classList.toggle('show');
  });

  // For each language list item, add a click handler.
  document.querySelectorAll('.language-list li').forEach((li) => {
    li.addEventListener('click', () => {
      // Cancel any queued utterances.
      speechSynthesis.cancel();

      const textToSpeak = li.textContent.trim();
      console.log('Attempting to speak:', textToSpeak);

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.pitch = 1;

      // Get the current list of available voices.
      const availableVoices = speechSynthesis.getVoices();

      // Choose a voice based on the target language.
      if (li.dataset.value === 'fa') {
        utterance.lang = 'fa-IR';
        const chosenVoice = availableVoices.find((v) => v.lang && v.lang.startsWith('fa'));
        if (chosenVoice) utterance.voice = chosenVoice;
      } else if (li.dataset.value === 'de') {
        utterance.lang = 'de-DE';
        const chosenVoice = availableVoices.find((v) => v.lang && v.lang.startsWith('de'));
        if (chosenVoice) utterance.voice = chosenVoice;
      } else {
        utterance.lang = 'en-US';
        const chosenVoice = availableVoices.find((v) => v.lang && v.lang.startsWith('en'));
        if (chosenVoice) utterance.voice = chosenVoice;
      }

      // Fallback: if no matching voice found, default to the first voice.
      if (!utterance.voice && availableVoices.length > 0) {
        utterance.voice = availableVoices[0];
        console.log('No matching voice found, defaulting to:', utterance.voice.name);
      }

      utterance.onstart = () => {
        console.log('Speech synthesis started for:', textToSpeak);
      };
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
      };

      // Use a slight delay to ensure previous unlock actions are completed.
      setTimeout(() => {
        speechSynthesis.speak(utterance);
      }, 200);

      // Save the selected language and update the language button.
      const selectedLang = li.dataset.value;
      localStorage.setItem('preferredLanguage', selectedLang);
      updateLanguageButton(selectedLang);

      // Close the dropdown.
      languageList.classList.remove('show');
      console.log('Preferred language set to:', selectedLang);
    });
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

// Add keyboard navigation for main buttons.
document.addEventListener('keydown', (event) => {
  if (event.key === '1') {
    document.getElementById('ttsButton').click();
  } else if (
    event.key === '2' &&
    !document.getElementById('sttButton').hasAttribute('aria-disabled')
  ) {
    document.getElementById('sttButton').click();
  }
});
