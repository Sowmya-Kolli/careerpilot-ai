const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('[Test] API Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'Undefined');

const ai = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
  try {
    console.log(`[Test] Querying model "${modelName}"...`);
    const model = ai.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say hello in one word.');
    console.log(`[Test] Success with "${modelName}":`, result.response.text().trim());
    return true;
  } catch (error) {
    console.error(`[Test] Failed with "${modelName}":`, error.message);
    if (error.status) console.error(`[Test] Status Code:`, error.status);
    return false;
  }
}

async function run() {
  const models = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-1.5-flash',
    'models/gemini-1.5-flash',
    'gemini-1.5-pro',
    'models/gemini-1.5-pro',
    'gemini-pro',
    'models/gemini-pro'
  ];
  
  for (let m of models) {
    const success = await testModel(m);
    if (success) {
      console.log(`[Test] Recommend using: "${m}"`);
      break;
    }
  }
}

run();
