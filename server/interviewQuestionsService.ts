// Service for managing custom interview questions via platojobpostings table
import fetch from 'node-fetch';

interface AirtableJobRecord {
  id: string;
  fields: {
    'Job title': string;
    'Job ID': string;
    'Interview Questions'?: string[];
  };
}

interface AirtableJobResponse {
  records: AirtableJobRecord[];
  offset?: string;
}

interface JobWithQuestions {
  airtableId: string;
  jobId: string;
  jobTitle: string;
  interviewQuestions: string[];
}

class InterviewQuestionsService {
  private baseUrl = 'https://api.airtable.com/v0';
  private baseId = 'appCjIvd73lvp0oLf'; // platojobpostings base
  private tableName = 'Table 1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getAllJobs(): Promise<JobWithQuestions[]> {
    try {
      console.log('Fetching all jobs from platojobpostings for interview questions management...');
      
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

      console.log(`Found ${allRecords.length} jobs in platojobpostings table`);

      return allRecords.map(record => ({
        airtableId: record.id,
        jobId: record.fields['Job ID'],
        jobTitle: record.fields['Job title'],
        interviewQuestions: record.fields['Interview Questions'] || []
      }));
    } catch (error) {
      console.error('Error fetching jobs for interview questions:', error);
      throw error;
    }
  }

  async getInterviewQuestions(jobId: string): Promise<string[]> {
    try {
      console.log(`Fetching interview questions for job ${jobId}...`);
      
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
      
      if (data.records.length === 0) {
        console.log(`No job found with ID ${jobId}`);
        return [];
      }

      const questions = data.records[0].fields['Interview Questions'] || [];
      console.log(`Found ${questions.length} interview questions for job ${jobId}`);
      return questions;
    } catch (error) {
      console.error('Error fetching interview questions:', error);
      throw error;
    }
  }

  async updateInterviewQuestions(jobId: string, questions: string[]): Promise<void> {
    try {
      console.log(`Updating interview questions for job ${jobId}...`);
      
      // First find the record
      const params = new URLSearchParams();
      params.append('filterByFormula', `{Job ID} = "${jobId}"`);
      
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
        throw new Error(`Airtable API error: ${getResponse.status} ${getResponse.statusText}`);
      }

      const getData: AirtableJobResponse = await getResponse.json();
      
      if (getData.records.length === 0) {
        throw new Error(`No job found with ID ${jobId}`);
      }

      const recordId = getData.records[0].id;

      // Update the record with new questions
      const updateResponse = await fetch(
        `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}/${recordId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'Interview Questions': questions
            }
          })
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update interview questions: ${updateResponse.status} ${updateResponse.statusText}`);
      }

      console.log(`Successfully updated interview questions for job ${jobId}`);
    } catch (error) {
      console.error('Error updating interview questions:', error);
      throw error;
    }
  }
}

// Create service instance
export const interviewQuestionsService = new InterviewQuestionsService('pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0');