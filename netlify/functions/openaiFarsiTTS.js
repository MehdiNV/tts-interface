// netlify/functions/openaiFarsiTTS.js

const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const OpenAI = require('openai');

const rateLimitStore = {};
const RATE_LIMIT = 10; // max requests
const WINDOW_MS = 60 * 1000; // 1 minute

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async function (event) {
  const clientIp = event.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  if (!rateLimitStore[clientIp]) {
    rateLimitStore[clientIp] = [];
  }

  // Clear out old timestamps
  rateLimitStore[clientIp] = rateLimitStore[clientIp].filter(ts => now - ts < WINDOW_MS);

  if (rateLimitStore[clientIp].length >= RATE_LIMIT) {
    console.warn(`🚫 Rate limit exceeded for IP: ${clientIp}`);
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many requests. Please slow down.' })
    };
  }

  // Add current request timestamp
  rateLimitStore[clientIp].push(now);

  console.log('📥 Incoming request:', event.body);

  const { text, languageCode } = JSON.parse(event.body || '{}');
  if (!text || languageCode !== 'fa-IR') {
    console.warn('⚠️ Invalid input:', { text, languageCode });
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request for Farsi TTS' })
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing OpenAI API Key' })
    };
  }

  const tempPath = path.join(os.tmpdir(), `${uuidv4()}.mp3`);
  let audioBuffer;

  try {
    // Step 1: Generate speech
    console.log('🗣️ Generating speech for text...');
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1',
      input: text,
      voice: 'alloy',
      response_format: 'mp3',
      language: 'fa'
    });

    audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
    console.log('✅ Speech generated. Buffer size:', audioBuffer.length);

    // Save to temp file for transcription
    await fs.writeFile(tempPath, audioBuffer);
    console.log('💾 Audio file saved at:', tempPath);

    // Step 2: Transcribe speech
    console.log('📝 Transcribing audio with word-level timestamps...');
    const transcription = await openai.audio.transcriptions.create({
      file: fssync.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
      language: 'fa'
    });

    console.log('✅ Transcription successful');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioContent: audioBuffer.toString('base64'),
        timepoints: transcription.words || []
      })
    };

  } catch (err) {
    console.error('🔴 Farsi TTS Error:', err.stack || err.message || err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Farsi TTS failure' })
    };
  } finally {
    // Always attempt cleanup
    try {
      if (await fssync.promises.stat(tempPath)) {
        await fs.unlink(tempPath);
        console.log('🧹 Temporary file deleted:', tempPath);
      }
    } catch (cleanupErr) {
      console.error('🔴 Failed to clean up temp file:', cleanupErr.message);
    }
  }
};
