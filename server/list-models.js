const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    console.log('[List] Requesting model list...');
    // We can list models using fetch or standard methods if client exposes it
    // Or we can query the API directly via HTTP fetch to bypass SDK version issues
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('[List] Success! Available models:');
      if (data.models) {
        data.models.forEach(m => console.log(`  - ${m.name} (${m.displayName})`));
      } else {
        console.log('No models returned:', data);
      }
    } else {
      console.error('[List] API Error Response:', data);
    }
  } catch (error) {
    console.error('[List] Network Exception:', error.message);
  }
}

listModels();
