// netlify/functions/detectLang.js
const checkRateLimit = require('./utils/rateLimit');

exports.handler = async function(event) {
  // Rate limiting mechanism ---------------------------------------------------
  const clientIp = event.headers['x-forwarded-for'] || 'unknown';

  if (await checkRateLimit(clientIp)) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests' }) };
  }
  // Rate limiting mechanism ---------------------------------------------------

  const { text } = JSON.parse(event.body);
  const response = await fetch('https://ws.detectlanguage.com/0.2/detect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DETECT_LANGUAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: text })
  });

  const result = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};
