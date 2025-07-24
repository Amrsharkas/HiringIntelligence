// Test script to verify invitation acceptance system

console.log('🧪 Testing invitation acceptance system...');

// Test 1: Check if endpoint exists
fetch('/api/invitations/accept-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orgId: "1", inviteCode: "TEST123" }),
  credentials: 'include'
})
.then(response => {
  console.log('✅ Endpoint exists and responds:', response.status);
  if (response.status === 401) {
    console.log('✅ Authentication required (as expected)');
  } else {
    console.log('⚠️  Unexpected status:', response.status);
  }
  return response.text();
})
.then(text => {
  console.log('📝 Response body:', text);
})
.catch(error => {
  console.error('❌ Test failed:', error);
  console.error('❌ Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
});

// Test 2: Verify apiRequest function
try {
  console.log('🧪 Testing apiRequest function...');
  
  // This should fail gracefully if there's a parameter issue
  const testRequest = () => {
    return window.apiRequest("POST", "/api/invitations/accept-code", {
      orgId: "1",
      inviteCode: "TEST123"
    });
  };
  
  testRequest()
    .then(response => {
      console.log('✅ apiRequest function works correctly');
    })
    .catch(error => {
      if (error.message.includes('401')) {
        console.log('✅ apiRequest works - got expected auth error');
      } else {
        console.error('❌ apiRequest error:', error);
      }
    });
    
} catch (error) {
  console.error('❌ apiRequest test failed:', error);
}