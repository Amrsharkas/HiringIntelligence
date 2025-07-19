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
  applicationDate: string;
  matchScore?: number;
  matchSummary?: string;
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
        
        // Filter by Job ID
        params.append('filterByFormula', `{Job ID} = "${jobId}"`);
        
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
        applicationDate: record.createdTime
      }));

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

      // Get all records
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

      console.log(`Found ${allRecords.length} total applicants`);

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
        applicationDate: record.createdTime
      }));

      return applicants;

    } catch (error) {
      console.error('Error fetching all applicants:', error);
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