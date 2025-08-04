// Auto-fill job applications table when employers post jobs
import fetch from 'node-fetch';
import { generateJobDescription, generateJobRequirements } from './ai-service';

export class JobApplicationsAutoFill {
  private apiKey: string;
  private baseUrl: string = 'https://api.airtable.com/v0';
  private baseId: string = 'appEYs1fTytFXoJ7x'; // platojobapplications base
  private tableName: string = 'Table 1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async autoFillJobApplication(job: any, companyName: string): Promise<void> {
    try {
      console.log(`🤖 Auto-filling job application for: ${job.title}`);
      
      // Use AI to enhance job information
      const enhancedDescription = job.description || await generateJobDescription(job.title, companyName, job.location);
      const requirements = job.requirements || await generateJobRequirements(job.title, enhancedDescription);
      
      // Create comprehensive job application record
      const applicationData = {
        records: [{
          fields: {
            "Job title": job.title,
            "Job ID": job.id.toString(),
            "Job description": enhancedDescription,
            "Company": companyName,
            "Location": job.location || "Not specified",
            "Salary": job.salary || "Competitive",
            "Job type": job.jobType || "Full-time",
            "Requirements": requirements,
            "Date Posted": new Date().toISOString().split('T')[0],
            "Status": "Active",
            "Application Count": "0",
            "Skills Required": Array.isArray(job.technicalSkills) ? job.technicalSkills.join(', ') : (job.technicalSkills || ""),
            "Department": this.extractDepartment(job.title),
            "Experience Level": this.extractExperienceLevel(job.title, enhancedDescription),
            "Remote Options": job.location?.toLowerCase().includes('remote') ? "Remote Available" : "On-site",
            "Application Deadline": this.calculateDeadline()
          }
        }]
      };

      const response = await fetch(`${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(applicationData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to auto-fill job application: ${response.status} ${response.statusText}`, errorText);
        return;
      }

      const result = await response.json();
      console.log(`✅ Successfully auto-filled job application for "${job.title}" (ID: ${job.id})`);
      console.log(`📋 Application record created: ${result.records[0].id}`);
      
    } catch (error) {
      console.error('Error auto-filling job application:', error);
    }
  }

  private extractDepartment(jobTitle: string): string {
    const title = jobTitle.toLowerCase();
    
    if (title.includes('engineer') || title.includes('developer') || title.includes('software')) return 'Engineering';
    if (title.includes('design') || title.includes('ux') || title.includes('ui')) return 'Design';
    if (title.includes('market') || title.includes('sales') || title.includes('business')) return 'Marketing & Sales';
    if (title.includes('data') || title.includes('analyst') || title.includes('scientist')) return 'Data & Analytics';
    if (title.includes('product') || title.includes('manager')) return 'Product Management';
    if (title.includes('hr') || title.includes('people') || title.includes('talent')) return 'Human Resources';
    if (title.includes('finance') || title.includes('accounting') || title.includes('investment')) return 'Finance';
    if (title.includes('operations') || title.includes('admin')) return 'Operations';
    
    return 'General';
  }

  private extractExperienceLevel(jobTitle: string, description: string): string {
    const combined = `${jobTitle} ${description}`.toLowerCase();
    
    if (combined.includes('senior') || combined.includes('lead') || combined.includes('principal')) return 'Senior';
    if (combined.includes('junior') || combined.includes('entry') || combined.includes('graduate')) return 'Junior';
    if (combined.includes('mid') || combined.includes('intermediate')) return 'Mid-level';
    if (combined.includes('director') || combined.includes('vp') || combined.includes('head of')) return 'Executive';
    if (combined.includes('intern') || combined.includes('trainee')) return 'Intern';
    
    return 'Mid-level';
  }

  private calculateDeadline(): string {
    // Set deadline to 30 days from posting date
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    return deadline.toISOString().split('T')[0];
  }

  setAirtableConfig(baseId: string, tableName: string = 'Table 1') {
    this.baseId = baseId;
    this.tableName = tableName;
  }
}

export const jobApplicationsAutoFill = new JobApplicationsAutoFill("pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0");