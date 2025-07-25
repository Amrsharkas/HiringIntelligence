// Service for handling user profiles from platouserprofiles table
import fetch from 'node-fetch';

interface UserProfileRecord {
  id: string;
  fields: {
    'Name'?: string;
    'UserID'?: string;
    'User ID'?: string;
    'Age'?: number;
    'Location'?: string;
    'Email'?: string;
    'Phone'?: string;
    'Professional Summary'?: string;
    'Work Experience'?: string;
    'Education'?: string;
    'Skills'?: string;
    'Additional Information'?: string;
    'Interview Score'?: number;
    'Salary Expectation'?: string;
    'Experience Level'?: string;
    'Profile Picture'?: string;
  };
  createdTime: string;
}

interface UserProfileResponse {
  records: UserProfileRecord[];
  offset?: string;
}

interface UserProfile {
  id: string;
  name: string;
  userId: string;
  age?: number;
  location?: string;
  email?: string;
  phone?: string;
  professionalSummary?: string;
  workExperience?: string;
  education?: string;
  skills?: string;
  additionalInfo?: string;
  interviewScore?: number;
  salaryExpectation?: string;
  experienceLevel?: string;
  profilePicture?: string;
  createdAt: string;
}

class UserProfilesAirtableService {
  private baseUrl = 'https://api.airtable.com/v0';
  private baseId = 'app3tA4UpKQCT2s17'; // platouserprofiles base
  private tableName = 'Table 1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getUserProfileByUserId(userId: string): Promise<UserProfile | null> {
    try {
      console.log(`Fetching user profile for user ID: ${userId} from platouserprofiles table...`);
      
      if (!userId || userId.trim() === '') {
        console.log('❌ Empty user ID provided');
        return null;
      }

      // Try different field name variations for User ID
      let params = new URLSearchParams();
      params.append('filterByFormula', `{UserID} = "${userId}"`);
      
      let response = await fetch(
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

      let data: UserProfileResponse = await response.json();
      
      // If no match found, try alternative field name
      if (data.records.length === 0) {
        console.log(`❌ No profile found with UserID field, trying User ID field...`);
        params = new URLSearchParams();
        params.append('filterByFormula', `{User ID} = "${userId}"`);
        
        response = await fetch(
          `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          data = await response.json();
        }
      }
      
      if (data.records.length === 0) {
        console.log(`❌ No user profile found for user ID: ${userId}`);
        return null;
      }

      const record = data.records[0];
      console.log(`✅ Found user profile for ${record.fields['Name'] || 'Unknown'}`);
      console.log('🔍 Available profile fields:', Object.keys(record.fields));

      // Transform record to our format
      const userProfile: UserProfile = {
        id: record.id,
        name: record.fields['Name'] || 'Unknown User',
        userId: record.fields['UserID'] || record.fields['User ID'] || '',
        age: record.fields['Age'] || undefined,
        location: record.fields['Location'] || undefined,
        email: record.fields['Email'] || undefined,
        phone: record.fields['Phone'] || undefined,
        professionalSummary: record.fields['Professional Summary'] || undefined,
        workExperience: record.fields['Work Experience'] || undefined,
        education: record.fields['Education'] || undefined,
        skills: record.fields['Skills'] || undefined,
        additionalInfo: record.fields['Additional Information'] || undefined,
        interviewScore: record.fields['Interview Score'] || undefined,
        salaryExpectation: record.fields['Salary Expectation'] || undefined,
        experienceLevel: record.fields['Experience Level'] || undefined,
        profilePicture: record.fields['Profile Picture'] || undefined,
        createdAt: record.createdTime
      };

      return userProfile;

    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      console.log('Fetching all user profiles from platouserprofiles table...');
      
      let allRecords: UserProfileRecord[] = [];
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

        const data: UserProfileResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);

      console.log(`Found ${allRecords.length} user profiles`);

      // Transform records to our format
      const userProfiles: UserProfile[] = allRecords.map(record => ({
        id: record.id,
        name: record.fields['Name'] || 'Unknown User',
        userId: record.fields['UserID'] || record.fields['User ID'] || '',
        age: record.fields['Age'] || undefined,
        location: record.fields['Location'] || undefined,
        email: record.fields['Email'] || undefined,
        phone: record.fields['Phone'] || undefined,
        professionalSummary: record.fields['Professional Summary'] || undefined,
        workExperience: record.fields['Work Experience'] || undefined,
        education: record.fields['Education'] || undefined,
        skills: record.fields['Skills'] || undefined,
        additionalInfo: record.fields['Additional Information'] || undefined,
        interviewScore: record.fields['Interview Score'] || undefined,
        salaryExpectation: record.fields['Salary Expectation'] || undefined,
        experienceLevel: record.fields['Experience Level'] || undefined,
        profilePicture: record.fields['Profile Picture'] || undefined,
        createdAt: record.createdTime
      }));

      return userProfiles;

    } catch (error) {
      console.error('Error fetching all user profiles:', error);
      return [];
    }
  }
}

export const userProfilesAirtableService = new UserProfilesAirtableService(
  process.env.AIRTABLE_API_KEY || ''
);

export { UserProfilesAirtableService, type UserProfile };