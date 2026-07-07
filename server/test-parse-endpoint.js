const path = require('path');

async function testParse() {
  const payload = {
    body: `Hi Sowmya,

Thank you for applying to Netflix. We would like to invite you to a 60-minute technical interview for the Software Engineer Intern position on July 12, 2026.

Best,
Netflix University Recruiting`
  };

  try {
    console.log('[Test] Sending parse request to http://localhost:5000/api/parse...');
    const response = await fetch('http://localhost:5000/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('[Test] Server response status:', response.status);
    console.log('[Test] Extracted Data from Gemini:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[Test] HTTP Request failed:', error.message);
  }
}

testParse();
