/**
 * Test script to simulate model reloading scenarios
 * This script helps test the streaming functionality and model reloading UI
 */

const fs = require('fs');
const path = require('path');

// Mock Watson ML response for testing
const mockWatsonResponse = {
  predictions: [
    {
      values: [
        [0.1, 0.05, 0.02, 0.03, 0.04, 0.85, 0.01, 0.02] // Healthy leaf prediction
      ]
    }
  ]
};

// Test the streaming endpoint
async function testStreamingEndpoint() {
  console.log('Testing streaming prediction endpoint...');
  
  // Create a simple test image (1x1 pixel base64)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAWA0+PQAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch('http://localhost:3000/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: testImageBase64,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Streaming response received. Processing...');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('✅ Streaming completed');
            return;
          }

          try {
            const parsed = JSON.parse(data);
            console.log('📡 Streaming update:', parsed);
          } catch (e) {
            console.log('Raw data:', data);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test the regular endpoint
async function testRegularEndpoint() {
  console.log('\nTesting regular prediction endpoint...');
  
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAWA0+PQAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch('http://localhost:3000/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: testImageBase64
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Regular endpoint success:', result);
    } else {
      console.log('❌ Regular endpoint error:', result);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Starting Model Reloading Tests\n');
  console.log('Make sure the development server is running on http://localhost:3000\n');
  
  await testStreamingEndpoint();
  await testRegularEndpoint();
  
  console.log('\n✨ Tests completed!');
  console.log('\n📝 Notes:');
  console.log('- If Watson model is cold, you should see model reloading messages');
  console.log('- If model is warm, prediction should be fast');
  console.log('- Check the browser at http://localhost:3000 to test the UI');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testStreamingEndpoint,
  testRegularEndpoint,
  runTests
};
