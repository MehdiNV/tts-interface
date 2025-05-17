// netlify/functions/openaiFarsiTTS.js

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async function (event) {
  console.log('📥 Incoming request:', event.body);

  try {
    const { text, languageCode = 'fa-IR' } = JSON.parse(event.body);

    if (!text || languageCode !== 'fa-IR') {
      console.warn('⚠️ Invalid input:', { text, languageCode });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request for Farsi TTS' })
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OpenAI API Key');
    }

    // Step 1: Text-to-Speech
    console.log('🗣️ Generating speech for text...');
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1',
      input: text,
      voice: 'alloy',
      response_format: 'mp3',
      language: 'fa'
    });

    console.log('✅ Speech generated successfully. Reading audio buffer...');
    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
    console.log('🧊 Buffer size:', audioBuffer.length);

    const tempPath = path.join(os.tmpdir(), `${uuidv4()}.mp3`);
    fs.writeFileSync(tempPath, audioBuffer);
    console.log('💾 Audio file saved at:', tempPath);

    // Step 2: Transcription
    console.log('📝 Transcribing audio with word-level timestamps...');
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
      language: 'fa'
    });

    console.log('✅ Transcription successful');
    console.dir(transcription, { depth: null });

    // Cleanup
    fs.unlinkSync(tempPath);
    console.log('🧹 Temporary file deleted');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioContent: audioBuffer.toString('base64'),
        timepoints: transcription.words || []
      })
    };

  } catch (err) {
    console.error('❌ Farsi TTS Error:', err.stack || err.message || err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Farsi TTS failure' })
    };
  }
};
