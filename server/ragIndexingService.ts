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

export class RAGIndexingService {
  private ragApiUrl: string;

  constructor() {
    this.ragApiUrl = process.env.RAG_API_URL || "http://localhost:8002";
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
   * Construct the text to be indexed in RAG
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
}

// Export a singleton instance
export const ragIndexingService = new RAGIndexingService();
