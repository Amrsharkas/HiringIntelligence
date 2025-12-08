/**
 * Prompt Template Engine
 *
 * Handles rendering of prompt templates with {{variableName}} placeholders.
 * Supports nested variable paths like {{resume.name}} and {{resume.skills}}.
 */

// Variable schema definition for Job Scoring prompt
export const JOB_SCORING_VARIABLES = [
  { name: 'jobTitle', type: 'string', description: 'Job title from database', required: true },
  { name: 'jobDescription', type: 'string', description: 'Job description text', required: true },
  { name: 'jobRequirements', type: 'string', description: 'Job requirements text', required: true },
  { name: 'resume.name', type: 'string', description: 'Candidate name', required: true },
  { name: 'resume.summary', type: 'string', description: 'Candidate professional summary', required: true },
  { name: 'resume.skills', type: 'string', description: 'Comma-separated skills list', required: true },
  { name: 'resume.experience', type: 'string', description: 'Pipe-separated experience items', required: true },
  { name: 'resume.education', type: 'string', description: 'Pipe-separated education items', required: true },
  { name: 'resume.certifications', type: 'string', description: 'Pipe-separated certifications', required: true },
  { name: 'resume.languages', type: 'string', description: 'Pipe-separated languages', required: true },
  { name: 'customRules', type: 'string', description: 'Optional custom parsing rules', required: false },
];

// Variable schema for Resume Parsing prompt (for future use)
export const RESUME_PARSING_VARIABLES = [
  { name: 'resumeText', type: 'string', description: 'Raw text extracted from resume', required: true },
  { name: 'customRules', type: 'string', description: 'Optional custom parsing rules', required: false },
];

// Sample data for preview
export const SAMPLE_PREVIEW_DATA = {
  jobTitle: 'Senior Software Engineer',
  jobDescription: `We are looking for an experienced software engineer to join our growing team.
The ideal candidate will have strong experience in full-stack development and a passion for building scalable applications.

Responsibilities:
- Design and implement new features and functionality
- Write clean, maintainable, and efficient code
- Participate in code reviews and mentor junior developers
- Collaborate with product and design teams`,
  jobRequirements: `Required:
- 5+ years of experience in software development
- Strong proficiency in React, Node.js, and TypeScript
- Experience with PostgreSQL and Redis
- Excellent problem-solving skills

Nice to have:
- Experience with AWS or similar cloud platforms
- Knowledge of CI/CD pipelines
- Experience with microservices architecture`,
  resume: {
    name: 'John Doe',
    summary: 'Experienced software developer with 7 years in full-stack development. Passionate about building scalable web applications and mentoring junior developers.',
    skills: 'React, Node.js, TypeScript, PostgreSQL, AWS, Docker, Git, REST APIs, GraphQL',
    experience: 'Senior Developer at TechCorp (2020-2024): Led team of 5 engineers, increased deployment frequency by 300% | Software Developer at StartupXYZ (2017-2020): Built APIs serving 1M+ requests/day',
    education: 'B.S. Computer Science, MIT (2017)',
    certifications: 'AWS Solutions Architect Associate, Google Cloud Professional',
    languages: 'English (Native), Spanish (Intermediate)',
  },
  customRules: '',
};

/**
 * Get a nested value from an object using dot notation path
 * @param obj The object to get the value from
 * @param path The dot-notation path (e.g., 'resume.name')
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Render a prompt template by replacing {{variableName}} placeholders with actual values
 * @param template The template string with {{variableName}} placeholders
 * @param variables The variables to inject into the template
 * @returns The rendered template with all variables replaced
 */
export function renderPrompt(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = getNestedValue(variables, trimmedPath);

    // If value is undefined, keep the original placeholder
    if (value === undefined) {
      return match;
    }

    // Convert to string
    return String(value);
  });
}

/**
 * Extract all variable placeholders from a template
 * @param template The template string to scan
 * @returns Array of unique variable names found in the template
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
  const variables = matches.map(match => match.replace(/\{\{|\}\}/g, '').trim());
  return [...new Set(variables)]; // Return unique values
}

/**
 * Validate that all required variables are present in the provided data
 * @param template The template to check
 * @param variables The variables provided
 * @param schema The variable schema with required flags
 * @returns Object with isValid boolean and array of missing required variables
 */
export function validateVariables(
  template: string,
  variables: Record<string, any>,
  schema: typeof JOB_SCORING_VARIABLES
): { isValid: boolean; missing: string[] } {
  const templateVariables = extractVariables(template);
  const requiredVars = schema.filter(v => v.required).map(v => v.name);

  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (templateVariables.includes(varName)) {
      const value = getNestedValue(variables, varName);
      if (value === undefined || value === null || value === '') {
        missing.push(varName);
      }
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Get variable schema for a given prompt type
 * @param type The prompt type
 * @returns The variable schema for that type
 */
export function getVariableSchema(type: string): typeof JOB_SCORING_VARIABLES {
  switch (type) {
    case 'job_scoring':
      return JOB_SCORING_VARIABLES;
    case 'resume_parsing':
      return RESUME_PARSING_VARIABLES;
    default:
      return [];
  }
}

/**
 * Get sample data for preview based on prompt type
 * @param type The prompt type
 * @returns Sample data object for that type
 */
export function getSampleData(type: string): Record<string, any> {
  switch (type) {
    case 'job_scoring':
      return SAMPLE_PREVIEW_DATA;
    case 'resume_parsing':
      return {
        resumeText: `John Doe
john.doe@email.com | +1 (555) 123-4567 | San Francisco, CA

PROFESSIONAL SUMMARY
Experienced software developer with 7 years in full-stack development.

EXPERIENCE
Senior Developer at TechCorp (2020-2024)
- Led team of 5 engineers
- Increased deployment frequency by 300%

SKILLS
React, Node.js, TypeScript, PostgreSQL, AWS, Docker`,
        customRules: '',
      };
    default:
      return {};
  }
}
