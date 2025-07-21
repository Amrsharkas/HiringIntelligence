interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: any;
  };
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

export class AirtableService {
  private apiKey: string;
  private baseUrl: string = 'https://api.airtable.com/v0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Get complete user profile from platouserprofiles table
  async getCompleteUserProfile(userId: string): Promise<any> {
    try {
      const baseId = 'app3tA4UpKQCT2s17'; // platouserprofiles base - CORRECTED
      const tableName = 'platouserprofiles';
      
      // Filter by User ID - try multiple field name variations
      const filterFormula = `OR({User ID} = "${userId}", {UserID} = "${userId}", {User id} = "${userId}", {user id} = "${userId}")`;
      const url = `${this.baseUrl}/${baseId}/${tableName}?filterByFormula=${encodeURIComponent(filterFormula)}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data: AirtableResponse = await response.json();
      
      if (data.records.length === 0) {
        return null;
      }

      const record = data.records[0];
      return {
        id: record.id,
        userId: userId,
        name: record.fields.Name || record.fields.name || 'Unknown',
        email: record.fields.Email || record.fields.email || null,
        phone: record.fields.Phone || record.fields.phone || null,
        location: record.fields.Location || record.fields.location || null,
        userProfile: record.fields['User profile'] || record.fields['user profile'] || '',
        technicalAnalysis: record.fields['Technical Analysis'] || record.fields['technical analysis'] || '',
        personalAnalysis: record.fields['Personal Analysis'] || record.fields['personal analysis'] || '',
        professionalAnalysis: record.fields['Professional Analysis'] || record.fields['professional analysis'] || '',
        technicalScore: record.fields['Technical Score'] || record.fields['technical score'] || 0,
        personalScore: record.fields['Personal Score'] || record.fields['personal score'] || 0,
        professionalScore: record.fields['Professional Score'] || record.fields['professional score'] || 0,
        overallScore: record.fields['Overall Score'] || record.fields['overall score'] || 0,
        resume: record.fields.Resume || record.fields.resume || null,
        portfolioLink: record.fields['Portfolio Link'] || record.fields['portfolio link'] || null,
        linkedinProfile: record.fields['LinkedIn Profile'] || record.fields['linkedin profile'] || null,
        githubProfile: record.fields['GitHub Profile'] || record.fields['github profile'] || null,
        salaryExpectation: record.fields['Salary Expectation'] || record.fields['salary expectation'] || null,
        availabilityDate: record.fields['Availability Date'] || record.fields['availability date'] || null,
        workPreference: record.fields['Work Preference'] || record.fields['work preference'] || null,
        yearsExperience: record.fields['Years Experience'] || record.fields['years experience'] || null,
        education: record.fields.Education || record.fields.education || null,
        certifications: record.fields.Certifications || record.fields.certifications || null,
        skills: record.fields.Skills || record.fields.skills || null,
        experience: record.fields.Experience || record.fields.experience || null,
        languages: record.fields.Languages || record.fields.languages || null,
        interests: record.fields.Interests || record.fields.interests || null,
        coverLetter: record.fields['Cover Letter'] || record.fields['cover letter'] || null,
        createdTime: record.createdTime,
        rawData: record.fields,
      };

    } catch (error) {
      console.error('Error fetching complete user profile from Airtable:', error);
      throw error;
    }
  }

  async getAllCandidateProfiles(baseId: string, tableName: string = 'Table 1'): Promise<any[]> {
    try {
      let allRecords: AirtableRecord[] = [];
      let offset: string | undefined;

      do {
        const url = `${this.baseUrl}/${baseId}/${tableName}${offset ? `?offset=${offset}` : ''}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
        }

        const data: AirtableResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;

      } while (offset);

