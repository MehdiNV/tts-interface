// netlify/functions/pollyTTS.js

const AWS = require('aws-sdk');
const { Buffer } = require('buffer');

// Configure AWS Polly
const polly = new AWS.Polly({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

exports.handler = async function(event) {
  try {
    const { text, languageCode, voiceId } = JSON.parse(event.body);

    if (!text || !languageCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: text or languageCode' })
      };
    }

    const params = {
      OutputFormat: 'mp3',
      Text: text,
      TextType: 'text',
      VoiceId: voiceId || getDefaultVoice(languageCode),
      LanguageCode: languageCode
    };

    const result = await polly.synthesizeSpeech(params).promise();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"'
      },
      body: result.AudioStream.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Polly error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function getDefaultVoice(languageCode) {
  const defaults = {
    'en-US': 'Joanna',
    'de-DE': 'Marlene',
    'fa-IR': 'Lora'
  };
  return defaults[languageCode] || 'Joanna';
}
