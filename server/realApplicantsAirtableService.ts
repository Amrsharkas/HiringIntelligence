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
        
        // Filter by Job ID and only show pending applicants (not accepted or denied)
        params.append('filterByFormula', `AND({Job ID} = "${jobId}", OR({Status} = "", {Status} = "pending", {Status} = BLANK()))`);
        
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

      // Get all pending records (not accepted or denied)
      do {
        const params = new URLSearchParams();
        if (offset) params.append('offset', offset);
        
        // Filter to only show pending applicants
        params.append('filterByFormula', `OR({Status} = "", {Status} = "pending", {Status} = BLANK())`);
        
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
        status: record.fields['Status'] || 'pending',
        applicationDate: record.createdTime
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
        jobTitle: record.fields['Job title'] || '',
        jobDescription: record.fields['Job description'] || '',
        companyName: record.fields['Company name'] || '',
        jobId: record.fields['Job ID'] || '',
        userProfile: record.fields['User profile'] || '',
        notes: record.fields['Notes'] || '',
        status: record.fields['Status'] || 'pending',
        applicationDate: record.createdTime
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