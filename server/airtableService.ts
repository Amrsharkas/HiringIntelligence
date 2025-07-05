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
}

export const airtableService = new AirtableService("pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0");