import { storage } from './storage';

interface AirtableJobRecord {
  id: string;
  fields: {
    [key: string]: any;
  };
  createdTime: string;
}

interface AirtableJobResponse {
  records: AirtableJobRecord[];
  offset?: string;
}

export class JobPostingsAirtableService {
  private apiKey: string;
  private baseUrl: string = 'https://api.airtable.com/v0';
  private baseId: string = 'appCjIvd73lvp0oLf'; // platojobpostings base
  private tableName: string = 'Table 1'; // Default table name

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async syncJobPostingsToAirtable() {
    try {
      console.log('Starting job postings sync to Airtable...');
      
      // Get all active job postings from our database
      const allJobs = await this.getAllActiveJobs();
      
      // Get existing records from Airtable to avoid duplicates
      const existingRecords = await this.getExistingJobRecords();
      const existingJobIds = new Set(existingRecords.map(record => record.fields['Job ID']));
      
      // Filter out jobs that already exist in Airtable
      const newJobs = allJobs.filter(job => !existingJobIds.has(job.id.toString()));
      
      if (newJobs.length === 0) {
        console.log('No new jobs to sync to Airtable');
        return { synced: 0, total: allJobs.length };
      }
      
      // Create records for new jobs
      const recordsToCreate = newJobs.map(job => ({
        fields: {
          'Job ID': job.id.toString(),
          'Title': job.title || 'Untitled Position',
          'Company': job.companyName || 'Unknown Company',
          'Location': job.location || 'Remote',
          'Description': job.description || 'No description provided',
          'Requirements': job.requirements || 'No requirements specified',
          'Salary Range': job.salaryRange || 'Not specified',
          'Employment Type': job.employmentType || 'Full-time',
          'Technical Skills': Array.isArray(job.technicalSkills) ? job.technicalSkills.join(', ') : (job.technicalSkills || ''),
          'Status': job.status || 'active',
          'Posted Date': job.createdAt ? new Date(job.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          'Organization ID': job.organizationId?.toString() || ''
        }
      }));
      
      // Batch create records (Airtable allows up to 10 records per request)
      const batchSize = 10;
      let syncedCount = 0;
      
      for (let i = 0; i < recordsToCreate.length; i += batchSize) {
        const batch = recordsToCreate.slice(i, i + batchSize);
        
        const response = await fetch(`${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: batch
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to create job records in Airtable: ${response.status} ${response.statusText}`, errorText);
          continue;
        }
        
        const data = await response.json();
        syncedCount += data.records.length;
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`Successfully synced ${syncedCount} new job postings to Airtable`);
      return { synced: syncedCount, total: allJobs.length };
      
    } catch (error) {
      console.error('Error syncing job postings to Airtable:', error);
      throw error;
    }
  }
  
  private async getAllActiveJobs() {
    try {
      const { storage } = await import('./storage');
      
      // Use storage method to get all organizations first
      const { db } = await import('./db');
      const { jobs, organizations } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Simple query to get all active jobs with organization data
      const result = await db
        .select()
        .from(jobs)
        .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
        .where(eq(jobs.status, 'active'));
      
      // Map the result to flat structure
      const flattenedJobs = result.map(row => ({
        id: row.jobs.id,
        title: row.jobs.title,
        description: row.jobs.description,
        requirements: row.jobs.requirements,
        location: row.jobs.location,
        salaryRange: row.jobs.salaryRange,
        employmentType: row.jobs.employmentType,
        technicalSkills: row.jobs.technicalSkills,
        status: row.jobs.status,
        createdAt: row.jobs.createdAt,
        organizationId: row.jobs.organizationId,
        companyName: row.organizations.companyName
      }));
      
      return flattenedJobs;
      
    } catch (error) {
      console.error('Error fetching active jobs:', error);
      return [];
    }
  }
  
  private async getExistingJobRecords(): Promise<AirtableJobRecord[]> {
    try {
      let allRecords: AirtableJobRecord[] = [];
      let offset: string | undefined;
      
      do {
        const params = new URLSearchParams();
        if (offset) params.append('offset', offset);
        
        const response = await fetch(
          `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          }
        );
        
        if (!response.ok) {
          console.error(`Failed to fetch existing job records: ${response.status}`);
          break;
        }
        
        const data: AirtableJobResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
        
      } while (offset);
      
      return allRecords;
      
    } catch (error) {
      console.error('Error fetching existing job records:', error);
      return [];
    }
  }
  
  async discoverAirtableStructure() {
    try {
      console.log('Discovering Airtable structure for job postings...');
      
      // Try to get the first few records to understand the structure
      const response = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?maxRecords=3`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Job postings table structure:', JSON.stringify(data, null, 2));
        return data;
      } else {
        console.error('Failed to discover job postings structure:', response.status);
      }
    } catch (error) {
      console.error('Error discovering job postings structure:', error);
    }
  }
  
  setAirtableConfig(baseId: string, tableName: string = 'Table 1') {
    this.baseId = baseId;
    this.tableName = tableName;
  }

  async deleteJobPostingByJobId(jobId: number): Promise<void> {
    try {
      console.log(`Deleting job posting for job ${jobId} from platojobpostings table...`);
      
      let allRecords: AirtableJobRecord[] = [];
      let offset: string | undefined;
      
      // Get all records for this job
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

        const data: AirtableJobResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);

      if (allRecords.length === 0) {
        console.log(`No job posting found for job ${jobId}`);
        return;
      }

      // Delete records in batches (Airtable allows up to 10 records per request)
      const batchSize = 10;
      
      for (let i = 0; i < allRecords.length; i += batchSize) {
        const batch = allRecords.slice(i, i + batchSize);
        const recordIds = batch.map(record => record.id);
        
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
          throw new Error(`Failed to delete job posting: ${response.status} ${response.statusText}`);
        }
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < allRecords.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`Successfully deleted ${allRecords.length} job posting records for job ${jobId}`);
      
    } catch (error) {
      console.error('Error deleting job posting:', error);
      throw error;
    }
  }
}

export const jobPostingsAirtableService = new JobPostingsAirtableService("pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0");