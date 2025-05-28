// netlify/functions/describeImage.js
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { v2: { Translate } } = require('@google-cloud/translate');
const vision = new ImageAnnotatorClient();
const translate = new Translate();
const checkRateLimit = require('./utils/rateLimit');

const fs = require('fs');
const os = require('os');
const path = require('path');

// Always decode from GCLOUD_KEY_BASE64
const keyPath = path.join(os.tmpdir(), 'gcloud-service-key.json');
if (!fs.existsSync(keyPath)) {
  if (!process.env.GCLOUD_KEY_BASE64) {
    throw new Error('GCLOUD_KEY_BASE64 is not set');
  }

  const decoded = Buffer.from(process.env.GCLOUD_KEY_BASE64, 'base64').toString('utf8');
  fs.writeFileSync(keyPath, decoded);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

exports.handler = async function(event) {
  // Rate limiting mechanism ---------------------------------------------------
  const clientIp = event.headers['x-forwarded-for'] || 'unknown';

  if (await checkRateLimit(clientIp)) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests' }) };
  }
  // Rate limiting mechanism ---------------------------------------------------

  const { imageBase64 } = JSON.parse(event.body);
  const imageBuffer = Buffer.from(imageBase64, 'base64');

  console.log("📷 Attempting to describe image captured...");

  try {
    const [result] = await vision.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: 'TEXT_DETECTION' },
        { type: 'LABEL_DETECTION', maxResults: 5 }
      ]
    });

    const labels = result.labelAnnotations?.map(l => l.description).join(', ') || '';
    const text = result.textAnnotations?.[0]?.description
      || 'Im Bild wurde kein Text erkannt';

    const combined = `Bildbeschreibung: ${labels}. Erkannter Text: ${text}`;
    const [translated] = await translate.translate(combined, 'de');

    return {
      statusCode: 200,
      body: JSON.stringify({ descriptionText: translated })
    };
  } catch (err) {
    console.error("🔴 Vision and / or Translate API error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
