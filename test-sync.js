import fetch from 'node-fetch';

async function testSync() {
  console.log('🧪 Testing system sync after cleanup...');
  
  const apiKey = "pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0";
  
  // Test 1: Check candidates table is empty
  console.log('\n1️⃣ Testing candidates table...');
  const candidatesResponse = await fetch(`https://api.airtable.com/v0/app3tA4UpKQCT2s17/Table 1`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const candidatesData = await candidatesResponse.json();
  console.log(`📊 Candidates table: ${candidatesData.records.length} records`);
  
  // Test 2: Check job matches table is empty  
  console.log('\n2️⃣ Testing job matches table...');
  const matchesResponse = await fetch(`https://api.airtable.com/v0/app1u4N2W46jD43mP/Table 1`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const matchesData = await matchesResponse.json();
  console.log(`📊 Job matches table: ${matchesData.records.length} records`);
  
  // Test 3: Check job applications table is empty
  console.log('\n3️⃣ Testing job applications table...');
  const applicationsResponse = await fetch(`https://api.airtable.com/v0/appEYs1fTytFXoJ7x/Table 1`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const applicationsData = await applicationsResponse.json();
  console.log(`📊 Job applications table: ${applicationsData.records.length} records`);
  
  // Test 4: Check job postings table still has data
  console.log('\n4️⃣ Testing job postings table...');
  const postingsResponse = await fetch(`https://api.airtable.com/v0/appCjIvd73lvp0oLf/Table 1`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const postingsData = await postingsResponse.json();
  console.log(`📊 Job postings table: ${postingsData.records.length} records`);
  
  if (postingsData.records.length > 0) {
    console.log(`✅ Active job: "${postingsData.records[0].fields['Job title']}" (ID: ${postingsData.records[0].fields['Job ID']})`);
  }
  
  // Test 5: Summary
  console.log('\n📋 **CLEANUP VERIFICATION SUMMARY**');
  console.log(`✅ Candidates cleared: ${candidatesData.records.length === 0 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Job matches cleared: ${matchesData.records.length === 0 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Job applications cleared: ${applicationsData.records.length === 0 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Job postings preserved: ${postingsData.records.length > 0 ? 'SUCCESS' : 'FAILED'}`);
  
  console.log('\n🎉 System is ready for fresh testing!');
}

testSync().catch(console.error);