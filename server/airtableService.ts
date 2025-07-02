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

  async getAllCandidateProfiles(baseId: string, tableName: string = 'Candidates'): Promise<any[]> {
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

      // Transform Airtable records to candidate profiles
      return allRecords.map(record => ({
        id: record.id,
        name: record.fields.Name || record.fields.FullName || record.fields.name || 'Unknown',
        email: record.fields.Email || record.fields.email,
        phone: record.fields.Phone || record.fields.phone,
        skills: this.parseSkills(record.fields.Skills || record.fields.skills),
        experience: record.fields.Experience || record.fields.experience || record.fields.WorkExperience,
        education: record.fields.Education || record.fields.education,
        summary: record.fields.Summary || record.fields.Bio || record.fields.summary,
        previousRole: record.fields.PreviousRole || record.fields['Previous Role'] || record.fields.currentRole,
        yearsExperience: record.fields.YearsExperience || record.fields['Years Experience'] || record.fields.yearsOfExperience,
        location: record.fields.Location || record.fields.location,
        availability: record.fields.Availability || record.fields.availability || true,
        salaryExpectation: record.fields.SalaryExpectation || record.fields['Salary Expectation'],
        interviewScore: record.fields.InterviewScore || record.fields['Interview Score'],
        technicalSkills: this.parseSkills(record.fields.TechnicalSkills || record.fields['Technical Skills']),
        softSkills: this.parseSkills(record.fields.SoftSkills || record.fields['Soft Skills']),
        portfolio: record.fields.Portfolio || record.fields.portfolio,
        linkedin: record.fields.LinkedIn || record.fields.linkedin,
        github: record.fields.GitHub || record.fields.github,
        notes: record.fields.Notes || record.fields.notes,
        createdTime: record.createdTime,
        // Include all original fields for comprehensive analysis
        rawData: record.fields,
      }));

    } catch (error) {
      console.error('Error fetching candidates from Airtable:', error);
      throw error;
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
}

export const airtableService = new AirtableService("pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0");