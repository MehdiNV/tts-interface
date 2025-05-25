const textToSpeech = require('@google-cloud/text-to-speech').v1beta1;
const fs = require('fs');

async function test() {
  const client = new textToSpeech.TextToSpeechClient();

  const [response] = await client.synthesizeSpeech({
    input: {
      ssml: `<speak xmlns="http://www.w3.org/2001/10/synthesis" version="1.0">
  <mark name="hello"/> Hello.
  <mark name="midpoint"/> This is a timing test.
  <mark name="goodbye"/> Goodbye.
</speak>`
    },
    voice: {
      languageCode: 'en-US',
      name: 'en-US-Wavenet-D'
    },
    audioConfig: { audioEncoding: 'MP3' },
    enableTimePointing: ['SSML_MARK']
  });

  console.log('✅ Audio length:', response.audioContent?.length);
  console.log('🕒 Timepoints:', response.timepoints || 'undefined');

  fs.writeFileSync('output.mp3', response.audioContent, 'binary');
  console.log('✅ Audio saved to output.mp3');
}

test().catch(console.error);
