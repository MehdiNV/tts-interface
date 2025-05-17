const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

exports.handler = async function (event) {
  try {
    const { text, languageCode = 'fa-IR' } = JSON.parse(event.body);

    if (!text || languageCode !== 'fa-IR') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request for Farsi TTS' })
      };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API Key');

    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy',
        response_format: 'mp3',
        language: 'fa'
      })
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const tempPath = path.join(os.tmpdir(), `${uuidv4()}.mp3`);
    fs.writeFileSync(tempPath, audioBuffer);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempPath));
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularity', 'word');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    const whisperResult = await whisperResponse.json();
    fs.unlinkSync(tempPath);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioContent: audioBuffer.toString('base64'),
        timepoints: whisperResult.words || []
      })
    };

  } catch (err) {
    console.error('❌ Farsi TTS Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Farsi TTS failure' })
    };
  }
};
