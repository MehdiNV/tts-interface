const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const checkRateLimit = require('./utils/rateLimit');

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const availableTranscriptionLanguages = {
  German: "de",
  Persian: "fa",
  English: "en",
  'de-DE': 'de',
  'en-US': 'en',
  'fa-IR': 'fa',
};

exports.handler = async function (event) {
  // Rate limiting mechanism ---------------------------------------------------
  const clientIp = event.headers['x-forwarded-for'] || 'unknown';

  if (await checkRateLimit(clientIp)) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests' }) };
  }
  // Rate limiting mechanism ---------------------------------------------------

  try {
    const { audioBase64, languageCode } = JSON.parse(event.body);
    if (!audioBase64 || !languageCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing audio data' })
      };
    }

    // Save the uploaded audio to a temporary file
    const buffer = Buffer.from(audioBase64, 'base64');
    const tempPath = path.join(os.tmpdir(), `${uuidv4()}.webm`);
    fs.writeFileSync(tempPath, buffer);

    // Step 1: Transcribe with enforced language
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      language: availableTranscriptionLanguages[languageCode]
    });

    fs.unlinkSync(tempPath);

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: transcription.text
      })
    };

  } catch (err) {
    console.error('🔴 Transcription Error:', err.stack || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Transcription failed' })
    };
  }
};
