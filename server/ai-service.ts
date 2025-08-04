import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function generateJobDescription(jobTitle: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Generate a professional job description for the position: ${jobTitle}

Write a comprehensive job description that includes:
- Overview of the role and company
- Key responsibilities and duties
- Team collaboration aspects
- Growth opportunities

Keep it professional but engaging, suitable for the Egyptian job market. Focus on attracting qualified candidates.

Job Title: ${jobTitle}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a professional HR expert creating engaging job descriptions for the Egyptian market. Write clear, compelling content that attracts qualified candidates."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 1000,
    temperature: 0.7
  });

  return response.choices[0].message.content || "Unable to generate description";
}

export async function generateJobRequirements(jobTitle: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Generate detailed job requirements for the position: ${jobTitle}

Create a comprehensive list of requirements including:
- Required education and experience
- Technical skills and competencies
- Soft skills and personal qualities
- Preferred qualifications
- Any certifications or special requirements

Format as clear bullet points. Make it specific to the Egyptian job market.

Job Title: ${jobTitle}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system", 
        content: "You are a professional HR expert creating detailed job requirements for the Egyptian market. Write clear, specific requirements that help identify qualified candidates."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 800,
    temperature: 0.6
  });

  return response.choices[0].message.content || "Unable to generate requirements";
}