// Service for handling real applicants from platojobapplications table
import fetch from 'node-fetch';

interface AirtableApplicantRecord {
  id: string;
  fields: {
    'Name'?: string;
    'Applicant Name'?: string;
    'User ID': string;
    'Email'?: string;
    'Phone'?: string;
    'Job title': string;
    'Job description': string;
    'Company name': string;
    'Job ID': string;
    'User profile'?: string;
    'Notes'?: string;
    'Status'?: string;
    'Match Score'?: number;
    'Match Summary'?: string;
    'Technical Skills Score'?: number;
    'Experience Score'?: number;
    'Cultural Fit Score'?: number;
  };
  createdTime: string;
}

interface AirtableApplicantResponse {
  records: AirtableApplicantRecord[];
  offset?: string;
}

interface ApplicantWithProfile {
  id: string;
  name: string;
  userId: string;
  jobTitle: string;
  jobDescription: string;
  companyName: string;
  jobId: string;
  userProfile?: string;
  notes?: string;
  status?: string;
  applicationDate: string;
  matchScore?: number;
  matchSummary?: string;
  savedMatchScore?: number;
  savedMatchSummary?: string;
  technicalSkillsScore?: number;
  experienceScore?: number;
  culturalFitScore?: number;
}

class RealApplicantsAirtableService {
  private baseUrl = 'https://api.airtable.com/v0';
  private baseId = 'appEYs1fTytFXoJ7x'; // platojobapplications base
  private tableName = 'Table 1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getApplicantsByJobId(jobId: number): Promise<ApplicantWithProfile[]> {
    try {
      console.log(`Fetching applicants for job ${jobId} from platojobapplications table...`);
      
      let allRecords: AirtableApplicantRecord[] = [];
      let offset: string | undefined;

      // Get all records for this job ID
      do {
        const params = new URLSearchParams();
        if (offset) params.append('offset', offset);
        
        // Filter by Job ID and show pending and accepted applicants (for interview scheduling)
        params.append('filterByFormula', `AND({Job ID} = "${jobId}", OR({Status} = "", {Status} = "pending", {Status} = "Accepted", {Status} = BLANK()))`);
        
        const response = await fetch(
          `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
        }

        const data: AirtableApplicantResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);

      console.log(`Found ${allRecords.length} applicants for job ${jobId}`);
      
      // Debug: Show raw record data
      if (allRecords.length > 0) {
        console.log('🔍 Raw applicant record fields:', Object.keys(allRecords[0].fields));
        allRecords.forEach((record, index) => {
          console.log(`🔍 Applicant ${index + 1} raw fields:`, record.fields);
        });
      }

      // Transform records to our format
      const applicants: ApplicantWithProfile[] = allRecords.map(record => {
        const applicant = {
          id: record.id,
          name: record.fields['Applicant Name'] || record.fields['Name'] || 'Unknown Applicant',
          userId: record.fields['User ID'] || '',
          email: record.fields['Email'] || '',
          phone: record.fields['Phone'] || '',
          jobTitle: record.fields['Job title'] || '',
          jobDescription: record.fields['Job description'] || '',
          companyName: record.fields['Company name'] || '',
          jobId: record.fields['Job ID'] || '',
          userProfile: record.fields['User profile'] || '',
          notes: record.fields['Notes'] || '',
          applicationDate: record.createdTime,
          // Check for saved match score from detailed AI analysis
          savedMatchScore: record.fields['Match Score'] || null,
          savedMatchSummary: record.fields['Match Summary'] || null,
          technicalSkillsScore: record.fields['Technical Skills Score'] || null,
          experienceScore: record.fields['Experience Score'] || null,
          culturalFitScore: record.fields['Cultural Fit Score'] || null
        };
        
        console.log(`📋 Applicant ${applicant.name} - User ID: "${applicant.userId}" (length: ${applicant.userId.length})`);
        console.log(`📋 Saved Match Score: ${applicant.savedMatchScore}`);
        console.log(`📋 Available fields in record:`, Object.keys(record.fields));
        
        return applicant;
      });

      return applicants;

    } catch (error) {
      console.error('Error fetching applicants:', error);
      return [];
    }
  }

  async getAllApplicants(): Promise<ApplicantWithProfile[]> {
    try {
      console.log('Fetching all applicants from platojobapplications table...');
      
      let allRecords: AirtableApplicantRecord[] = [];
      let offset: string | undefined;

      // Get all pending records (not accepted or denied)
      do {
        const params = new URLSearchParams();
        if (offset) params.append('offset', offset);
        
        // Filter to show pending and accepted applicants (for interview scheduling)
        params.append('filterByFormula', `OR({Status} = "", {Status} = "pending", {Status} = "Accepted", {Status} = BLANK())`);
        
        const response = await fetch(
          `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
        }

        const data: AirtableApplicantResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);

      console.log(`Found ${allRecords.length} total applicants`);

      // Debug: Show raw record data for score detection debugging
      if (allRecords.length > 0) {
        console.log('🔍 RAW AIRTABLE DATA - First applicant fields:');
        console.log('🔍 Available field names:', Object.keys(allRecords[0].fields));
        console.log('🔍 Match Score field value:', allRecords[0].fields['Match Score']);
        console.log('🔍 Match Summary field value:', allRecords[0].fields['Match Summary']);
        console.log('🔍 Technical Skills Score field value:', allRecords[0].fields['Technical Skills Score']);
        console.log('🔍 Experience Score field value:', allRecords[0].fields['Experience Score']);
        console.log('🔍 Cultural Fit Score field value:', allRecords[0].fields['Cultural Fit Score']);
      }

      // Transform records to our format and group by job ID
      const applicants: ApplicantWithProfile[] = allRecords.map(record => ({
        id: record.id,
        name: record.fields['Applicant Name'] || record.fields['Name'] || 'Unknown Applicant',
        userId: record.fields['User ID'] || '',
        email: record.fields['Email'] || '',
        phone: record.fields['Phone'] || '',
        jobTitle: record.fields['Job title'] || '',
        jobDescription: record.fields['Job description'] || '',
        companyName: record.fields['Company name'] || '',
        jobId: record.fields['Job ID'] || '',
        userProfile: record.fields['User profile'] || '',
        notes: record.fields['Notes'] || '',
        status: record.fields['Status'] || 'pending',
        applicationDate: record.createdTime,
        // Check for saved match score from detailed AI analysis
        savedMatchScore: record.fields['Match Score'] || null,
        savedMatchSummary: record.fields['Match Summary'] || null,
        technicalSkillsScore: record.fields['Technical Skills Score'] || null,
        experienceScore: record.fields['Experience Score'] || null,
        culturalFitScore: record.fields['Cultural Fit Score'] || null
      }));

      return applicants;

    } catch (error) {
      console.error('Error fetching all applicants:', error);
      return [];
    }
  }

  async getApplicantById(applicantId: string): Promise<ApplicantWithProfile | null> {
    try {
      console.log(`Fetching applicant ${applicantId} from platojobapplications table...`);
      
      const response = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}/${applicantId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const record: AirtableApplicantRecord = await response.json();
      
      // Transform record to our format
      const applicant: ApplicantWithProfile = {
        id: record.id,
        name: record.fields['Applicant Name'] || record.fields['Name'] || 'Unknown Applicant',
        userId: record.fields['User ID'] || '',
        email: record.fields['Email'] || '',
        phone: record.fields['Phone'] || '',
        jobTitle: record.fields['Job title'] || '',
        jobDescription: record.fields['Job description'] || '',
        companyName: record.fields['Company name'] || '',
        jobId: record.fields['Job ID'] || '',
        userProfile: record.fields['User profile'] || '',
        notes: record.fields['Notes'] || '',
        status: record.fields['Status'] || 'pending',
        applicationDate: record.createdTime,
        // Include saved scores from Airtable for persistence
        savedMatchScore: record.fields['Match Score'] || null,
        savedMatchSummary: record.fields['Match Summary'] || null,
        technicalSkillsScore: record.fields['Technical Skills Score'] || null,
        experienceScore: record.fields['Experience Score'] || null,
        culturalFitScore: record.fields['Cultural Fit Score'] || null
      };

      return applicant;

    } catch (error) {
      console.error('Error fetching applicant by ID from Airtable:', error);
      throw error;
    }
  }

  async updateApplicantStatus(recordId: string, status: 'accepted' | 'denied'): Promise<void> {
    try {
      console.log(`Updating applicant ${recordId} status to ${status}...`);
      
      const response = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}/${recordId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'Status': status === 'accepted' ? 'Accepted' : 'Denied'
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update applicant status: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully updated applicant ${recordId} status to ${status}`);
      return result;
    } catch (error) {
      console.error('❌ Error updating applicant status:', error);
      throw error;
    }
  }

  async updateApplicantScore(recordId: string, matchScore: number, matchSummary?: string, componentScores?: {technical: number, experience: number, cultural: number}): Promise<void> {
    try {
      console.log(`🔄 Updating applicant ${recordId} with comprehensive scores...`);
      console.log(`📊 Overall Score: ${matchScore}%`);
      
      const fields: any = {
        'Match Score': matchScore
      };

      if (matchSummary) {
        fields['Match Summary'] = matchSummary;
        console.log(`📝 Match Summary: ${matchSummary.substring(0, 50)}...`);
      }

      // Add component scores if provided
      if (componentScores) {
        fields['Technical Skills Score'] = componentScores.technical;
        fields['Experience Score'] = componentScores.experience;
        fields['Cultural Fit Score'] = componentScores.cultural;
        console.log(`🧩 Component Scores - Technical: ${componentScores.technical}%, Experience: ${componentScores.experience}%, Cultural: ${componentScores.cultural}%`);
      }

      console.log(`📤 Sending update to Airtable with fields:`, Object.keys(fields));

      const response = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}/${recordId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Airtable API Error: ${response.status} ${response.statusText}`);
        console.error(`❌ Response Body: ${errorText}`);
        throw new Error(`Failed to update applicant score: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully updated applicant ${recordId} with all scores`);
      console.log(`✅ Airtable response:`, result);
      return result;
    } catch (error) {
      console.error('❌ Error updating applicant score:', error);
      console.error('❌ Error details:', error.message);
      throw error;
    }
  }

  async getAllApplicantsIncludingProcessed(): Promise<ApplicantWithProfile[]> {
    try {
      console.log('Fetching ALL applicants from platojobapplications table (including accepted/denied)...');
      
      let allRecords: AirtableApplicantRecord[] = [];
      let offset: string | undefined;

      // Get all records regardless of status
      do {
        const params = new URLSearchParams();
        if (offset) params.append('offset', offset);
        
        const response = await fetch(
          `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
        }

        const data: AirtableApplicantResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);

      console.log(`Found ${allRecords.length} total applicants (including all statuses)`);

      // Transform records to our format
      const applicants: ApplicantWithProfile[] = allRecords.map(record => ({
        id: record.id,
        name: record.fields['Applicant Name'] || record.fields['Name'] || 'Unknown Applicant',
        userId: record.fields['User ID'] || '',
        email: record.fields['Email'] || '',
        phone: record.fields['Phone'] || '',
        jobTitle: record.fields['Job title'] || '',
        jobDescription: record.fields['Job description'] || '',
        companyName: record.fields['Company name'] || '',
        jobId: record.fields['Job ID'] || '',
        userProfile: record.fields['User profile'] || '',
        notes: record.fields['Notes'] || '',
        status: record.fields['Status'] || 'pending',
        applicationDate: record.createdTime
      }));

      return applicants;

    } catch (error) {
      console.error('Error fetching all applicants (including processed):', error);
      return [];
    }
  }

  async deleteApplicant(recordId: string): Promise<void> {
    try {
      console.log(`Deleting applicant record ${recordId}...`);
      
      const response = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}/${recordId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete applicant: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Successfully deleted applicant record ${recordId}`);
    } catch (error) {
      console.error('❌ Error deleting applicant:', error);
      throw error;
    }
  }
}

export const realApplicantsAirtableService = new RealApplicantsAirtableService("pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0");