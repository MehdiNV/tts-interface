// netlify/functions/describeImage.js
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { v2: { Translate } } = require('@google-cloud/translate');
const vision = new ImageAnnotatorClient();
const translate = new Translate();

exports.handler = async function(event) {
  const { imageBase64 } = JSON.parse(event.body);
  const imageBuffer = Buffer.from(imageBase64, 'base64');

  try {
    const [result] = await vision.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: 'TEXT_DETECTION' },
        { type: 'LABEL_DETECTION', maxResults: 5 }
      ]
    });

    const labels = result.labelAnnotations?.map(l => l.description).join(', ') || '';
    const text = result.textAnnotations?.[0]?.description || '';

    const combined = `Bildbeschreibung: ${labels}. Erkannter Text: ${text}`;
    const [translated] = await translate.translate(combined, 'de');

    return {
      statusCode: 200,
      body: JSON.stringify({ descriptionText: translated })
    };
  } catch (err) {
    console.error("🔴 Vision/Translate error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
