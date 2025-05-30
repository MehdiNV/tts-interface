// netlify/functions/openaiFarsiTTS.js

const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const checkRateLimit = require('./utils/rateLimit');

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async function (event) {
  // Rate limiting mechanism ---------------------------------------------------
  const clientIp = event.headers['x-forwarded-for'] || 'unknown';

  if (await checkRateLimit(clientIp)) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests' }) };
  }
  // Rate limiting mechanism ---------------------------------------------------

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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioContent: audioBuffer.toString('base64')
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
