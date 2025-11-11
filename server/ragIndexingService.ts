import fetch from "node-fetch";

interface JobData {
  id: number;
  title: string;
  description: string;
  requirements: string;
  technicalSkills?: string[];
  softSkills?: string[];
  experience?: string;
  employmentType?: string;
  workplaceType?: string;
  seniorityLevel?: string;
  industry?: string;
  location?: string;
  organizationId?: string;
}

interface ResumeData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  summary: string;
  experience?: string[];
  skills?: string[];
  education?: string[];
  certifications?: string[];
  languages?: string[];
  resumeText?: string;
  organizationId?: string;
}

export class RAGIndexingService {
  private ragApiUrl: string;

  constructor() {
    this.ragApiUrl = process.env.RAG_API_URL || "http://localhost:8002";
  }

  /**
   * Convert UUID string to a consistent integer for RAG API
   * RAG API requires integer IDs, but resumes use UUID strings
   */
  private uuidToInteger(uuid: string): number {
    // Use a simple hash function to convert UUID to integer
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive integer
    return Math.abs(hash);
  }

  /**
   * Index a job posting in the RAG system
   * @param jobData - The job posting data
   * @returns Promise with the indexing result
   */
  async indexJob(jobData: JobData): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📚 Indexing job ${jobData.id} in RAG system...`);

      // Construct the text to be indexed
      // Including description, skills, and experience as requested
      const indexText = this.constructIndexText(jobData);

      // Prepare the metadata (full job object as requested)
      const metadata = {
        id: jobData.id.toString(),
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements,
        technicalSkills: jobData.technicalSkills || [],
        softSkills: jobData.softSkills || [],
        experience: jobData.experience || "",
        employmentType: jobData.employmentType || "",
        workplaceType: jobData.workplaceType || "",
        seniorityLevel: jobData.seniorityLevel || "",
        industry: jobData.industry || "",
        location: jobData.location || "",
        organizationId: jobData.organizationId || "",
        // Include full job object for reference
        fullJob: jobData
      };

      // Prepare the request payload matching the example format
      const payload = {
        id: jobData.id,
        text: indexText,
        metadata: metadata,
        collection: "jobs"  // Using "jobs" as the collection name
      };

      console.log(`🔄 Sending request to RAG API: ${this.ragApiUrl}/insert`);
      console.log(`📊 Payload:`, JSON.stringify(payload, null, 2));

      // Make the API call to the RAG insert endpoint
      const response = await fetch(`${this.ragApiUrl}/insert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ RAG API error (${response.status}):`, errorText);
        throw new Error(`RAG API returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully indexed job ${jobData.id} in RAG system`);
      console.log(`📝 RAG Response:`, JSON.stringify(result, null, 2));

      return {
        success: true,
        message: `Job ${jobData.id} indexed successfully in RAG system`
      };
    } catch (error) {
      console.error(`❌ Error indexing job ${jobData.id} in RAG:`, error);
      return {
        success: false,
        message: `Failed to index job ${jobData.id}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Remove a job from the RAG index
   * @param jobId - The job ID to remove
   * @returns Promise with the removal result
   */
  async removeJob(jobId: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ Removing job ${jobId} from RAG system...`);

      // Note: This assumes the RAG API has a delete endpoint
      // If not, we might need to update the document instead
      const response = await fetch(`${this.ragApiUrl}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: jobId,
          collection: "jobs"
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ RAG delete API warning (${response.status}):`, errorText);
        // Don't throw error for delete failures, just log them
      }

      console.log(`✅ Removed job ${jobId} from RAG system`);
      return {
        success: true,
        message: `Job ${jobId} removed from RAG system`
      };
    } catch (error) {
      console.error(`❌ Error removing job ${jobId} from RAG:`, error);
      return {
        success: false,
        message: `Failed to remove job ${jobId}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Index a resume in the RAG system
   * @param resumeData - The resume profile data
   * @returns Promise with the indexing result
   */
  async indexResume(resumeData: ResumeData): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📚 Indexing resume ${resumeData.id} (${resumeData.name}) in RAG system...`);

      // Construct the text to be indexed
      const indexText = this.constructResumeIndexText(resumeData);

      // Convert UUID to integer for RAG API
      const ragId = this.uuidToInteger(resumeData.id);

      // Prepare the metadata (full resume object with original UUID)
      const metadata = {
        uuid: resumeData.id,  // Store original UUID for reference
        id: resumeData.id,
        name: resumeData.name,
        email: resumeData.email,
        phone: resumeData.phone || "",
        summary: resumeData.summary,
        experience: resumeData.experience || [],
        skills: resumeData.skills || [],
        education: resumeData.education || [],
        certifications: resumeData.certifications || [],
        languages: resumeData.languages || [],
        organizationId: resumeData.organizationId || "",
        // Include full resume object for reference
        fullResume: resumeData
      };

      // Prepare the request payload
      const payload = {
        id: ragId,  // Use integer ID for RAG
        text: indexText,
        metadata: metadata,
        collection: "resumes"  // Using "resumes" as the collection name
      };

      console.log(`🔄 Using RAG ID ${ragId} for UUID ${resumeData.id}`);

      console.log(`🔄 Sending request to RAG API: ${this.ragApiUrl}/insert`);

      // Make the API call to the RAG insert endpoint
      const response = await fetch(`${this.ragApiUrl}/insert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ RAG API error (${response.status}):`, errorText);
        throw new Error(`RAG API returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully indexed resume ${resumeData.id} (${resumeData.name}) in RAG system`);

      return {
        success: true,
        message: `Resume ${resumeData.id} indexed successfully in RAG system`
      };
    } catch (error) {
      console.error(`❌ Error indexing resume ${resumeData.id} in RAG:`, error);
      return {
        success: false,
        message: `Failed to index resume ${resumeData.id}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Remove a resume from the RAG index
   * @param resumeId - The resume ID to remove
   * @returns Promise with the removal result
   */
  async removeResume(resumeId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ Removing resume ${resumeId} from RAG system...`);

      // Convert UUID to integer for RAG API
      const ragId = this.uuidToInteger(resumeId);
      console.log(`🔄 Using RAG ID ${ragId} for UUID ${resumeId}`);

      const response = await fetch(`${this.ragApiUrl}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: ragId,  // Use integer ID for RAG
          collection: "resumes"
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ RAG delete API warning (${response.status}):`, errorText);
        // Don't throw error for delete failures, just log them
      }

      console.log(`✅ Removed resume ${resumeId} from RAG system`);
      return {
        success: true,
        message: `Resume ${resumeId} removed from RAG system`
      };
    } catch (error) {
      console.error(`❌ Error removing resume ${resumeId} from RAG:`, error);
      return {
        success: false,
        message: `Failed to remove resume ${resumeId}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Construct the text to be indexed in RAG for jobs
   * Combines description, skills, and experience in a natural sentence format
   */
  private constructIndexText(jobData: JobData): string {
    const parts: string[] = [];

    // Start with job title as a sentence
    parts.push(`We are seeking a ${jobData.title}`);

    // Add experience level
    if (jobData.seniorityLevel) {
      parts.push(`at a ${jobData.seniorityLevel} level`);
    }

    // Add employment type
    if (jobData.employmentType) {
      parts.push(`for a ${jobData.employmentType.toLowerCase()} position`);
    }

    // Add workplace type
    if (jobData.workplaceType) {
      parts.push(`with ${jobData.workplaceType.toLowerCase()} work arrangement`);
    }

    // Add location
    if (jobData.location) {
      parts.push(`located in ${jobData.location}`);
    }

    // Add industry
    if (jobData.industry) {
      parts.push(`in the ${jobData.industry} industry`);
    }

    parts.push(`.`);

    // Add description
    if (jobData.description) {
      parts.push(`\n\n${jobData.description}`);
    }

    // Add requirements
    if (jobData.requirements) {
      parts.push(`\n\nRequirements: ${jobData.requirements}`);
    }

    // Add technical skills
    if (jobData.technicalSkills && jobData.technicalSkills.length > 0) {
      parts.push(`\n\nThe ideal candidate should have strong skills in: ${jobData.technicalSkills.join(", ")}`);
    }

    // Add soft skills
    if (jobData.softSkills && jobData.softSkills.length > 0) {
      parts.push(`\n\nWe value candidates with the following soft skills: ${jobData.softSkills.join(", ")}`);
    }

    return parts.join("");
  }

  /**
   * Construct the text to be indexed in RAG for resumes
   * Combines all resume details in a natural language format
   */
  private constructResumeIndexText(resumeData: ResumeData): string {
    const parts: string[] = [];

    // Start with candidate name and contact
    parts.push(`Candidate: ${resumeData.name}`);
    if (resumeData.email) {
      parts.push(`\nEmail: ${resumeData.email}`);
    }
    if (resumeData.phone) {
      parts.push(`\nPhone: ${resumeData.phone}`);
    }

    // Add professional summary
    if (resumeData.summary) {
      parts.push(`\n\nProfessional Summary: ${resumeData.summary}`);
    }

    // Add skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      parts.push(`\n\nSkills: ${resumeData.skills.join(", ")}`);
    }

    // Add experience
    if (resumeData.experience && resumeData.experience.length > 0) {
      parts.push(`\n\nWork Experience:\n${resumeData.experience.join("\n")}`);
    }

    // Add education
    if (resumeData.education && resumeData.education.length > 0) {
      parts.push(`\n\nEducation:\n${resumeData.education.join("\n")}`);
    }

    // Add certifications
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      parts.push(`\n\nCertifications: ${resumeData.certifications.join(", ")}`);
    }

    // Add languages
    if (resumeData.languages && resumeData.languages.length > 0) {
      parts.push(`\n\nLanguages: ${resumeData.languages.join(", ")}`);
    }

    // Add full resume text if available
    if (resumeData.resumeText) {
      parts.push(`\n\nFull Resume Text:\n${resumeData.resumeText}`);
    }

    return parts.join("");
  }
}

// Export a singleton instance
export const ragIndexingService = new RAGIndexingService();
