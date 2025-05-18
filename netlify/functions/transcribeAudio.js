// netlify/functions/transcribeAudio.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async function(event) {
  try {
    const { audioBase64 } = JSON.parse(event.body);
    if (!audioBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing audio data' })
      };
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const tempPath = path.join(os.tmpdir(), `${uuidv4()}.webm`);
    fs.writeFileSync(tempPath, buffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'json'
    });

    fs.unlinkSync(tempPath);

    return {
      statusCode: 200,
      body: JSON.stringify({ text: transcription.text })
    };

  } catch (err) {
    console.error('❌ Transcription Error:', err.stack || err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Transcription failed' })
    };
  }
};
