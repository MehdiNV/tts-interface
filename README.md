# tts-interface
An interface that I created for my grandfather, in order to make reading and
writing easier for his eyes. This program is applicable for anyone who is visually
impaired, feel free to fork this repository or to make use of it as you wish -
as long as it helps people, I'm happy.

**Front-end:**
Mixture of simple HTML, CSS and javascript

**Back-end:**
Netlify Functions, simple Javascript files that acts as a back-end server

**Domain hosting:** Netlify, hosted on https://www.rasuleye.com

**Rate-limiting:** Upstash (Simple Redis DB / light-weight back-end) - https://upstash.com/

APIs:
* Language Detection API (https://detectlanguage.com)
* OpenAI Whisper (for transcribing audio, https://platform.openai.com/docs/models/whisper-1)
* OpenAI TTS (for TTS w/ Farsi, https://platform.openai.com/docs/models/tts-1)
* Google TTS (for TTS w/ English and German, https://cloud.google.com/text-to-speech?hl=en)

For any questions, please contact me at _MehdiNV@hotmail.com_.
