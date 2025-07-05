# Airtable Setup Guide for Candidate Database

## Your Current Database Info
- **Base Name:** platouserprofiles
- **Base ID:** app3tA4UpKQCT2s17
- **Table:** Table 1
- **Current Records:** 3 (all empty)

## Required Fields for AI Matching

### Core Fields (Essential)
| Field Name | Type | Example | Description |
|------------|------|---------|-------------|
| Name | Single line text | "Sarah Johnson" | Candidate's full name |
| Email | Email | "sarah@email.com" | Contact email |
| PreviousRole | Single line text | "Senior Developer" | Most recent job title |
| YearsExperience | Number | 5 | Years of professional experience |
| TechnicalSkills | Multiple select | "React, Python, AWS" | Technical/hard skills |
| Skills | Multiple select | "Leadership, Communication" | Soft skills |
| Location | Single line text | "San Francisco, CA" | Current location |
| SalaryExpectation | Single line text | "$120,000 - $150,000" | Expected salary range |
| InterviewScore | Number | 8 | Interview performance (1-10) |
| Summary | Long text | "Experienced developer..." | Brief bio/summary |

### Optional Fields (Enhance matching)
| Field Name | Type | Example | Description |
|------------|------|---------|-------------|
| Education | Single line text | "BS Computer Science" | Educational background |
| Portfolio | URL | "https://portfolio.com" | Portfolio website |
| LinkedIn | URL | "https://linkedin.com/in/..." | LinkedIn profile |
| GitHub | URL | "https://github.com/..." | GitHub profile |
| Availability | Checkbox | ✓ | Available for new roles |
| Notes | Long text | "Strong in algorithms..." | Additional notes |

## Sample Candidate Records

### Candidate 1: Frontend Developer
```
Name: Sarah Johnson
Email: sarah.johnson@email.com
PreviousRole: Senior Frontend Developer
YearsExperience: 6
TechnicalSkills: React, JavaScript, TypeScript, CSS, HTML
Skills: Leadership, Problem Solving, Communication, Team Management
Location: New York, NY
SalaryExpectation: $130,000 - $160,000
InterviewScore: 9
Summary: Experienced frontend developer with 6+ years building scalable web applications. Led development teams and mentored junior developers. Expert in React ecosystem and modern JavaScript.
```

### Candidate 2: Backend Developer
```
Name: Michael Chen
Email: m.chen@email.com
PreviousRole: Backend Software Engineer
YearsExperience: 4
TechnicalSkills: Python, Django, PostgreSQL, AWS, Docker
Skills: Problem Solving, Analytical Thinking, Documentation
Location: San Francisco, CA
SalaryExpectation: $110,000 - $140,000
InterviewScore: 8
Summary: Backend engineer specializing in Python and cloud infrastructure. Built APIs serving millions of users. Strong focus on performance optimization and system design.
```

### Candidate 3: Full Stack Developer
```
Name: Emily Rodriguez
Email: emily.r@email.com
PreviousRole: Full Stack Developer
YearsExperience: 3
TechnicalSkills: JavaScript, Node.js, React, MongoDB, Express
Skills: Adaptability, Quick Learning, Communication, Creativity
Location: Austin, TX
SalaryExpectation: $95,000 - $120,000
InterviewScore: 7
Summary: Versatile full-stack developer with experience in MERN stack. Quick learner who adapts to new technologies. Built several web applications from concept to deployment.
```

## How to Add Fields in Airtable

1. **Open your base:** Go to airtable.com → "platouserprofiles" → "Table 1"
2. **Add new field:** Click the "+" button next to the last column
3. **Choose field type:** Select appropriate type from the list above
4. **Name the field:** Use exact names from the table above for best compatibility
5. **Configure options:** For Multiple select fields, add options as you enter data

## Testing the Integration

Once you add fields and sample data:

1. **Log into the hiring platform**
2. **Create a job posting**
3. **Click "View Candidates"** to see AI-powered matching
4. **Review match scores** and reasoning from the AI analysis

## Field Mapping

The system automatically maps these Airtable field names:
- `Name` or `FullName` → candidate name
- `TechnicalSkills` or `Technical Skills` → technical skills array
- `YearsExperience` or `Years Experience` → experience number
- `PreviousRole` or `Previous Role` → job title
- `SalaryExpectation` or `Salary Expectation` → salary range
- `InterviewScore` or `Interview Score` → interview rating

Use consistent naming for best results.