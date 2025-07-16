import { airtableService } from './airtableService';

export async function clearAllCandidates() {
  const baseId = 'app3tA4UpKQCT2s17'; // platouserprofiles base
  const tableName = 'Table 1';
  
  try {
    console.log('🧹 Starting to clear all candidates from Airtable...');
    
    // Get all records from the candidates table
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY || "pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0"}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch candidates: ${response.statusText}`);
    }
    
    const data = await response.json();
    const records = data.records;
    
    console.log(`📊 Found ${records.length} candidate records to delete`);
    
    if (records.length === 0) {
      console.log('✅ No candidates to delete');
      return;
    }
    
    // Delete records in batches of 10 (Airtable's limit)
    const batchSize = 10;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const recordIds = batch.map((record: any) => record.id);
      
      console.log(`🗑️  Deleting batch ${Math.floor(i / batchSize) + 1}: ${recordIds.length} records`);
      
      // Delete the batch
      const deleteResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}?${recordIds.map(id => `records[]=${id}`).join('&')}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY || "pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0"}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete batch: ${deleteResponse.statusText}`);
      }
      
      console.log(`✅ Deleted ${recordIds.length} records`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('🎉 All candidates cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing candidates:', error);
    throw error;
  }
}

// Also clear job matches and applications for clean testing
export async function clearJobMatches() {
  const baseId = 'appN5VwJpCFVwpJqY'; // platojobmatches base
  const tableName = 'Table 1';
  
  try {
    console.log('🧹 Clearing job matches...');
    
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY || "pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0"}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch job matches: ${response.statusText}`);
    }
    
    const data = await response.json();
    const records = data.records;
    
    console.log(`📊 Found ${records.length} job match records to delete`);
    
    if (records.length === 0) {
      console.log('✅ No job matches to delete');
      return;
    }
    
    // Delete in batches
    const batchSize = 10;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const recordIds = batch.map((record: any) => record.id);
      
      const deleteResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}?${recordIds.map(id => `records[]=${id}`).join('&')}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY || "pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0"}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete job matches batch: ${deleteResponse.statusText}`);
      }
      
      console.log(`✅ Deleted ${recordIds.length} job match records`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('🎉 Job matches cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing job matches:', error);
    throw error;
  }
}

export async function clearJobApplications() {
  const baseId = 'appEYs1fTytFXoJ7x'; // platojobapplications base
  const tableName = 'Table 1';
  
  try {
    console.log('🧹 Clearing job applications...');
    
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY || "pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0"}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch job applications: ${response.statusText}`);
    }
    
    const data = await response.json();
    const records = data.records;
    
    console.log(`📊 Found ${records.length} job application records to delete`);
    
    if (records.length === 0) {
      console.log('✅ No job applications to delete');
      return;
    }
    
    // Delete in batches
    const batchSize = 10;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const recordIds = batch.map((record: any) => record.id);
      
      const deleteResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}?${recordIds.map(id => `records[]=${id}`).join('&')}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY || "pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0"}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete job applications batch: ${deleteResponse.statusText}`);
      }
      
      console.log(`✅ Deleted ${recordIds.length} job application records`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('🎉 Job applications cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing job applications:', error);
    throw error;
  }
}

// Complete cleanup function
export async function fullCleanup() {
  console.log('🚀 Starting full cleanup of candidate data...');
  
  try {
    await clearAllCandidates();
    await clearJobMatches();
    await clearJobApplications();
    
    console.log('🎉 Full cleanup completed successfully!');
    console.log('📋 Job postings have been preserved');
    
  } catch (error) {
    console.error('❌ Full cleanup failed:', error);
    throw error;
  }
}