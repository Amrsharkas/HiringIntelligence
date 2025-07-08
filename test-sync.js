// Test the job sync functionality
const { jobPostingsAirtableService } = require('./server/jobPostingsAirtableService.ts');

async function testSync() {
  try {
    console.log('Testing job sync...');
    await jobPostingsAirtableService.syncJobPostingsToAirtable();
    console.log('Sync test completed');
  } catch (error) {
    console.error('Sync test failed:', error);
  }
}

testSync();