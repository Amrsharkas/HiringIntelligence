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
    'Employer Questions'?: string;
    'AI Prompt'?: string;
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
  employerQuestions?: string[];
  aiPrompt?: string;
}

export class JobPostingsAirtableService {
  private baseUrl = 'https://api.airtable.com/v0';
  private baseId = 'appCjIvd73lvp0oLf'; // platojobpostings base ID
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

  // Add/update a job posting in Airtable - returns Airtable record ID
  async addJobToAirtable(jobData: {
    jobId: string;
    title: string;
    description: string;
    location: string;
    salary?: string;
    company: string;
    employerQuestions?: string[];
    aiPrompt?: string;
  }): Promise<string> {
    try {
      console.log(`📤 Adding job ${jobData.jobId} to Airtable...`);
      
      // Format employer questions as multiline string - combine all into single text block with numbering
      const employerQuestionsText = jobData.employerQuestions && jobData.employerQuestions.length > 0
        ? jobData.employerQuestions.map((q, index) => `${index + 1}. ${q}`).join('\n')
        : '';

      const record = {
        fields: {
          'Job title': jobData.title,
          'Job ID': jobData.jobId,
          'Job description': jobData.description,
          'Location': jobData.location,
          'Salary': jobData.salary || '',
          'Company': jobData.company,
          'Date Posted': new Date().toISOString().split('T')[0],
          'Job type': 'Full-time', // Default value
          'Employer Questions': employerQuestionsText,
          'AI Prompt': jobData.aiPrompt || '',
        }
      };

      console.log(`📤 Sending payload to Airtable for Job ID ${jobData.jobId}:`, JSON.stringify(record, null, 2));
      console.log(`📊 Employer Questions being sent: "${employerQuestionsText || '(empty)'}"`);

      const response = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record)
        }
      );

      const responseText = await response.text();
      console.log(`📥 Airtable response for Job ID ${jobData.jobId} (${response.status}):`, responseText);

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText} - ${responseText}`);
      }

      const result = JSON.parse(responseText);
      console.log(`✅ Successfully added job ${jobData.jobId} to Airtable with record ID: ${result.id}`);
      
      return result.id; // Return the Airtable record ID

    } catch (error) {
      console.error('Error adding job to Airtable:', error);
      throw error;
    }
  }

  // Sync method for periodic syncing - fetches from database and syncs to Airtable
  async syncJobPostingsToAirtable(): Promise<void> {
    try {
      console.log('Syncing job postings to Airtable...');
      
      // Import database and schema
      const { db } = await import('./db');
      const { jobs, organizations } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Fetch all active jobs from database with organization details
      const activeJobs = await db
        .select({
          job: jobs,
          organization: organizations
        })
        .from(jobs)
        .leftJoin(organizations, eq(jobs.organizationId, organizations.id))
        .where(eq(jobs.is_active, true));
      
      console.log(`Found ${activeJobs.length} job postings`);
      
      if (activeJobs.length === 0) {
        console.log('No active job postings to sync');
        return;
      }
      
      // Get existing jobs from Airtable to avoid duplicates
      const existingJobs = await this.getAllJobPostings();
      const existingJobIds = new Set(existingJobs.map(job => job.jobId));
      
      let syncedCount = 0;
      
      for (const result of activeJobs) {
        const job = result.job;
        const organization = result.organization;
        const jobId = job.id.toString();
        
        // Skip if job already exists in Airtable
        if (existingJobIds.has(jobId)) {
          console.log(`Job ${jobId} already exists in Airtable, checking for updates...`);
          await this.updateJobInAirtable(jobId, {
            title: job.title,
            description: `${job.description}\n\nRequirements:\n${job.requirements}`,
            location: job.location,
            salary: job.salaryRange || '',
            company: organization?.companyName || 'Unknown Company',
            employerQuestions: job.employerQuestions || [],
            aiPrompt: job.aiPrompt || ''
          });
          continue;
        }
        
        // Add new job to Airtable
        await this.addJobToAirtable({
          jobId: jobId,
          title: job.title,
          description: `${job.description}\n\nRequirements:\n${job.requirements}`,
          location: job.location,
          salary: job.salaryRange || '',
          company: organization?.companyName || 'Unknown Company',
          employerQuestions: job.employerQuestions || [],
          aiPrompt: job.aiPrompt || ''
        });
        
        syncedCount++;
        console.log(`✅ Synced job ${jobId}: ${job.title}`);
      }
      
      console.log(`Successfully synced ${syncedCount} job postings to Airtable`);
      
    } catch (error) {
      console.error('Error syncing job postings to Airtable:', error);
      throw error;
    }
  }

  // Update existing job in Airtable - returns record ID
  async updateJobInAirtable(jobId: string, jobData: {
    title: string;
    description: string;
    location: string;
    salary?: string;
    company: string;
    employerQuestions?: string[];
    aiPrompt?: string;
  }): Promise<string> {
    try {
      // Find the record ID for this job
      const params = new URLSearchParams();
      params.append('filterByFormula', `{Job ID} = "${jobId}"`);
      
      const searchResponse = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!searchResponse.ok) {
        throw new Error(`Failed to search for job: ${searchResponse.status}`);
      }

      const searchData: AirtableJobResponse = await searchResponse.json();
      
      if (!searchData.records || searchData.records.length === 0) {
        console.log(`Job ${jobId} not found in Airtable, will add as new`);
        return this.addJobToAirtable({ jobId, ...jobData });
      }

      const recordId = searchData.records[0].id;
      
      // Format employer questions
      const employerQuestionsText = jobData.employerQuestions && jobData.employerQuestions.length > 0
        ? jobData.employerQuestions.map((q, index) => `${index + 1}. ${q}`).join('\n')
        : '';

      const updateData = {
        fields: {
          'Job title': jobData.title,
          'Job description': jobData.description,
          'Location': jobData.location,
          'Salary': jobData.salary || '',
          'Company': jobData.company,
          'Employer Questions': employerQuestionsText,
          'AI Prompt': jobData.aiPrompt || '',
        }
      };

      console.log(`📤 Sending update payload to Airtable for Job ID ${jobId}:`, JSON.stringify(updateData, null, 2));
      console.log(`📊 Employer Questions being updated: "${employerQuestionsText || '(empty)'}"`);

      const updateResponse = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}/${recordId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      const responseText = await updateResponse.text();
      console.log(`📥 Airtable update response for Job ID ${jobId} (${updateResponse.status}):`, responseText);

      if (!updateResponse.ok) {
        throw new Error(`Failed to update job: ${updateResponse.status} ${updateResponse.statusText} - ${responseText}`);
      }

      const result = JSON.parse(responseText);
      console.log(`✅ Successfully updated job ${jobId} in Airtable with record ID: ${result.id}`);
      
      return result.id; // Return the record ID

    } catch (error) {
      console.error(`Error updating job ${jobId} in Airtable:`, error);
      throw error;
    }
  }

  // Delete job posting by Airtable record ID
  async deleteJobByRecordId(recordId: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting job from Airtable with record ID: ${recordId}`);
      
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
        throw new Error(`Failed to delete job from Airtable: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Successfully deleted job with record ID ${recordId} from Airtable`);

    } catch (error) {
      console.error(`❌ Error deleting job with record ID ${recordId} from Airtable:`, error);
      throw error;
    }
  }
}

// Export an instance with the provided API key
const airtableApiKey = process.env.AIRTABLE_API_KEY || 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
export const jobPostingsAirtableService = new JobPostingsAirtableService(airtableApiKey);