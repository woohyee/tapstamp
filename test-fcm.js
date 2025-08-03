const fetch = require('node-fetch');

async function testFCMRegistration() {
  console.log('🧪 Testing FCM Registration API...');
  
  try {
    // Test GET request to check token status
    console.log('📋 Testing GET /api/admin/fcm/register...');
    const getResponse = await fetch('http://localhost:3000/api/admin/fcm/register', {
      method: 'GET'
    });
    
    console.log('Status:', getResponse.status);
    console.log('Headers:', Object.fromEntries(getResponse.headers.entries()));
    
    const getResult = await getResponse.text();
    console.log('Response body:', getResult);
    
    if (!getResponse.ok) {
      console.error('❌ GET request failed');
      return;
    }
    
    console.log('✅ GET request successful');
    
    // Test POST request to register token
    console.log('\n📤 Testing POST /api/admin/fcm/register...');
    const postResponse = await fetch('http://localhost:3000/api/admin/fcm/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fcm_token: 'test_token_12345_abcdef',
        device_info: {
          userAgent: 'Test Script',
          platform: 'test',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    console.log('Status:', postResponse.status);
    const postResult = await postResponse.text();
    console.log('Response body:', postResult);
    
    if (postResponse.ok) {
      console.log('✅ POST request successful');
    } else {
      console.error('❌ POST request failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testFCMRegistration();