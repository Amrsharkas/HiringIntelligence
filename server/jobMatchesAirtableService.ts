// Service for managing job matches in platojobmatches table
import fetch from 'node-fetch';

interface JobMatchRecord {
  "Name": string;
  "User ID": string;
  "Job title": string;
  "Job Description": string;
  "Company name": string;
}

class JobMatchesAirtableService {
  private baseUrl = 'https://api.airtable.com/v0';
  private baseId = 'app1u4N2W46jD43mP'; // platojobmatches base
  private tableName = 'Table 1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createJobMatch(
    name: string,
    userId: string,
    jobTitle: string,
    jobDescription: string,
    companyName: string
  ): Promise<void> {
    try {
      console.log(`Creating job match record for ${name}...`);
      
      const record: JobMatchRecord = {
        "Name": name,
        "User ID": userId,
        "Job title": jobTitle,
        "Job Description": jobDescription,
        "Company name": companyName
      };

      const response = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: record
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create job match: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully created job match record for ${name} (Record ID: ${result.id})`);
    } catch (error) {
      console.error('❌ Error creating job match:', error);
      throw error;
    }
  }

  async deleteJobMatchesByJobId(jobId: string): Promise<void> {
    try {
      console.log(`Deleting job matches for job ID ${jobId}...`);
      
      // First, find all matches for this job
      const params = new URLSearchParams();
      params.append('filterByFormula', `SEARCH("${jobId}", {Job title}) > 0`);
      
      const getResponse = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!getResponse.ok) {
        throw new Error(`Failed to fetch job matches: ${getResponse.status} ${getResponse.statusText}`);
      }

      const data = await getResponse.json();
      
      if (data.records && data.records.length > 0) {
        console.log(`Found ${data.records.length} job matches to delete`);
        
        // Delete each record
        for (const record of data.records) {
          const deleteResponse = await fetch(
            `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}/${record.id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (!deleteResponse.ok) {
            console.error(`Failed to delete job match record ${record.id}`);
          } else {
            console.log(`Deleted job match record ${record.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting job matches:', error);
      throw error;
    }
  }
}

// Create service instance
export const jobMatchesAirtableService = new JobMatchesAirtableService('pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0');