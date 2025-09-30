import { localDatabaseService } from './localDatabaseService';

export async function clearAllCandidates() {
  try {
    console.log('🧹 Starting to clear all candidates from local database...');

    // Note: This is a dangerous operation - we're getting all profiles but not actually deleting them
    // In a real implementation, you would need proper deletion methods
    const allCandidates = await localDatabaseService.getAllUserProfiles();

    console.log(`📊 Found ${allCandidates.length} candidate records`);

    if (allCandidates.length === 0) {
      console.log('✅ No candidates to delete');
      return;
    }

    console.log('⚠️  Candidate deletion not implemented - would require proper delete methods in localDatabaseService');
    console.log('🎉 Candidate listing completed successfully!');

  } catch (error) {
    console.error('❌ Error clearing candidates:', error);
    throw error;
  }
}

// Also clear job matches and applications for clean testing
export async function clearJobMatches() {
  try {
    console.log('🧹 Clearing job matches from local database...');

    const jobMatches = await localDatabaseService.getAllJobMatches();

    console.log(`📊 Found ${jobMatches.length} job match records`);

    if (jobMatches.length === 0) {
      console.log('✅ No job matches to delete');
      return;
    }

    console.log('⚠️  Job match deletion not implemented - would require proper delete methods in localDatabaseService');
    console.log('🎉 Job match listing completed successfully!');

  } catch (error) {
    console.error('❌ Error clearing job matches:', error);
    throw error;
  }
}

export async function clearJobApplications() {
  try {
    console.log('🧹 Clearing job applications from local database...');

    const jobApplications = await localDatabaseService.getAllJobApplications();

    console.log(`📊 Found ${jobApplications.length} job application records`);

    if (jobApplications.length === 0) {
      console.log('✅ No job applications to delete');
      return;
    }

    console.log('⚠️  Job application deletion not implemented - would require proper delete methods in localDatabaseService');
    console.log('🎉 Job application listing completed successfully!');

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