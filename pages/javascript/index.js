require('dotenv').config();
console.log(process.env.OPENAI_API_KEY); // Add backend proxy server to prevent JS inspection


// Announce page on load for screen readers
window.addEventListener('DOMContentLoaded', () => {
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
});

// Add keyboard navigation
document.addEventListener('keydown', (event) => {
  if (event.key === '1') {
    document.getElementById('ttsButton').click();
  } else if (event.key === '2' && !document.getElementById('sttButton').hasAttribute('aria-disabled')) {
    document.getElementById('sttButton').click();
  }
});
