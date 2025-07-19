// Service for handling job postings from platojobpostings table
import fetch from 'node-fetch';

interface AirtableJobRecord {
  id: string;
  fields: {
    'Job title'?: string;
    'Job ID'?: string;
    'Job description'?: string;
    'Date Posted'?: string;
    'Company'?: string;
    'Job type'?: string;
    'Salary'?: string;
    'Location'?: string;
  };
  createdTime: string;
}

interface AirtableJobResponse {
  records: AirtableJobRecord[];
  offset?: string;
}

interface JobPostingData {
  id: string;
  title: string;
  jobId: string;
  description: string;
  datePosted: string;
  companyName: string;
  jobType: string;
  salary: string;
  location: string;
}

export class JobPostingsAirtableService {
  private baseUrl = 'https://api.airtable.com/v0';
  private baseId = 'appCjIvd73lvp0oLf'; // platojobpostings base
  private tableName = 'Table 1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getJobByJobId(jobId: string): Promise<JobPostingData | null> {
    try {
      console.log(`Fetching job ${jobId} from platojobpostings table...`);
      
      // Filter by Job ID
      const params = new URLSearchParams();
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

      const data: AirtableJobResponse = await response.json();
      
      if (!data.records || data.records.length === 0) {
        console.log(`No job found with Job ID: ${jobId}`);
        return null;
      }

      const record = data.records[0];
      
      // Transform record to our format
      const jobPosting: JobPostingData = {
        id: record.id,
        title: record.fields['Job title'] || 'Unknown Job',
        jobId: record.fields['Job ID'] || '',
        description: record.fields['Job description'] || '',
        datePosted: record.fields['Date Posted'] || '',
        companyName: record.fields['Company'] || '',
        jobType: record.fields['Job type'] || '',
        salary: record.fields['Salary'] || '',
        location: record.fields['Location'] || ''
      };

      console.log(`Found job posting: ${jobPosting.title} at ${jobPosting.companyName}`);
      return jobPosting;

    } catch (error) {
      console.error('Error fetching job posting from Airtable:', error);
      throw error;
    }
  }

  async getAllJobPostings(): Promise<JobPostingData[]> {
    try {
      console.log('Fetching all job postings from platojobpostings table...');
      
      let allRecords: AirtableJobRecord[] = [];
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

        const data: AirtableJobResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);

      console.log(`Found ${allRecords.length} job postings`);

      // Transform records to our format
      const jobPostings: JobPostingData[] = allRecords.map(record => ({
        id: record.id,
        title: record.fields['Job title'] || 'Unknown Job',
        jobId: record.fields['Job ID'] || '',
        description: record.fields['Job description'] || '',
        datePosted: record.fields['Date Posted'] || '',
        companyName: record.fields['Company'] || '',
        jobType: record.fields['Job type'] || '',
        salary: record.fields['Salary'] || '',
        location: record.fields['Location'] || ''
      }));

      return jobPostings;

    } catch (error) {
      console.error('Error fetching job postings from Airtable:', error);
      return [];
    }
  }

  // Sync method for periodic syncing (placeholder for now)
  async syncJobPostingsToAirtable(): Promise<void> {
    try {
      console.log('Syncing job postings to Airtable...');
      // This is a placeholder - implement actual sync logic as needed
      const jobPostings = await this.getAllJobPostings();
      console.log(`Successfully synced ${jobPostings.length} job postings`);
    } catch (error) {
      console.error('Error syncing job postings to Airtable:', error);
      throw error;
    }
  }
}

// Export an instance with environment-based API key
const airtableApiKey = process.env.AIRTABLE_API_KEY || 'placeholder-key';
export const jobPostingsAirtableService = new JobPostingsAirtableService(airtableApiKey);