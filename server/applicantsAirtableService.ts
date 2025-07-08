interface AirtableApplicantRecord {
  id: string;
  fields: {
    [key: string]: any;
  };
  createdTime: string;
}

interface AirtableApplicantResponse {
  records: AirtableApplicantRecord[];
  offset?: string;
}

export class ApplicantsAirtableService {
  private apiKey: string;
  private baseUrl: string = 'https://api.airtable.com/v0';
  private baseId: string = 'appEYs1fTytFXoJ7x'; // platojobapplications base
  private tableName: string = 'Table 1'; // Default table name

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getApplicantsForJob(jobId: number): Promise<any[]> {
    try {
      console.log(`Fetching applicants for job ${jobId} from Airtable...`);
      
      let allRecords: AirtableApplicantRecord[] = [];
      let offset: string | undefined;
      
      do {
        const params = new URLSearchParams();
        if (offset) params.append('offset', offset);
        
        // Filter by Job ID field
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

      // Transform records to applicant format
      const applicants = allRecords.map(record => ({
        id: record.id,
        name: record.fields['Name'] || record.fields['Applicant Name'] || 'Unknown Applicant',
        email: record.fields['Email'] || record.fields['Email Address'] || '',
        phone: record.fields['Phone'] || record.fields['Phone Number'] || '',
        resume: record.fields['Resume'] || record.fields['Resume URL'] || '',
        coverLetter: record.fields['Cover Letter'] || '',
        applicationDate: record.fields['Application Date'] || record.createdTime,
        status: record.fields['Status'] || 'pending',
        jobId: record.fields['Job ID'],
        jobTitle: record.fields['Job Title'] || '',
        jobDescription: record.fields['Job Description'] || '',
        companyName: record.fields['Company Name'] || '',
        experience: record.fields['Experience'] || '',
        skills: record.fields['Skills'] || '',
        location: record.fields['Location'] || '',
        salaryExpectation: record.fields['Salary Expectation'] || '',
        notes: record.fields['Notes'] || ''
      }));

      console.log(`Found ${applicants.length} applicants for job ${jobId}`);
      return applicants;
      
    } catch (error) {
      console.error('Error fetching applicants from Airtable:', error);
      throw error;
    }
  }

  async getAllApplicantsByOrganization(organizationId: number): Promise<any[]> {
    try {
      console.log(`Fetching all applicants for organization ${organizationId}...`);
      
      // First get all jobs for this organization
      const { storage } = await import('./storage');
      const jobs = await storage.getJobsByOrganization(organizationId);
      
      if (jobs.length === 0) {
        return [];
      }
      
      // Get applicants for all jobs
      const jobIds = jobs.map(job => job.id);
      const allApplicants = [];
      
      for (const jobId of jobIds) {
        const applicants = await this.getApplicantsForJob(jobId);
        allApplicants.push(...applicants);
      }
      
      return allApplicants;
      
    } catch (error) {
      console.error('Error fetching all applicants:', error);
      throw error;
    }
  }

  async updateApplicantStatus(applicantId: string, status: 'pending' | 'accepted' | 'declined'): Promise<void> {
    try {
      console.log(`Updating applicant ${applicantId} status to ${status}...`);
      
      const response = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}/${applicantId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'Status': status,
              'Reviewed At': new Date().toISOString()
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update applicant status: ${response.status} ${response.statusText}`);
      }
      
      console.log(`Successfully updated applicant ${applicantId} status to ${status}`);
      
    } catch (error) {
      console.error('Error updating applicant status:', error);
      throw error;
    }
  }

  async deleteApplicantsByJobId(jobId: number): Promise<void> {
    try {
      console.log(`Deleting all applicants for job ${jobId}...`);
      
      // First get all applicants for this job
      const applicants = await this.getApplicantsForJob(jobId);
      
      if (applicants.length === 0) {
        console.log(`No applicants found for job ${jobId}`);
        return;
      }
      
      // Delete applicants in batches (Airtable allows up to 10 records per request)
      const batchSize = 10;
      
      for (let i = 0; i < applicants.length; i += batchSize) {
        const batch = applicants.slice(i, i + batchSize);
        const recordIds = batch.map(applicant => applicant.id);
        
        const params = new URLSearchParams();
        recordIds.forEach(id => params.append('records[]', id));
        
        const response = await fetch(
          `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?${params}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete applicants: ${response.status} ${response.statusText}`);
        }
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < applicants.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`Successfully deleted ${applicants.length} applicants for job ${jobId}`);
      
    } catch (error) {
      console.error('Error deleting applicants:', error);
      throw error;
    }
  }

  async discoverAirtableStructure() {
    try {
      console.log('Discovering Airtable structure for applicants...');
      
      const response = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?maxRecords=1`,
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
      
      if (data.records.length > 0) {
        console.log('Sample applicant record fields:', Object.keys(data.records[0].fields));
        return Object.keys(data.records[0].fields);
      }
      
      return [];
      
    } catch (error) {
      console.error('Error discovering Airtable structure:', error);
      throw error;
    }
  }

  setAirtableConfig(baseId: string, tableName: string = 'Table 1') {
    this.baseId = baseId;
    this.tableName = tableName;
    console.log(`Airtable applicants config updated: Base ID = ${baseId}, Table = ${tableName}`);
  }
}

export const applicantsAirtableService = new ApplicantsAirtableService("pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0");