      // Filter out empty records and transform to candidate profiles
      return allRecords
        .filter(record => Object.keys(record.fields).length > 0) // Only records with data
        .map(record => {
          const userProfile = record.fields['User profile'] || record.fields['user profile'] || '';
          
          return {
            id: record.id,
            name: record.fields.Name || record.fields.name || 'Unknown',
            email: record.fields.Email || record.fields.email || null,
            userId: record.fields['User ID'] || record.fields['user id'] || record.fields['userId'] || null,
            userProfile: userProfile,
            // Extract structured data from the user profile text
            location: this.extractFromProfile(userProfile, 'location'),
            background: this.extractFromProfile(userProfile, 'background'),
            skills: this.extractFromProfile(userProfile, 'skills'),
            interests: this.extractFromProfile(userProfile, 'interests'),
            experience: this.extractFromProfile(userProfile, 'experience'),
            createdTime: record.createdTime,
            // Keep all original fields for AI analysis
            rawData: record.fields,
          };
        });

    } catch (error) {
      console.error('Error fetching candidates from Airtable:', error);
      throw error;
    }
  }

  private extractFromProfile(profile: string, field: string): string {
    if (!profile) return '';
    
    const lines = profile.split('\n').map(line => line.trim());
    
    switch (field.toLowerCase()) {
      case 'location':
        const locationLine = lines.find(line => line.toLowerCase().startsWith('location:'));
        return locationLine ? locationLine.replace(/^location:\s*/i, '').trim() : '';
      
      case 'background':
        const backgroundLine = lines.find(line => line.toLowerCase().startsWith('background:'));
        return backgroundLine ? backgroundLine.replace(/^background:\s*/i, '').trim() : '';
      
      case 'skills':
        const skillsIndex = lines.findIndex(line => line.toLowerCase().includes('skills:'));
        if (skillsIndex !== -1) {
          // Get everything after "Skills:" until the next section or end
          let skillsText = '';
          for (let i = skillsIndex; i < lines.length; i++) {
            const line = lines[i];
            if (i === skillsIndex) {
              // First line with "Skills:"
              skillsText += line.replace(/^.*skills:\s*/i, '').trim();
            } else if (line.includes(':') && !line.toLowerCase().includes('skills')) {
              // Hit another section, stop
              break;
            } else {
              // Continuation of skills section
              skillsText += ' ' + line.trim();
            }
          }
          return skillsText.trim();
        }
        return '';
      
      case 'interests':
        const interestsLine = lines.find(line => line.toLowerCase().includes('interests:'));
        return interestsLine ? interestsLine.replace(/^.*interests:\s*/i, '').trim() : '';
      
      case 'experience':
        // Look for years of experience mentioned in background or elsewhere
        const expMatch = profile.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
        return expMatch ? expMatch[1] + ' years' : '';
      
      default:
        return '';
    }
  }

  private parseSkills(skillsField: any): string[] {
    if (!skillsField) return [];
    
    if (Array.isArray(skillsField)) {
      return skillsField;
    }
    
    if (typeof skillsField === 'string') {
      // Handle comma-separated, semicolon-separated, or newline-separated skills
      return skillsField
        .split(/[,;\n]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
    }
    
    return [];
  }

  // Get Airtable bases (to help identify the correct base)
  async getBases(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/meta/bases`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.bases || [];
    } catch (error) {
      console.error('Error fetching Airtable bases:', error);
      throw error;
    }
  }

  // Get tables in a base (to help identify the correct table)
  async getTables(baseId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/meta/bases/${baseId}/tables`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.tables || [];
    } catch (error) {
      console.error('Error fetching Airtable tables:', error);
      throw error;
    }
  }

  // Create a new job match record when candidate is accepted
  async createJobMatch(
    candidateName: string,
    userId: string,
    jobTitle: string,
    jobDescription: string,
    companyName: string,
    jobId?: string | number, // Add jobId parameter
    baseId: string = 'app1u4N2W46jD43mP', // platojobmatches base ID
    tableName: string = 'Table 1'
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/${baseId}/${tableName}`;
      
      console.log(`🔄 Creating job match record at: ${url}`);
      console.log(`📝 Data being sent:`, {
        'Name': candidateName,
        'User ID': userId,
        'Job title': jobTitle,
        'Job Description': jobDescription,
        'Company name': companyName,
        'Job ID': jobId?.toString() || '',
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'Name': candidateName,
            'User ID': userId,
            'Job title': jobTitle,
            'Job Description': jobDescription, // Note: capital D for Description
            'Company name': companyName, // Note: lowercase 'n' for name
            'Job ID': jobId?.toString() || '', // Add Job ID field
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Airtable API Error Response: ${errorText}`);
        throw new Error(`Airtable job match creation error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log(`✅ Successfully created job match record:`, responseData);
    } catch (error) {
      console.error('❌ Error creating job match in Airtable:', error);
      throw error;
    }
  }

  async deleteJobMatchesByJobId(jobId: number): Promise<void> {
    try {
      console.log(`Deleting job matches for job ${jobId} from platojobmatches table...`);
      
      const baseId = 'app1u4N2W46jD43mP'; // platojobmatches base
      const tableName = 'Table 1';
      
      let allRecords: AirtableRecord[] = [];
      let offset: string | undefined;
      
      // Get all records for this job
      do {
        const params = new URLSearchParams();
        if (offset) params.append('offset', offset);
        
        // Filter by Job ID (this will be added to the table)
        params.append('filterByFormula', `{Job ID} = "${jobId}"`);
        
        const response = await fetch(
          `${this.baseUrl}/${baseId}/${encodeURIComponent(tableName)}?${params}`,
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

        const data: AirtableResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);

      if (allRecords.length === 0) {
        console.log(`No job matches found for job ${jobId}`);
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
          `${this.baseUrl}/${baseId}/${encodeURIComponent(tableName)}?${params}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete job matches: ${response.status} ${response.statusText}`);
        }
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < allRecords.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`Successfully deleted ${allRecords.length} job matches for job ${jobId}`);
      
    } catch (error) {
      console.error('Error deleting job matches:', error);
      throw error;
    }
  }
}

export const airtableService = new AirtableService("pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0");