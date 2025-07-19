import fetch from 'node-fetch';

const AIRTABLE_BASE_ID = 'app1u4N2W46jD43mP';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';

if (!AIRTABLE_API_KEY) {
  console.error('AIRTABLE_API_KEY environment variable is not set');
}

export class JobMatchesAirtableService {
  private baseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/platojobmatches`;

  async updateInterviewDetails(userId: string, jobTitle: string, interviewDateTime: string, interviewLink?: string) {
    try {
      console.log(`🔍 Looking for match: User ID "${userId}" + Job title "${jobTitle}"`);
      
      // First, find the record by User ID and Job title
      const searchUrl = `${this.baseUrl}?filterByFormula=AND({User ID}='${userId}',{Job title}='${jobTitle}')`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!searchResponse.ok) {
        throw new Error(`Failed to search platojobmatches: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json() as any;
      
      if (!searchData.records || searchData.records.length === 0) {
        console.error(`❌ No matching record found in platojobmatches for User ID "${userId}" and Job title "${jobTitle}"`);
        throw new Error(`No matching record found for User ID "${userId}" and Job title "${jobTitle}"`);
      }

      const recordId = searchData.records[0].id;
      console.log(`✅ Found matching record: ${recordId}`);

      // Update the record with interview details
      const updateData = {
        fields: {
          'Interview date&time': interviewDateTime,
          ...(interviewLink && { 'Interview Link': interviewLink })
        }
      };

      const updateResponse = await fetch(`${this.baseUrl}/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update interview details: ${updateResponse.status} ${updateResponse.statusText}`);
      }

      const updatedRecord = await updateResponse.json();
      console.log(`🎯 Successfully updated interview details for record ${recordId}`);
      return updatedRecord;

    } catch (error) {
      console.error('Error updating interview details in platojobmatches:', error);
      throw error;
    }
  }

  async createJobMatch(applicantData: any, jobData: any, companyName: string) {
    try {
      console.log(`📝 Creating job match record for applicant: ${applicantData.name}`);
      
      const jobMatchData = {
        fields: {
          'Name': applicantData.name || 'Unknown',
          'User ID': applicantData.userId || applicantData.id,
          'Job title': jobData.title,
          'Job Description': jobData.description || '',
          'Company name': companyName
        }
      };

      console.log('Job match data:', jobMatchData);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobMatchData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Airtable API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to create job match: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const createdRecord = await response.json();
      console.log(`✅ Successfully created job match record with ID: ${createdRecord.id}`);
      return createdRecord;
    } catch (error) {
      console.error('Error creating job match in platojobmatches:', error);
      throw error;
    }
  }

  async deleteFromApplicationsTable(applicantId: string) {
    try {
      console.log(`🗑️ Deleting applicant record ${applicantId} from platojobapplications...`);
      
      const applicationsUrl = `https://api.airtable.com/v0/appEYs1fTytFXoJ7x/platojobapplications/${applicantId}`;
      
      const response = await fetch(applicationsUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Airtable delete error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to delete applicant: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Successfully deleted applicant ${applicantId} from platojobapplications`);
      return true;
    } catch (error) {
      console.error('Error deleting applicant from platojobapplications:', error);
      throw error;
    }
  }

  async getJobMatches() {
    try {
      const response = await fetch(this.baseUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch job matches: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.records || [];
    } catch (error) {
      console.error('Error fetching job matches:', error);
      throw error;
    }
  }
}

export const jobMatchesService = new JobMatchesAirtableService();