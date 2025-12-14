import OpenAI from "openai";
import { wrapOpenAIRequest } from "./openaiTracker";

// OpenAI client - models are configured via environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" });

// ============================================================================
// ROLE-SPECIFIC KNOWLEDGE DATABASES
// These provide accurate, industry-standard information for common job roles
// ============================================================================

interface RoleKnowledge {
  coreResponsibilities: string[];
  technicalSkills: Record<string, string[]>; // by seniority
  toolsAndTechnologies: string[];
  keyMetrics: string[];
  commonProjects: string[];
  industryTerminology: string[];
  certifications: string[];
  careerProgression: string;
}

const ROLE_KNOWLEDGE_BASE: Record<string, RoleKnowledge> = {
  // Software Engineering Roles
  'frontend developer': {
    coreResponsibilities: [
      'Build responsive, accessible user interfaces using modern frameworks',
      'Implement pixel-perfect designs from Figma/Sketch mockups',
      'Optimize web application performance (Core Web Vitals, bundle size)',
      'Write unit and integration tests for UI components',
      'Collaborate with designers and backend engineers on API contracts',
      'Ensure cross-browser compatibility and mobile responsiveness',
      'Implement state management solutions for complex applications',
      'Review code and mentor team members on frontend best practices'
    ],
    technicalSkills: {
      'Internship': ['HTML', 'CSS', 'JavaScript basics', 'Git fundamentals'],
      'Entry-level': ['HTML5', 'CSS3', 'JavaScript ES6+', 'React or Vue basics', 'Git', 'Responsive design'],
      'Junior': ['React/Vue/Angular', 'TypeScript basics', 'CSS preprocessors', 'REST APIs', 'Basic testing'],
      'Mid-level': ['Advanced React/Vue', 'TypeScript', 'State management (Redux/Zustand)', 'Testing (Jest/Vitest)', 'Performance optimization', 'CI/CD basics'],
      'Senior': ['Architecture patterns', 'Advanced TypeScript', 'Micro-frontends', 'Build tooling (Webpack/Vite)', 'Mentoring', 'Technical leadership'],
      'Lead': ['System design', 'Team leadership', 'Technology strategy', 'Cross-functional collaboration', 'Technical roadmapping']
    },
    toolsAndTechnologies: ['React', 'Vue', 'Angular', 'TypeScript', 'Webpack', 'Vite', 'Jest', 'Cypress', 'Storybook', 'Tailwind CSS', 'Next.js', 'Nuxt.js'],
    keyMetrics: ['Page load time', 'Time to Interactive', 'Lighthouse scores', 'Test coverage', 'Bug escape rate'],
    commonProjects: ['E-commerce platforms', 'Admin dashboards', 'Customer portals', 'Mobile-responsive websites', 'Design systems'],
    industryTerminology: ['Component-based architecture', 'Virtual DOM', 'Server-side rendering', 'Static site generation', 'Progressive Web Apps'],
    certifications: ['Meta Front-End Developer', 'AWS Certified Cloud Practitioner', 'Google UX Design'],
    careerProgression: 'Junior Developer → Mid-level Developer → Senior Developer → Tech Lead → Staff Engineer → Principal Engineer'
  },
  'backend developer': {
    coreResponsibilities: [
      'Design and implement scalable RESTful and GraphQL APIs',
      'Build and maintain database schemas and optimize queries',
      'Implement authentication, authorization, and security best practices',
      'Write comprehensive unit and integration tests',
      'Design microservices architecture and inter-service communication',
      'Monitor application performance and troubleshoot production issues',
      'Document APIs and technical specifications',
      'Participate in code reviews and architectural discussions'
    ],
    technicalSkills: {
      'Internship': ['Basic programming concepts', 'SQL fundamentals', 'HTTP basics', 'Git'],
      'Entry-level': ['One backend language (Node.js/Python/Java)', 'SQL databases', 'REST API basics', 'Git workflow'],
      'Junior': ['Backend frameworks (Express/Django/Spring)', 'ORM usage', 'API design', 'Basic Docker', 'Unit testing'],
      'Mid-level': ['Multiple languages/frameworks', 'Database optimization', 'Caching (Redis)', 'Message queues', 'CI/CD', 'Cloud basics (AWS/GCP)'],
      'Senior': ['System design', 'Microservices', 'Performance tuning', 'Security architecture', 'Technical mentoring', 'Infrastructure as Code'],
      'Lead': ['Architecture decisions', 'Team leadership', 'Technology evaluation', 'Cross-team collaboration', 'Technical strategy']
    },
    toolsAndTechnologies: ['Node.js', 'Python', 'Java', 'Go', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GraphQL', 'RabbitMQ', 'Kafka'],
    keyMetrics: ['API response time', 'Uptime/availability', 'Error rates', 'Database query performance', 'Throughput'],
    commonProjects: ['REST API development', 'Payment integration', 'Authentication systems', 'Data pipelines', 'Third-party integrations'],
    industryTerminology: ['Microservices', 'Event-driven architecture', 'CQRS', 'Database sharding', 'Load balancing', 'Rate limiting'],
    certifications: ['AWS Solutions Architect', 'Google Cloud Professional', 'MongoDB Developer', 'Kubernetes Administrator'],
    careerProgression: 'Junior Developer → Mid-level Developer → Senior Developer → Tech Lead → Staff Engineer → Principal Engineer'
  },
  'fullstack developer': {
    coreResponsibilities: [
      'Build end-to-end features from database to user interface',
      'Design and implement APIs and integrate with frontend applications',
      'Optimize application performance across the full stack',
      'Deploy and maintain applications in cloud environments',
      'Collaborate with product and design teams on feature requirements',
      'Write tests across all layers of the application',
      'Troubleshoot and debug issues across the entire stack',
      'Mentor team members and contribute to technical decisions'
    ],
    technicalSkills: {
      'Internship': ['HTML', 'CSS', 'JavaScript', 'Basic programming', 'SQL basics'],
      'Entry-level': ['JavaScript/TypeScript', 'React or Vue', 'Node.js basics', 'SQL', 'Git', 'REST APIs'],
      'Junior': ['React/Vue', 'Node.js/Express', 'PostgreSQL/MongoDB', 'Basic testing', 'Docker basics'],
      'Mid-level': ['Full React/Node.js stack', 'TypeScript', 'Database design', 'Caching', 'CI/CD', 'Cloud deployment'],
      'Senior': ['System architecture', 'Performance optimization', 'Security practices', 'Multiple languages', 'Technical leadership'],
      'Lead': ['Architecture ownership', 'Team management', 'Technology strategy', 'Stakeholder communication', 'Technical roadmaps']
    },
    toolsAndTechnologies: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'Next.js', 'GraphQL', 'Redis'],
    keyMetrics: ['Feature delivery velocity', 'System reliability', 'Code quality metrics', 'Customer-facing performance'],
    commonProjects: ['SaaS applications', 'Internal tools', 'Customer portals', 'E-commerce platforms', 'Real-time applications'],
    industryTerminology: ['Full-stack architecture', 'API-first design', 'JAMstack', 'Serverless', 'Monolith to microservices'],
    certifications: ['AWS Solutions Architect', 'Meta Full-Stack Engineer', 'MongoDB Developer'],
    careerProgression: 'Junior Developer → Mid-level Developer → Senior Developer → Tech Lead → Engineering Manager'
  },
  'data analyst': {
    coreResponsibilities: [
      'Analyze large datasets to identify trends, patterns, and insights',
      'Create dashboards and visualizations for stakeholders',
      'Write SQL queries to extract and transform data',
      'Build automated reports and data pipelines',
      'Collaborate with business teams to define metrics and KPIs',
      'Present findings and recommendations to leadership',
      'Ensure data quality and accuracy in reports',
      'Document data sources, methodologies, and analysis processes'
    ],
    technicalSkills: {
      'Internship': ['Excel/Google Sheets', 'Basic SQL', 'Basic statistics', 'Data visualization basics'],
      'Entry-level': ['SQL', 'Excel advanced', 'Python or R basics', 'Tableau or Power BI', 'Statistical concepts'],
      'Junior': ['Advanced SQL', 'Python/R for analysis', 'Data visualization tools', 'Statistical analysis', 'Data cleaning'],
      'Mid-level': ['Complex SQL optimization', 'Python pandas/numpy', 'Advanced statistics', 'A/B testing', 'Machine learning basics'],
      'Senior': ['Data strategy', 'Advanced analytics', 'Predictive modeling', 'Stakeholder management', 'Mentoring'],
      'Lead': ['Analytics strategy', 'Team leadership', 'Cross-functional partnerships', 'Data governance']
    },
    toolsAndTechnologies: ['SQL', 'Python', 'R', 'Tableau', 'Power BI', 'Excel', 'Google Analytics', 'Looker', 'dbt', 'Snowflake', 'BigQuery'],
    keyMetrics: ['Report accuracy', 'Insight actionability', 'Stakeholder satisfaction', 'Analysis turnaround time'],
    commonProjects: ['Revenue analysis', 'Customer segmentation', 'Churn prediction', 'Marketing attribution', 'Operational dashboards'],
    industryTerminology: ['ETL', 'Data warehouse', 'Business intelligence', 'Data modeling', 'Cohort analysis', 'Funnel analysis'],
    certifications: ['Google Data Analytics', 'Tableau Desktop Specialist', 'Microsoft Power BI', 'AWS Data Analytics'],
    careerProgression: 'Data Analyst → Senior Analyst → Lead Analyst → Analytics Manager → Director of Analytics'
  },
  'data scientist': {
    coreResponsibilities: [
      'Develop machine learning models to solve business problems',
      'Analyze complex datasets using statistical and ML techniques',
      'Design and run experiments (A/B tests, multivariate tests)',
      'Build and deploy predictive models to production',
      'Collaborate with engineering to integrate models into products',
      'Communicate technical findings to non-technical stakeholders',
      'Research and implement state-of-the-art ML techniques',
      'Mentor junior data scientists and analysts'
    ],
    technicalSkills: {
      'Internship': ['Python basics', 'Statistics fundamentals', 'Linear algebra', 'Basic ML concepts'],
      'Entry-level': ['Python', 'SQL', 'Statistics', 'scikit-learn', 'Data visualization', 'Jupyter notebooks'],
      'Junior': ['Machine learning algorithms', 'Feature engineering', 'Model evaluation', 'pandas/numpy', 'Deep learning basics'],
      'Mid-level': ['Advanced ML/DL', 'Model deployment', 'Experiment design', 'Big data tools', 'MLOps basics'],
      'Senior': ['Research and innovation', 'System design for ML', 'Production ML', 'Technical leadership', 'Strategic thinking'],
      'Lead': ['ML strategy', 'Team leadership', 'Research direction', 'Cross-org collaboration', 'Budget planning']
    },
    toolsAndTechnologies: ['Python', 'TensorFlow', 'PyTorch', 'scikit-learn', 'SQL', 'Spark', 'MLflow', 'Kubeflow', 'Docker', 'AWS SageMaker', 'Jupyter'],
    keyMetrics: ['Model accuracy/precision/recall', 'Business impact of models', 'Experiment success rate', 'Time to production'],
    commonProjects: ['Recommendation systems', 'Fraud detection', 'Demand forecasting', 'NLP applications', 'Computer vision', 'Customer lifetime value'],
    industryTerminology: ['Feature engineering', 'Model training', 'Hyperparameter tuning', 'Cross-validation', 'Ensemble methods', 'Neural networks'],
    certifications: ['AWS Machine Learning', 'Google Professional ML Engineer', 'TensorFlow Developer', 'Deep Learning Specialization'],
    careerProgression: 'Data Scientist → Senior DS → Staff DS → Principal DS → Head of Data Science'
  },
  'devops engineer': {
    coreResponsibilities: [
      'Design and implement CI/CD pipelines for automated deployments',
      'Manage cloud infrastructure using Infrastructure as Code',
      'Monitor system health and implement alerting solutions',
      'Optimize system performance and reduce operational costs',
      'Implement security best practices and compliance requirements',
      'Collaborate with development teams to improve deployment processes',
      'Troubleshoot production issues and lead incident response',
      'Document infrastructure and operational procedures'
    ],
    technicalSkills: {
      'Internship': ['Linux basics', 'Git', 'Basic scripting', 'Cloud fundamentals'],
      'Entry-level': ['Linux administration', 'Docker basics', 'CI/CD concepts', 'One cloud platform', 'Bash scripting'],
      'Junior': ['Docker/Kubernetes basics', 'Terraform/Ansible', 'CI/CD tools', 'Monitoring basics', 'Cloud services'],
      'Mid-level': ['Advanced Kubernetes', 'Multi-cloud', 'IaC best practices', 'Security', 'Cost optimization', 'Observability'],
      'Senior': ['Architecture design', 'Platform engineering', 'SRE practices', 'Team enablement', 'Technical leadership'],
      'Lead': ['Platform strategy', 'Team leadership', 'Vendor management', 'Budget planning', 'Organization-wide standards']
    },
    toolsAndTechnologies: ['Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'AWS', 'GCP', 'Azure', 'Prometheus', 'Grafana', 'ELK Stack'],
    keyMetrics: ['Deployment frequency', 'Lead time for changes', 'Mean time to recovery', 'Change failure rate', 'System uptime'],
    commonProjects: ['CI/CD pipeline implementation', 'Kubernetes cluster management', 'Cloud migration', 'Monitoring setup', 'Cost optimization'],
    industryTerminology: ['Infrastructure as Code', 'GitOps', 'Site Reliability Engineering', 'Observability', 'Chaos engineering', 'Blue-green deployment'],
    certifications: ['AWS Solutions Architect', 'Kubernetes Administrator (CKA)', 'Terraform Associate', 'Azure DevOps Engineer'],
    careerProgression: 'DevOps Engineer → Senior DevOps → Staff Engineer → Platform Lead → Director of Platform Engineering'
  },
  'product manager': {
    coreResponsibilities: [
      'Define product vision, strategy, and roadmap',
      'Gather and prioritize product requirements from stakeholders',
      'Write detailed product specifications and user stories',
      'Work closely with engineering, design, and business teams',
      'Analyze market trends and competitive landscape',
      'Define and track product metrics and KPIs',
      'Lead product launches and go-to-market activities',
      'Make data-driven decisions to optimize product performance'
    ],
    technicalSkills: {
      'Internship': ['Basic product concepts', 'Market research', 'Documentation', 'Communication skills'],
      'Entry-level': ['Product lifecycle', 'User story writing', 'Basic analytics', 'Stakeholder communication', 'Agile basics'],
      'Junior': ['Roadmap creation', 'Prioritization frameworks', 'A/B testing', 'SQL basics', 'Customer research'],
      'Mid-level': ['Product strategy', 'Data analysis', 'Cross-functional leadership', 'Market analysis', 'Metric definition'],
      'Senior': ['Vision setting', 'Strategic planning', 'Executive communication', 'Team leadership', 'P&L understanding'],
      'Lead': ['Product organization leadership', 'Business strategy', 'Team building', 'Board communication', 'Portfolio management']
    },
    toolsAndTechnologies: ['Jira', 'Confluence', 'Figma', 'Amplitude', 'Mixpanel', 'SQL', 'Notion', 'Productboard', 'Aha!', 'Google Analytics'],
    keyMetrics: ['User engagement', 'Retention rates', 'Revenue growth', 'Customer satisfaction', 'Feature adoption'],
    commonProjects: ['New feature launches', 'Product redesigns', 'Market expansion', 'User experience improvements', 'Platform migrations'],
    industryTerminology: ['Product-market fit', 'MVP', 'Sprint planning', 'User personas', 'Jobs to be done', 'OKRs', 'North Star metric'],
    certifications: ['Pragmatic Marketing', 'Scrum Product Owner', 'AIPMM Certified Product Manager', 'Google Project Management'],
    careerProgression: 'Associate PM → Product Manager → Senior PM → Group PM → Director of Product → VP of Product → CPO'
  },
  'ui/ux designer': {
    coreResponsibilities: [
      'Conduct user research and usability testing',
      'Create wireframes, prototypes, and high-fidelity designs',
      'Design intuitive user interfaces following design systems',
      'Collaborate with product and engineering teams',
      'Define and maintain design systems and component libraries',
      'Analyze user behavior data to inform design decisions',
      'Present design concepts and iterate based on feedback',
      'Ensure accessibility and inclusive design practices'
    ],
    technicalSkills: {
      'Internship': ['Design fundamentals', 'Basic Figma/Sketch', 'Color theory', 'Typography basics'],
      'Entry-level': ['Figma/Sketch', 'Wireframing', 'Basic prototyping', 'Visual design', 'Design principles'],
      'Junior': ['Advanced prototyping', 'User research basics', 'Design systems', 'Responsive design', 'Handoff to development'],
      'Mid-level': ['User research methods', 'Information architecture', 'Interaction design', 'Accessibility', 'Design leadership'],
      'Senior': ['Design strategy', 'Research leadership', 'Team mentoring', 'Stakeholder management', 'Complex system design'],
      'Lead': ['Design organization', 'Vision setting', 'Cross-functional leadership', 'Design culture', 'Team building']
    },
    toolsAndTechnologies: ['Figma', 'Sketch', 'Adobe XD', 'InVision', 'Principle', 'Framer', 'Miro', 'UserTesting', 'Hotjar', 'Maze'],
    keyMetrics: ['Task completion rate', 'User satisfaction scores', 'Conversion rates', 'Time on task', 'Error rates'],
    commonProjects: ['App redesigns', 'Design system creation', 'User research studies', 'Prototype development', 'Accessibility audits'],
    industryTerminology: ['User journey', 'Information architecture', 'Heuristic evaluation', 'Card sorting', 'A/B testing', 'Atomic design'],
    certifications: ['Google UX Design', 'Nielsen Norman UX Certification', 'Interaction Design Foundation'],
    careerProgression: 'Junior Designer → Designer → Senior Designer → Lead Designer → Design Manager → Head of Design'
  },
  'marketing manager': {
    coreResponsibilities: [
      'Develop and execute marketing strategies and campaigns',
      'Manage marketing budget and allocate resources effectively',
      'Analyze campaign performance and optimize ROI',
      'Oversee content creation, social media, and digital marketing',
      'Collaborate with sales team on lead generation',
      'Manage agency relationships and vendor partnerships',
      'Build and lead marketing team',
      'Report on marketing metrics to leadership'
    ],
    technicalSkills: {
      'Internship': ['Marketing fundamentals', 'Social media basics', 'Content creation', 'Basic analytics'],
      'Entry-level': ['Digital marketing', 'Social media management', 'Email marketing', 'Google Analytics', 'Content writing'],
      'Junior': ['Campaign management', 'SEO/SEM basics', 'Marketing automation', 'A/B testing', 'Budget tracking'],
      'Mid-level': ['Marketing strategy', 'Team leadership', 'Advanced analytics', 'Multi-channel campaigns', 'Vendor management'],
      'Senior': ['Strategic planning', 'P&L management', 'Executive communication', 'Brand strategy', 'Market expansion'],
      'Lead': ['Department leadership', 'Board reporting', 'Company strategy', 'Team building', 'Industry thought leadership']
    },
    toolsAndTechnologies: ['HubSpot', 'Marketo', 'Google Analytics', 'Google Ads', 'Facebook Ads Manager', 'Mailchimp', 'SEMrush', 'Hootsuite', 'Salesforce'],
    keyMetrics: ['Customer acquisition cost', 'Marketing ROI', 'Lead quality score', 'Conversion rates', 'Brand awareness'],
    commonProjects: ['Product launches', 'Brand campaigns', 'Lead generation programs', 'Content strategy', 'Marketing automation'],
    industryTerminology: ['Inbound marketing', 'Lead nurturing', 'Marketing funnel', 'Customer journey', 'Attribution modeling', 'MQL/SQL'],
    certifications: ['Google Ads Certification', 'HubSpot Marketing', 'Facebook Blueprint', 'Google Analytics'],
    careerProgression: 'Marketing Coordinator → Marketing Manager → Senior Manager → Director → VP of Marketing → CMO'
  },
  'sales representative': {
    coreResponsibilities: [
      'Prospect and qualify potential customers',
      'Conduct product demonstrations and presentations',
      'Negotiate contracts and close deals',
      'Maintain CRM with accurate and up-to-date information',
      'Meet or exceed sales quotas and targets',
      'Build and maintain customer relationships',
      'Collaborate with marketing on lead quality',
      'Provide market feedback to product team'
    ],
    technicalSkills: {
      'Internship': ['Sales fundamentals', 'CRM basics', 'Communication skills', 'Product knowledge'],
      'Entry-level': ['Prospecting', 'CRM usage', 'Cold calling', 'Email outreach', 'Basic negotiation'],
      'Junior': ['Full sales cycle', 'Objection handling', 'Pipeline management', 'Presentation skills', 'Product demos'],
      'Mid-level': ['Complex deal management', 'Strategic selling', 'Account planning', 'Forecasting', 'Team collaboration'],
      'Senior': ['Enterprise sales', 'C-level selling', 'Strategic partnerships', 'Mentoring', 'Sales strategy'],
      'Lead': ['Team leadership', 'Territory planning', 'Revenue forecasting', 'Sales methodology', 'Hiring and training']
    },
    toolsAndTechnologies: ['Salesforce', 'HubSpot CRM', 'LinkedIn Sales Navigator', 'Outreach', 'Gong', 'ZoomInfo', 'Zoom', 'Slack'],
    keyMetrics: ['Quota attainment', 'Pipeline coverage', 'Win rate', 'Average deal size', 'Sales cycle length'],
    commonProjects: ['Territory development', 'Account expansion', 'New market entry', 'Sales process optimization'],
    industryTerminology: ['Discovery call', 'Qualification criteria', 'BANT/MEDDIC', 'Value proposition', 'Competitive displacement'],
    certifications: ['Salesforce Administrator', 'Sandler Sales', 'Challenger Sales', 'SPIN Selling'],
    careerProgression: 'SDR/BDR → Account Executive → Senior AE → Enterprise AE → Sales Manager → Director → VP of Sales'
  },
  'accountant': {
    coreResponsibilities: [
      'Prepare and maintain financial statements and reports',
      'Manage accounts payable and receivable',
      'Perform month-end and year-end closing procedures',
      'Ensure compliance with accounting standards and regulations',
      'Reconcile bank statements and general ledger accounts',
      'Prepare tax filings and support audits',
      'Analyze financial data and provide insights',
      'Maintain accurate financial records and documentation'
    ],
    technicalSkills: {
      'Internship': ['Basic accounting principles', 'Excel', 'Data entry', 'Bookkeeping basics'],
      'Entry-level': ['GAAP/IFRS basics', 'Journal entries', 'Excel proficiency', 'Accounting software', 'Reconciliation'],
      'Junior': ['Full accounting cycle', 'Tax preparation', 'Financial statements', 'ERP systems', 'Variance analysis'],
      'Mid-level': ['Complex accounting', 'Audit preparation', 'Team coordination', 'Process improvement', 'Regulatory compliance'],
      'Senior': ['Technical accounting', 'M&A accounting', 'Team leadership', 'Strategic planning', 'Policy development'],
      'Lead': ['Department leadership', 'CFO support', 'Strategic initiatives', 'System implementations', 'External relationships']
    },
    toolsAndTechnologies: ['QuickBooks', 'SAP', 'Oracle', 'NetSuite', 'Excel', 'Sage', 'Xero', 'BlackLine', 'Workday'],
    keyMetrics: ['Close cycle time', 'Accuracy rate', 'Audit findings', 'Compliance rate', 'Process efficiency'],
    commonProjects: ['Month-end close', 'Annual audit', 'System implementation', 'Process automation', 'Tax compliance'],
    industryTerminology: ['General ledger', 'Accrual accounting', 'Revenue recognition', 'Fixed assets', 'Intercompany', 'Cost accounting'],
    certifications: ['CPA', 'CMA', 'ACCA', 'CIA', 'QuickBooks Certified'],
    careerProgression: 'Staff Accountant → Senior Accountant → Accounting Manager → Controller → VP of Finance → CFO'
  },
  'hr manager': {
    coreResponsibilities: [
      'Develop and implement HR policies and procedures',
      'Manage recruitment and talent acquisition processes',
      'Oversee employee onboarding and offboarding',
      'Handle employee relations and conflict resolution',
      'Administer compensation and benefits programs',
      'Ensure compliance with labor laws and regulations',
      'Lead performance management and development programs',
      'Support organizational development initiatives'
    ],
    technicalSkills: {
      'Internship': ['HR fundamentals', 'HRIS basics', 'Communication', 'Administrative skills'],
      'Entry-level': ['Recruitment basics', 'HRIS systems', 'Employee relations', 'Benefits administration', 'Policy compliance'],
      'Junior': ['Full-cycle recruiting', 'Performance management', 'Training coordination', 'HR analytics basics', 'Conflict resolution'],
      'Mid-level': ['Talent strategy', 'Compensation planning', 'Employee engagement', 'Legal compliance', 'Team leadership'],
      'Senior': ['HR strategy', 'Organizational design', 'Change management', 'Executive coaching', 'Policy development'],
      'Lead': ['People strategy', 'C-suite partnership', 'Culture development', 'M&A integration', 'Board reporting']
    },
    toolsAndTechnologies: ['Workday', 'BambooHR', 'Greenhouse', 'Lever', 'ADP', 'LinkedIn Recruiter', 'Slack', 'Culture Amp'],
    keyMetrics: ['Time to hire', 'Employee turnover', 'Employee satisfaction', 'Diversity metrics', 'Training completion'],
    commonProjects: ['Recruitment campaigns', 'Performance review cycles', 'Policy updates', 'Culture initiatives', 'HRIS implementations'],
    industryTerminology: ['Employee lifecycle', 'Total rewards', 'Talent pipeline', 'Succession planning', 'DEI', 'Employee NPS'],
    certifications: ['PHR/SPHR', 'SHRM-CP/SCP', 'CIPD', 'Talent Acquisition Specialist'],
    careerProgression: 'HR Coordinator → HR Generalist → HR Manager → HR Director → VP of HR → CHRO'
  },
  'project manager': {
    coreResponsibilities: [
      'Plan and define project scope, goals, and deliverables',
      'Create and maintain project schedules and budgets',
      'Lead cross-functional teams to deliver projects on time',
      'Identify and manage project risks and issues',
      'Communicate project status to stakeholders',
      'Manage project resources and team assignments',
      'Ensure quality standards are met',
      'Document lessons learned and best practices'
    ],
    technicalSkills: {
      'Internship': ['Project basics', 'Documentation', 'Communication', 'Meeting coordination'],
      'Entry-level': ['Project planning', 'Gantt charts', 'Stakeholder communication', 'Risk identification', 'Meeting facilitation'],
      'Junior': ['Full project lifecycle', 'Resource planning', 'Budget tracking', 'Issue management', 'Agile basics'],
      'Mid-level': ['Complex project management', 'Cross-functional leadership', 'Change management', 'Vendor management', 'Multiple methodologies'],
      'Senior': ['Portfolio management', 'Strategic planning', 'Executive communication', 'Team development', 'Process improvement'],
      'Lead': ['PMO leadership', 'Organizational PM', 'Executive partnership', 'Methodology development', 'Team building']
    },
    toolsAndTechnologies: ['Jira', 'Asana', 'Monday.com', 'MS Project', 'Confluence', 'Smartsheet', 'Trello', 'Slack', 'Zoom'],
    keyMetrics: ['On-time delivery', 'Budget variance', 'Scope creep', 'Stakeholder satisfaction', 'Resource utilization'],
    commonProjects: ['Software development', 'Product launches', 'Process improvements', 'System implementations', 'Organizational changes'],
    industryTerminology: ['Waterfall', 'Agile', 'Scrum', 'Sprint', 'Kanban', 'Critical path', 'WBS', 'RACI'],
    certifications: ['PMP', 'PRINCE2', 'Scrum Master', 'Agile Certified Practitioner', 'Six Sigma'],
    careerProgression: 'Project Coordinator → Project Manager → Senior PM → Program Manager → Director of PMO → VP of Operations'
  },
  'customer support': {
    coreResponsibilities: [
      'Respond to customer inquiries via phone, email, and chat',
      'Troubleshoot and resolve customer issues effectively',
      'Document customer interactions in CRM system',
      'Escalate complex issues to appropriate teams',
      'Maintain knowledge of products and services',
      'Meet customer satisfaction and response time targets',
      'Contribute to knowledge base and documentation',
      'Identify patterns and suggest process improvements'
    ],
    technicalSkills: {
      'Internship': ['Customer service basics', 'Communication skills', 'CRM basics', 'Product knowledge'],
      'Entry-level': ['Ticket management', 'CRM proficiency', 'Basic troubleshooting', 'Written communication', 'Time management'],
      'Junior': ['Complex issue resolution', 'Multi-channel support', 'Customer advocacy', 'Documentation', 'Process adherence'],
      'Mid-level': ['Escalation management', 'Training delivery', 'Quality assurance', 'Team collaboration', 'Process improvement'],
      'Senior': ['Team mentoring', 'Customer success', 'Escalation ownership', 'Cross-functional work', 'Analytics'],
      'Lead': ['Team leadership', 'Strategy development', 'Metrics ownership', 'Hiring and training', 'Executive reporting']
    },
    toolsAndTechnologies: ['Zendesk', 'Intercom', 'Freshdesk', 'Salesforce Service Cloud', 'Slack', 'Zoom', 'Confluence'],
    keyMetrics: ['CSAT score', 'First response time', 'Resolution time', 'Ticket volume', 'Customer retention'],
    commonProjects: ['Knowledge base development', 'Process automation', 'Training programs', 'Tool implementation'],
    industryTerminology: ['First contact resolution', 'Ticket backlog', 'SLA', 'NPS', 'Customer health score', 'Churn prevention'],
    certifications: ['HDI Support Center Analyst', 'ITIL Foundation', 'Zendesk Support Admin'],
    careerProgression: 'Support Agent → Senior Agent → Team Lead → Support Manager → Director of Support → VP of Customer Experience'
  }
};

// Function to normalize job titles for matching
function normalizeJobTitle(title: string): string {
  return title.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/sr\.?|snr\.?/i, 'senior')
    .replace(/jr\.?|jnr\.?/i, 'junior')
    .replace(/mgr\.?/i, 'manager')
    .replace(/engr\.?|eng\.?/i, 'engineer')
    .replace(/dev\.?/i, 'developer')
    .trim();
}

// Function to find the best matching role knowledge
function findRoleKnowledge(jobTitle: string): RoleKnowledge | null {
  const normalized = normalizeJobTitle(jobTitle);

  // Direct match
  if (ROLE_KNOWLEDGE_BASE[normalized]) {
    return ROLE_KNOWLEDGE_BASE[normalized];
  }

  // Partial match - check if any key is contained in the title or vice versa
  for (const [role, knowledge] of Object.entries(ROLE_KNOWLEDGE_BASE)) {
    if (normalized.includes(role) || role.includes(normalized)) {
      return knowledge;
    }
  }

  // Keyword-based matching
  const keywords: Record<string, string> = {
    'frontend': 'frontend developer',
    'front-end': 'frontend developer',
    'react': 'frontend developer',
    'vue': 'frontend developer',
    'angular': 'frontend developer',
    'backend': 'backend developer',
    'back-end': 'backend developer',
    'api': 'backend developer',
    'fullstack': 'fullstack developer',
    'full-stack': 'fullstack developer',
    'full stack': 'fullstack developer',
    'data analyst': 'data analyst',
    'analyst': 'data analyst',
    'data scientist': 'data scientist',
    'machine learning': 'data scientist',
    'ml engineer': 'data scientist',
    'ai engineer': 'data scientist',
    'devops': 'devops engineer',
    'sre': 'devops engineer',
    'platform': 'devops engineer',
    'infrastructure': 'devops engineer',
    'cloud': 'devops engineer',
    'product manager': 'product manager',
    'product owner': 'product manager',
    'ui': 'ui/ux designer',
    'ux': 'ui/ux designer',
    'designer': 'ui/ux designer',
    'graphic': 'ui/ux designer',
    'marketing': 'marketing manager',
    'digital marketing': 'marketing manager',
    'sales': 'sales representative',
    'account executive': 'sales representative',
    'business development': 'sales representative',
    'accountant': 'accountant',
    'finance': 'accountant',
    'bookkeeper': 'accountant',
    'hr': 'hr manager',
    'human resources': 'hr manager',
    'recruiter': 'hr manager',
    'talent': 'hr manager',
    'project manager': 'project manager',
    'scrum master': 'project manager',
    'agile': 'project manager',
    'customer support': 'customer support',
    'customer service': 'customer support',
    'support specialist': 'customer support',
    'help desk': 'customer support'
  };

  for (const [keyword, role] of Object.entries(keywords)) {
    if (normalized.includes(keyword)) {
      return ROLE_KNOWLEDGE_BASE[role];
    }
  }

  return null;
}

export async function generateJobDescription(
  jobTitle: string,
  companyName?: string,
  location?: string,
  metadata?: {
    employmentType?: string;
    workplaceType?: string;
    seniorityLevel?: string;
    industry?: string;
    certifications?: string;
    languagesRequired?: Array<{ language: string; fluency: string }>;
  }
): Promise<string> {
  try {
    // Build structured job profile from all available metadata
    const employmentType = metadata?.employmentType || 'Full-time';
    const workplaceType = metadata?.workplaceType || 'On-site';
    const seniorityLevel = metadata?.seniorityLevel || 'Mid-level';
    const industry = metadata?.industry || 'Technology';
    const certifications = metadata?.certifications;
    const languagesRequired = metadata?.languagesRequired || [];
    const jobLocation = location || 'Cairo, Egypt';

    // Build language requirements string
    const languageDetails = languagesRequired.length > 0
      ? languagesRequired.map(l => `${l.language} (${l.fluency})`).join(', ')
      : 'Arabic and English preferred';

    // Define seniority-specific expectations
    const seniorityExpectations: Record<string, { yearsExp: string; leadership: string; scope: string }> = {
      'Internship': { yearsExp: 'No prior experience required', leadership: 'Learning and assisting senior team members', scope: 'Supporting tasks and gaining practical experience' },
      'Entry-level': { yearsExp: '0-1 years of experience', leadership: 'Individual contributor with guidance', scope: 'Executing assigned tasks with increasing independence' },
      'Junior': { yearsExp: '1-2 years of experience', leadership: 'Individual contributor', scope: 'Handling standard tasks with moderate supervision' },
      'Mid-level': { yearsExp: '3-5 years of experience', leadership: 'May mentor junior team members', scope: 'Independently managing projects and deliverables' },
      'Senior': { yearsExp: '5-8 years of experience', leadership: 'Leading projects and mentoring others', scope: 'Driving initiatives and making technical/strategic decisions' },
      'Lead': { yearsExp: '8+ years of experience', leadership: 'Managing teams and cross-functional collaboration', scope: 'Setting direction, architecture decisions, and team leadership' },
    };

    const seniorityDetails = seniorityExpectations[seniorityLevel] || seniorityExpectations['Mid-level'];

    // Look up role-specific knowledge for accuracy
    const roleKnowledge = findRoleKnowledge(jobTitle);

    // Build role-specific context from knowledge base
    let roleSpecificContext = '';
    if (roleKnowledge) {
      const senioritySkills = roleKnowledge.technicalSkills[seniorityLevel] || roleKnowledge.technicalSkills['Mid-level'];
      roleSpecificContext = `
=== ACCURATE ROLE-SPECIFIC INFORMATION (USE THIS) ===
This is verified industry-standard information for this role. Use these specifics to ensure accuracy.

**Core Responsibilities for ${jobTitle}:**
${roleKnowledge.coreResponsibilities.slice(0, 6).map(r => `- ${r}`).join('\n')}

**Required Technical Skills for ${seniorityLevel} level:**
${senioritySkills.join(', ')}

**Industry-Standard Tools & Technologies:**
${roleKnowledge.toolsAndTechnologies.slice(0, 8).join(', ')}

**Key Performance Metrics for this role:**
${roleKnowledge.keyMetrics.join(', ')}

**Common Project Types:**
${roleKnowledge.commonProjects.join(', ')}

**Industry Terminology to use naturally:**
${roleKnowledge.industryTerminology.join(', ')}

**Relevant Certifications:**
${roleKnowledge.certifications.join(', ')}

**Career Progression Path:**
${roleKnowledge.careerProgression}

IMPORTANT: Use the above specifics in your description. Do NOT make up different responsibilities or skills - use these verified ones adapted to the context.
`;
    }

    const prompt = `You are creating a job description for a **${seniorityLevel} ${jobTitle}** position${companyName ? ` at ${companyName}` : ''} located in **${jobLocation}**.

=== JOB PROFILE ===
• Position: ${jobTitle}
• Seniority Level: ${seniorityLevel}
• Employment Type: ${employmentType}
• Workplace Arrangement: ${workplaceType}
• Industry: ${industry}
• Location: ${jobLocation}
${certifications ? `• Required Certifications: ${certifications}` : ''}
• Language Requirements: ${languageDetails}

=== SENIORITY CONTEXT ===
• Experience Level: ${seniorityDetails.yearsExp}
• Leadership Expectations: ${seniorityDetails.leadership}
• Role Scope: ${seniorityDetails.scope}
${roleSpecificContext}
=== GENERATION INSTRUCTIONS ===

Generate a compelling, role-specific job description that is TAILORED to this exact position. DO NOT generate generic descriptions.

**CRITICAL ACCURACY REQUIREMENTS:**
1. Only mention technologies, tools, and skills that are ACTUALLY used by ${jobTitle} professionals
2. Responsibilities must be REALISTIC for what a ${seniorityLevel} ${jobTitle} actually does day-to-day
3. Do NOT inflate requirements or add buzzwords that don't apply to this role
4. If this is a ${seniorityLevel} role, the scope and complexity must match that level EXACTLY
5. Use industry-standard terminology, not generic corporate language

**Structure your response with these sections:**

**About the Role**
- Write a compelling 2-3 sentence hook that captures what makes this ${seniorityLevel} ${jobTitle} role exciting
- Clearly state this is a ${employmentType} ${workplaceType} position
- Mention the industry context (${industry}) naturally

**What You'll Do**
- List 5-7 key responsibilities that are SPECIFIC to a ${seniorityLevel} ${jobTitle}
- ${roleKnowledge ? 'Use the verified responsibilities provided above, adapted to this context' : 'Research common responsibilities for this role'}
- Adjust complexity based on seniority: ${seniorityLevel} means ${seniorityDetails.scope}
- For ${workplaceType} roles, mention relevant collaboration aspects
- Include responsibilities appropriate for the ${industry} industry

**What You'll Bring**
- Experience: ${seniorityDetails.yearsExp} in relevant fields
- ${roleKnowledge ? 'Use the verified technical skills provided above' : 'List realistic technical skills for this role'}
${certifications ? `- Required: ${certifications}` : ''}
- Language proficiency: ${languageDetails}

**Why Join Us**
- Growth opportunities aligned with ${seniorityLevel} progression
- ${roleKnowledge ? `Career path: ${roleKnowledge.careerProgression}` : 'Mention growth trajectory'}
- Benefits of ${workplaceType} work arrangement

=== TONE & STYLE ===
- Professional yet engaging, suitable for Egyptian job market
- Confident and clear, avoiding vague language
- Specific to ${industry} industry terminology and practices
- Appropriate for ${seniorityLevel} candidates (not too junior, not too senior)
- ${employmentType === 'Internship' ? 'Emphasize learning opportunities and mentorship' : employmentType === 'Freelance' || employmentType === 'Contract' ? 'Highlight project scope and flexibility' : 'Emphasize career growth and team culture'}

=== OUTPUT FORMAT ===
Use markdown formatting with **bold** headers. Keep the description focused and scannable (around 400-500 words). Make every sentence purposeful and specific to THIS role.`;

    const systemPrompt = `You are an expert talent acquisition specialist with deep knowledge of the ${industry} industry and the Egyptian job market. Your job descriptions are known for being ACCURATE, specific, and highly effective at attracting qualified ${seniorityLevel}-level candidates.

CRITICAL ACCURACY PRINCIPLES:
- NEVER fabricate or guess technical skills - only include skills that are actually used in this role
- NEVER inflate requirements beyond what the seniority level actually requires
- NEVER use vague buzzwords like "synergy", "leverage", "cutting-edge" without specific context
- Responsibilities must reflect what this role ACTUALLY does, not aspirational or inflated duties
- Match tone and complexity EXACTLY to the seniority level - an Entry-level role should feel accessible, a Lead role should feel strategic
- If role-specific information is provided, USE IT - it's verified industry data

Write descriptions that qualified candidates would recognize as accurately describing their profession.`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_JOB_DESCRIPTION || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500,
      }),
      {
        requestType: "job_description_generation",
        model: process.env.OPENAI_MODEL_JOB_DESCRIPTION || "gpt-4o-mini",
        requestData: { jobTitle, companyName, location, metadata, prompt, hasRoleKnowledge: !!roleKnowledge },
        metadata: { jobTitle, companyName, seniorityLevel, employmentType, workplaceType, industry }
      }
    );

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate job description: " + (error as Error).message);
  }
}

export async function generateJobRequirements(
  jobTitle: string,
  jobDescription?: string,
  metadata?: {
    employmentType?: string;
    workplaceType?: string;
    seniorityLevel?: string;
    industry?: string;
    certifications?: string;
    languagesRequired?: Array<{ language: string; fluency: string }>;
  }
): Promise<string> {
  try {
    // Build structured job profile from all available metadata
    const employmentType = metadata?.employmentType || 'Full-time';
    const workplaceType = metadata?.workplaceType || 'On-site';
    const seniorityLevel = metadata?.seniorityLevel || 'Mid-level';
    const industry = metadata?.industry || 'Technology';
    const certifications = metadata?.certifications;
    const languagesRequired = metadata?.languagesRequired || [];

    // Build language requirements string
    const languageDetails = languagesRequired.length > 0
      ? languagesRequired.map(l => `${l.language} (${l.fluency})`).join(', ')
      : null;

    // Define seniority-specific requirements calibration
    const seniorityRequirements: Record<string, {
      yearsExp: string;
      education: string;
      leadershipExpectation: string;
      technicalDepth: string;
    }> = {
      'Internship': {
        yearsExp: 'No prior professional experience required',
        education: 'Currently enrolled in or recently graduated from relevant degree program',
        leadershipExpectation: 'Willingness to learn and take direction',
        technicalDepth: 'Basic understanding of fundamental concepts'
      },
      'Entry-level': {
        yearsExp: '0-1 years of relevant experience',
        education: "Bachelor's degree in relevant field or equivalent practical experience",
        leadershipExpectation: 'Self-motivated with ability to work under guidance',
        technicalDepth: 'Foundational knowledge with eagerness to develop skills'
      },
      'Junior': {
        yearsExp: '1-2 years of hands-on experience',
        education: "Bachelor's degree in relevant field",
        leadershipExpectation: 'Collaborative team player',
        technicalDepth: 'Working knowledge of core tools and methodologies'
      },
      'Mid-level': {
        yearsExp: '3-5 years of progressive experience',
        education: "Bachelor's degree required; Master's preferred",
        leadershipExpectation: 'Ability to mentor junior colleagues and work independently',
        technicalDepth: 'Strong proficiency in key technologies with proven track record'
      },
      'Senior': {
        yearsExp: '5-8 years of demonstrated expertise',
        education: "Bachelor's degree required; Master's or advanced certifications preferred",
        leadershipExpectation: 'Experience leading projects and mentoring team members',
        technicalDepth: 'Deep expertise with ability to architect solutions and make technical decisions'
      },
      'Lead': {
        yearsExp: '8+ years of extensive experience',
        education: "Bachelor's degree required; Master's or MBA strongly preferred",
        leadershipExpectation: 'Proven leadership experience managing teams and cross-functional initiatives',
        technicalDepth: 'Expert-level mastery with strategic vision and industry thought leadership'
      },
    };

    const seniorityDetails = seniorityRequirements[seniorityLevel] || seniorityRequirements['Mid-level'];

    // Build workplace-specific requirements
    const workplaceRequirements: Record<string, string> = {
      'Remote': 'Self-disciplined with excellent time management; reliable home office setup and stable internet connection; experience with remote collaboration tools',
      'Hybrid': 'Flexibility to work both on-site and remotely; ability to maintain productivity across different work environments',
      'On-site': 'Ability to commute to office location; collaborative in-person work style'
    };

    // Look up role-specific knowledge for accuracy
    const roleKnowledge = findRoleKnowledge(jobTitle);

    // Build verified skills and tools section
    let verifiedSkillsSection = '';
    if (roleKnowledge) {
      const senioritySkills = roleKnowledge.technicalSkills[seniorityLevel] || roleKnowledge.technicalSkills['Mid-level'];
      verifiedSkillsSection = `
=== VERIFIED ROLE-SPECIFIC DATA (USE THIS FOR ACCURACY) ===
This is industry-verified information. Use these exact skills and tools - do not invent others.

**Verified Technical Skills for ${seniorityLevel} ${jobTitle}:**
${senioritySkills.join(', ')}

**Industry-Standard Tools & Technologies:**
${roleKnowledge.toolsAndTechnologies.join(', ')}

**Relevant Certifications for this role:**
${roleKnowledge.certifications.join(', ')}

**Key Performance Metrics (what success looks like):**
${roleKnowledge.keyMetrics.join(', ')}

**Common Project Types they should have experience with:**
${roleKnowledge.commonProjects.join(', ')}

**Industry Terminology they should understand:**
${roleKnowledge.industryTerminology.join(', ')}

CRITICAL: Only require skills from the verified list above. Do NOT add skills that aren't actually used by ${jobTitle} professionals.
`;
    }

    const prompt = `You are generating job requirements for a **${seniorityLevel} ${jobTitle}** position in the **${industry}** industry.

=== COMPLETE JOB PROFILE ===
• Position: ${jobTitle}
• Seniority Level: ${seniorityLevel}
• Employment Type: ${employmentType}
• Workplace: ${workplaceType}
• Industry: ${industry}
${certifications ? `• Mandatory Certifications: ${certifications}` : ''}
${languageDetails ? `• Language Requirements: ${languageDetails}` : ''}

=== SENIORITY CALIBRATION ===
• Experience Requirement: ${seniorityDetails.yearsExp}
• Education Baseline: ${seniorityDetails.education}
• Leadership Expectation: ${seniorityDetails.leadershipExpectation}
• Technical Depth: ${seniorityDetails.technicalDepth}

=== WORKPLACE REQUIREMENTS ===
${workplaceRequirements[workplaceType] || workplaceRequirements['On-site']}
${verifiedSkillsSection}
${jobDescription ? `=== JOB DESCRIPTION CONTEXT ===\n${jobDescription}\n` : ''}
=== GENERATION INSTRUCTIONS ===

Generate SPECIFIC, CALIBRATED requirements for this exact role. Requirements should be REALISTIC for the Egyptian job market and appropriate for ${seniorityLevel} candidates.

**CRITICAL ACCURACY REQUIREMENTS:**
1. ${roleKnowledge ? 'ONLY use skills from the verified list above - do NOT invent additional skills' : 'Only list skills that are ACTUALLY used by professionals in this role'}
2. Match skill depth EXACTLY to the seniority level - ${seniorityLevel} candidates should NOT be expected to have ${seniorityLevel === 'Internship' || seniorityLevel === 'Entry-level' ? 'senior-level expertise' : seniorityLevel === 'Junior' ? 'mid-level expertise' : 'skills beyond their level'}
3. Do NOT pad requirements with generic filler like "attention to detail" or "works well under pressure" unless specifically relevant
4. Every requirement must be VERIFIABLE in an interview or resume

**Structure your response with these sections:**

## Required Qualifications (Must-Have)

**Experience**
- Specify: ${seniorityDetails.yearsExp}
- Include specific project types or domains relevant to ${industry}
- ${seniorityLevel === 'Internship' || seniorityLevel === 'Entry-level' ? 'Academic projects, internships, or personal projects count' : 'Require demonstrable professional experience'}

**Technical Skills**
- ${roleKnowledge ? `Use ONLY from verified list: ${roleKnowledge.technicalSkills[seniorityLevel]?.join(', ') || 'Use appropriate level skills'}` : 'List 5-8 core technical skills specific to this role'}
- Calibrate to ${seniorityLevel} level: ${seniorityDetails.technicalDepth}
- Include proficiency levels where appropriate (e.g., "Proficient in React" vs "Familiar with React")

**Education & Certifications**
- ${seniorityDetails.education}
${certifications ? `- REQUIRED: ${certifications}` : roleKnowledge ? `- Relevant: ${roleKnowledge.certifications.slice(0, 2).join(' or ')}` : '- List relevant certifications'}

${languageDetails ? `**Language Requirements**\n- ${languageDetails}\n- Specify context: written documentation, verbal communication, client-facing, etc.` : ''}

## Preferred Qualifications (Nice-to-Have)

- ${roleKnowledge ? `Advanced skills: ${roleKnowledge.technicalSkills['Senior']?.slice(-2).join(', ') || 'Advanced certifications'}` : 'Additional certifications or advanced skills'}
- ${roleKnowledge ? `Additional tools: ${roleKnowledge.toolsAndTechnologies.slice(-3).join(', ')}` : 'Bonus technical skills or emerging technologies'}
- Industry-specific knowledge that differentiates top candidates
- Keep this section to 3-5 items maximum - these should NOT be barriers

## Competencies & Soft Skills

- ${seniorityDetails.leadershipExpectation}
- Communication skills relevant to ${workplaceType} work (${workplaceType === 'Remote' ? 'strong written communication, async collaboration' : 'verbal and in-person collaboration'})
- ${seniorityLevel === 'Internship' || seniorityLevel === 'Entry-level' ? 'Eagerness to learn, receptiveness to feedback' : seniorityLevel === 'Junior' ? 'Growing independence, proactive communication' : 'Problem-solving, decision-making, stakeholder management'}

=== CALIBRATION RULES ===
1. DO NOT over-inflate requirements - ${seniorityLevel === 'Internship' ? 'Interns should NOT need years of experience' : seniorityLevel === 'Entry-level' ? 'Entry-level should focus on potential, not extensive experience' : seniorityLevel === 'Junior' ? 'Junior roles need some experience but not mastery' : 'Match expectations to experience level'}
2. Each skill listed should be something you would actually ASK about in an interview
3. Distinguish clearly between REQUIRED (dealbreakers) and PREFERRED (nice-to-haves)
4. ${roleKnowledge ? 'Stick to the verified skills list - do not add unrelated technologies' : 'Only include skills actually used in this profession'}

=== OUTPUT FORMAT ===
Use markdown with ## headers and bullet points. Be specific and actionable. Each requirement should help hiring managers screen candidates effectively.`;

    const systemPrompt = `You are a senior talent acquisition expert specializing in ${industry} roles in the Egyptian market. You craft requirements that are ACCURATE and REALISTIC.

CRITICAL ACCURACY PRINCIPLES:
- NEVER pad requirements with generic filler skills
- NEVER require skills that aren't actually used by ${jobTitle} professionals
- NEVER over-inflate seniority expectations - a ${seniorityLevel} role should have ${seniorityLevel}-appropriate requirements
- ${roleKnowledge ? 'You have verified industry data - USE IT and stick to it' : 'Only include skills you are confident are used in this profession'}
- Every requirement should be something you can verify in an interview

You understand that:
- Overly demanding requirements for junior roles drive away good candidates
- Generic requirements fail to differentiate candidates
- Inaccurate skill requirements waste everyone's time
- Good requirements are SPECIFIC, REALISTIC, and VERIFIABLE`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_JOB_REQUIREMENTS || "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1400,
      }),
      {
        requestType: "job_requirements_generation",
        model: process.env.OPENAI_MODEL_JOB_REQUIREMENTS || "gpt-4o",
        requestData: { jobTitle, jobDescription, metadata, prompt, hasRoleKnowledge: !!roleKnowledge },
        metadata: { jobTitle, seniorityLevel, employmentType, workplaceType, industry }
      }
    );

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate job requirements: " + (error as Error).message);
  }
}

export async function extractTechnicalSkills(jobTitle: string, jobDescription: string): Promise<string[]> {
  try {
    // First, check if we have verified skills for this role
    const roleKnowledge = findRoleKnowledge(jobTitle);

    // If we have verified role knowledge, use it to guide extraction
    let verifiedSkillsContext = '';
    if (roleKnowledge) {
      verifiedSkillsContext = `\n\nVERIFIED SKILLS for this role type (prioritize these): ${roleKnowledge.toolsAndTechnologies.join(', ')}`;
    }

    // Optimize prompt for faster response with accuracy guidance
    const prompt = `Job: "${jobTitle}"
Description: "${jobDescription.slice(0, 500)}"
${verifiedSkillsContext}

Extract 6-8 most relevant TECHNICAL skills that professionals in this role ACTUALLY use.
- Only include real tools, technologies, and technical competencies
- Do NOT include soft skills like "communication" or "teamwork"
- Do NOT include generic terms like "problem solving" or "attention to detail"
- Use proper capitalization (e.g., "JavaScript" not "javascript", "AWS" not "aws")

Return JSON format: {"skills": ["skill1", "skill2"]}`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_TECHNICAL_SKILLS || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You extract ONLY technical skills (tools, technologies, programming languages, frameworks, platforms) from job postings. Never include soft skills. Always use proper capitalization. Respond with JSON format: {\"skills\": [\"skill1\", \"skill2\"]}",
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 150,
      }),
      {
        requestType: "technical_skills_extraction",
        model: process.env.OPENAI_MODEL_TECHNICAL_SKILLS || "gpt-4o-mini",
        requestData: { jobTitle, jobDescription: jobDescription.slice(0, 500), hasRoleKnowledge: !!roleKnowledge },
        metadata: { jobTitle }
      }
    );

    const result = JSON.parse(response.choices[0].message.content || '{"skills": []}');
    return result.skills || [];
  } catch (error) {
    console.error("Skills extraction failed:", error);

    // Use role knowledge base for fallback if available
    const roleKnowledge = findRoleKnowledge(jobTitle);
    if (roleKnowledge) {
      return roleKnowledge.toolsAndTechnologies.slice(0, 6);
    }

    // Provide intelligent fallback based on job title keywords
    const title = (jobTitle || "").toLowerCase();

    if (title.includes('react') || title.includes('frontend') || title.includes('front-end')) {
      return ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Git'];
    }
    if (title.includes('backend') || title.includes('back-end') || title.includes('api') || title.includes('server')) {
      return ['Node.js', 'Python', 'SQL', 'REST API', 'Git', 'Docker'];
    }
    if (title.includes('fullstack') || title.includes('full-stack') || title.includes('full stack')) {
      return ['JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'TypeScript'];
    }
    if (title.includes('data scientist') || title.includes('machine learning') || title.includes('ml')) {
      return ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'Pandas', 'scikit-learn'];
    }
    if (title.includes('data analyst') || title.includes('analyst')) {
      return ['Python', 'SQL', 'Excel', 'Tableau', 'Power BI'];
    }
    if (title.includes('devops') || title.includes('sre') || title.includes('platform')) {
      return ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Linux', 'Git'];
    }
    if (title.includes('cloud')) {
      return ['AWS', 'Azure', 'GCP', 'Docker', 'Terraform', 'Linux'];
    }
    if (title.includes('mobile') || title.includes('ios') || title.includes('android')) {
      return ['React Native', 'Swift', 'Kotlin', 'Flutter', 'Git'];
    }
    if (title.includes('product manager') || title.includes('product owner')) {
      return ['Jira', 'Confluence', 'SQL', 'Figma', 'Amplitude'];
    }
    if (title.includes('designer') || title.includes('ui') || title.includes('ux')) {
      return ['Figma', 'Sketch', 'Adobe XD', 'Prototyping', 'User Research'];
    }
    if (title.includes('marketing')) {
      return ['Google Analytics', 'HubSpot', 'SEO', 'Google Ads', 'Social Media'];
    }
    if (title.includes('sales')) {
      return ['Salesforce', 'HubSpot CRM', 'LinkedIn Sales Navigator', 'Outreach'];
    }

    // Generic fallback - return empty to avoid suggesting irrelevant skills
    return [];
  }
}

export async function formatUserProfile(rawProfile: string): Promise<string> {
  try {
    const prompt = `Take this raw candidate profile and format it professionally with proper styling:

"${rawProfile}"

Requirements:
- Use **bold** for important sections like experience, skills, education
- Use *italics* for emphasis on key achievements or specializations  
- Use clear sections with line breaks
- Highlight years of experience, key technologies, and achievements
- Make it scannable and professional
- Keep all original information but improve readability
- Maximum 300 words

Return only the formatted profile text with markdown styling.`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_USER_PROFILE_FORMAT || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
      }),
      {
        requestType: "user_profile_formatting",
        model: process.env.OPENAI_MODEL_USER_PROFILE_FORMAT || "gpt-4o",
        requestData: { rawProfile, prompt },
        metadata: { profileLength: rawProfile.length }
      }
    );

    return response.choices[0].message.content || rawProfile;
  } catch (error) {
    console.error("Failed to format user profile:", error);
    return rawProfile; // Return original if formatting fails
  }
}

export async function generateCandidateMatchRating(
  candidate: any,
  job: any
): Promise<{ score: number; reasoning: string; skillGaps?: string[]; strengths?: string[] }> {
  try {
    // Use the complete user profile from Airtable for comprehensive analysis
    const userProfile = candidate.userProfile || candidate.rawData?.['User profile'] || '';
    
    const prompt = `You are an EXTREMELY STRICT recruiter. Be brutally honest. Do NOT inflate scores. A candidate needs SUBSTANTIAL qualifications to score well.

JOB POSTING DETAILS:
- Title: ${job.title}
- Description: ${job.description}
- Requirements: ${job.requirements || 'Not specified'}
- Location: ${job.location || 'Not specified'}
- Technical Skills Required: ${job.technicalSkills?.join(', ') || 'Not specified'}
- Salary Range: ${job.salaryRange || 'Not specified'}

CANDIDATE PROFILE:
Name: ${candidate.name}

Complete User Profile:
${userProfile}

STRICT SCORING RULES - BE BRUTAL AND HONEST:
- Empty/minimal profiles (like just "rower" or single words): 5-15 points
- No relevant experience or skills: 10-25 points
- Minimal relevant experience with major gaps: 25-40 points
- Some relevant experience but notable gaps: 40-55 points
- Good relevant experience with minor gaps: 55-70 points
- Strong qualifications meeting most requirements: 70-80 points
- Exceptional candidates exceeding most requirements: 80-90 points
- Perfect match with all requirements exceeded: 90-95 points

CRITICAL EVALUATION:
- If the profile has no substantial information, score 5-15
- If there's no relevant experience for this specific job, score 10-25
- If there are major skill gaps, be honest about low scores
- Only give high scores (70+) to truly qualified candidates
- Be HARSH and REALISTIC

Examples of LOW scores:
- Profile with just "rower" for marketing job = 8-12 points
- No relevant skills or experience = 10-20 points
- Wrong industry/field = 15-25 points

Respond with JSON in this exact format: { "score": number, "reasoning": "honest explanation of why this specific score was given" }`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_CANDIDATE_MATCH_RATING || "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an EXTREMELY STRICT recruiter who gives brutally honest assessments. Do NOT inflate scores. Be harsh and realistic. Candidates with minimal or irrelevant information should get very low scores (5-25). Only exceptional candidates deserve high scores (75+)."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      }),
      {
        requestType: "candidate_match_rating",
        model: process.env.OPENAI_MODEL_CANDIDATE_MATCH_RATING || "gpt-4o",
        requestData: { candidate, job, prompt },
        metadata: { candidateName: candidate.name, jobTitle: job.title }
      }
    );

    const result = JSON.parse(response.choices[0].message.content || '{"score": 50, "reasoning": "Analysis unavailable"}');
    
    return {
      score: Math.max(1, Math.min(100, result.score || 50)),
      reasoning: result.reasoning || "Match analysis completed using comprehensive profile review.",
      skillGaps: result.skillGaps || [],
      strengths: result.strengths || []
    };

  } catch (error) {
    console.error("Error generating candidate match rating:", error);
    return {
      score: 50,
      reasoning: "Error occurred during candidate analysis. Manual review recommended."
    };
  }
}

export async function analyzeApplicantProfile(
  applicantData: {
    name: string;
    email: string;
    experience?: string;
    skills?: string;
    resume?: string;
    coverLetter?: string;
    location?: string;
    salaryExpectation?: string;
  },
  jobTitle: string,
  jobDescription: string,
  requiredSkills?: string
): Promise<{ profileScore: number; analysis: string; strengths: string[]; improvements: string[] }> {
  try {
    const profile = `
    Name: ${applicantData.name}
    Email: ${applicantData.email}
    Location: ${applicantData.location || 'Not specified'}
    Experience: ${applicantData.experience || 'Not provided'}
    Skills: ${applicantData.skills || 'Not listed'}
    Salary Expectation: ${applicantData.salaryExpectation || 'Not specified'}
    Resume/Background: ${applicantData.resume || 'Not provided'}
    Cover Letter: ${applicantData.coverLetter || 'Not provided'}
    `;

    const prompt = `
    You are an EXTREMELY STRICT and HONEST recruiter. Evaluate this applicant with brutal honesty. DO NOT inflate scores.
    
    JOB DETAILS:
    Position: ${jobTitle}
    Description: ${jobDescription}
    Required Skills: ${requiredSkills || 'Not specified'}
    
    APPLICANT PROFILE:
    ${profile}
    
    STRICT SCORING CRITERIA:
    - Empty/minimal profiles (like just "rower"): 5-15 points
    - No relevant experience: 10-25 points  
    - Some relevant skills but major gaps: 25-45 points
    - Good skills with minor gaps: 45-65 points
    - Strong qualifications: 65-80 points
    - Exceptional fit: 80-90 points
    - Perfect match: 90-95 points
    
    Be BRUTALLY HONEST. If the profile lacks substance, information, or relevant experience, give a very low score.
    
    Respond in JSON format: {
      "profileScore": number,
      "analysis": "honest, direct analysis explaining the low/high score",
      "strengths": ["actual strengths found, empty array if none"],
      "improvements": ["specific areas needing improvement"]
    }
    `;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_APPLICANT_PROFILE_ANALYSIS || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      {
        requestType: "applicant_profile_analysis",
        model: process.env.OPENAI_MODEL_APPLICANT_PROFILE_ANALYSIS || "gpt-4o",
        requestData: { applicantData, jobTitle, jobDescription, requiredSkills, prompt },
        metadata: { jobTitle, applicantName: applicantData.name }
      }
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      profileScore: Math.max(1, Math.min(100, result.profileScore || 50)),
      analysis: result.analysis || "Analysis unavailable",
      strengths: Array.isArray(result.strengths) ? result.strengths : ["Profile analysis pending"],
      improvements: Array.isArray(result.improvements) ? result.improvements : ["Assessment in progress"]
    };
  } catch (error) {
    console.error("Error analyzing applicant profile:", error);
    return {
      profileScore: 50,
      analysis: "Error analyzing applicant profile",
      strengths: ["Unable to analyze at this time"],
      improvements: ["Profile analysis failed"]
    };
  }
}

export async function generateEmployerQuestions(jobTitle: string, jobDescription?: string, requirements?: string): Promise<string[]> {
  try {
    const prompt = `Generate 3-5 thoughtful, open-ended employer questions for candidates applying to this position:

Job Title: ${jobTitle}
${jobDescription ? `Job Description: ${jobDescription}` : ''}
${requirements ? `Requirements: ${requirements}` : ''}

Create questions that:
- Are specific to this role and industry
- Help assess both technical competency and cultural fit
- Encourage candidates to provide detailed, thoughtful responses
- Go beyond what's already covered in a resume
- Help identify passion, problem-solving ability, and relevant experience

Examples of good questions:
- "Describe a challenging project where you had to [specific skill]. What was your approach and what did you learn?"
- "What interests you most about this role, and how does it align with your career goals?"
- "Tell us about a time when you had to learn a new technology/skill quickly. How did you approach it?"

Respond with JSON in this format: { "questions": ["question1", "question2", "question3"] }`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_EMPLOYER_QUESTIONS || "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert HR professional specializing in interview question design. Generate thoughtful, role-specific employer questions that help identify the best candidates."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      }),
      {
        requestType: "employer_questions_generation",
        model: process.env.OPENAI_MODEL_EMPLOYER_QUESTIONS || "gpt-4o",
        requestData: { jobTitle, jobDescription, requirements, prompt },
        metadata: { jobTitle }
      }
    );

    const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
    return result.questions || [];
  } catch (error) {
    console.error("Error generating employer questions:", error);
    // Provide fallback questions based on job title
    const title = (jobTitle || "").toLowerCase();
    
    if (title.includes('developer') || title.includes('engineer')) {
      return [
        "Describe a challenging technical problem you solved recently. What was your approach?",
        "How do you stay current with new technologies and best practices in your field?",
        "Tell us about a time when you had to work with a difficult codebase or legacy system."
      ];
    }
    if (title.includes('manager') || title.includes('lead')) {
      return [
        "Describe your approach to managing team conflicts and ensuring productive collaboration.",
        "How do you prioritize competing demands and communicate decisions to stakeholders?",
        "Tell us about a time when you had to lead a team through a significant change."
      ];
    }
    if (title.includes('sales') || title.includes('marketing')) {
      return [
        "Describe a challenging sales situation and how you overcame objections to close the deal.",
        "How do you approach building relationships with new clients or customers?",
        "What strategies do you use to stay motivated during difficult periods?"
      ];
    }
    
    // Generic fallback questions
    return [
      "What interests you most about this role and our company?",
      "Describe a challenging situation you faced at work and how you handled it.",
      "Where do you see yourself in your career in the next 2-3 years?"
    ];
  }
}

// ============================================================================
// CONTENT VALIDATION UTILITIES
// These help ensure generated content is accurate and appropriate
// ============================================================================

/**
 * Common buzzwords and filler phrases that should be minimized in job content
 */
const FILLER_PHRASES = [
  'synergy', 'leverage', 'cutting-edge', 'world-class', 'best-in-class',
  'rockstar', 'ninja', 'guru', 'wizard', 'unicorn',
  'paradigm shift', 'disruptive', 'game-changer', 'move the needle',
  'circle back', 'low-hanging fruit', 'boil the ocean', 'think outside the box'
];

/**
 * Skills that are often incorrectly listed as technical skills
 */
const NON_TECHNICAL_SKILLS = [
  'communication', 'teamwork', 'problem solving', 'problem-solving',
  'attention to detail', 'time management', 'leadership', 'creativity',
  'critical thinking', 'adaptability', 'work ethic', 'interpersonal',
  'multitasking', 'organization', 'flexibility', 'self-motivated'
];

/**
 * Validates extracted technical skills and filters out non-technical items
 */
export function validateTechnicalSkills(skills: string[]): string[] {
  return skills.filter(skill => {
    const lowerSkill = skill.toLowerCase();
    // Remove non-technical skills
    if (NON_TECHNICAL_SKILLS.some(nonTech => lowerSkill.includes(nonTech))) {
      return false;
    }
    // Remove very short or very long skills (likely errors)
    if (skill.length < 2 || skill.length > 50) {
      return false;
    }
    return true;
  });
}

/**
 * Checks if a job description contains excessive filler/buzzwords
 */
export function checkContentQuality(content: string): {
  hasExcessiveFiller: boolean;
  fillerCount: number;
  suggestions: string[];
} {
  const lowerContent = content.toLowerCase();
  const foundFiller = FILLER_PHRASES.filter(phrase =>
    lowerContent.includes(phrase.toLowerCase())
  );

  return {
    hasExcessiveFiller: foundFiller.length > 2,
    fillerCount: foundFiller.length,
    suggestions: foundFiller.length > 0
      ? [`Consider removing or replacing these phrases: ${foundFiller.join(', ')}`]
      : []
  };
}

/**
 * Validates that seniority-appropriate language is used
 */
export function validateSeniorityLanguage(
  content: string,
  seniorityLevel: string
): { isAppropriate: boolean; issues: string[] } {
  const issues: string[] = [];
  const lowerContent = content.toLowerCase();

  // Check for experience requirements that don't match seniority
  if (seniorityLevel === 'Internship' || seniorityLevel === 'Entry-level') {
    if (lowerContent.includes('5+ years') || lowerContent.includes('5-7 years') ||
        lowerContent.includes('7+ years') || lowerContent.includes('10+ years')) {
      issues.push('Experience requirements too high for entry-level/internship role');
    }
    if (lowerContent.includes('lead a team') || lowerContent.includes('manage a team') ||
        lowerContent.includes('architecting')) {
      issues.push('Leadership/architecture responsibilities not typical for entry-level roles');
    }
  }

  if (seniorityLevel === 'Junior') {
    if (lowerContent.includes('7+ years') || lowerContent.includes('10+ years')) {
      issues.push('Experience requirements too high for junior role');
    }
  }

  if (seniorityLevel === 'Lead' || seniorityLevel === 'Senior') {
    if (lowerContent.includes('no experience') || lowerContent.includes('0-1 year')) {
      issues.push('Experience requirements too low for senior/lead role');
    }
  }

  return {
    isAppropriate: issues.length === 0,
    issues
  };
}

/**
 * Returns verified skills for a given job title if available
 */
export function getVerifiedSkillsForRole(jobTitle: string, seniorityLevel?: string): string[] | null {
  const roleKnowledge = findRoleKnowledge(jobTitle);
  if (!roleKnowledge) return null;

  if (seniorityLevel && roleKnowledge.technicalSkills[seniorityLevel]) {
    return roleKnowledge.technicalSkills[seniorityLevel];
  }

  // Return all tools/technologies as fallback
  return roleKnowledge.toolsAndTechnologies;
}

/**
 * Returns the full role knowledge for export/reference
 */
export function getRoleKnowledge(jobTitle: string): RoleKnowledge | null {
  return findRoleKnowledge(jobTitle);
}

/**
 * Returns list of supported role types
 */
export function getSupportedRoles(): string[] {
  return Object.keys(ROLE_KNOWLEDGE_BASE);
}

/**
 * Generate a personalized offer letter using AI
 */
export async function generateOfferLetter(params: {
  applicantName: string;
  jobTitle: string;
  companyName: string;
  location: string;
  employmentType: string;
  workplaceType: string;
  salaryRange: string;
  benefits: string[];
  customMessage?: string;
  applicantSkills?: string[];
  applicantExperience?: string;
}): Promise<string> {
  const {
    applicantName,
    jobTitle,
    companyName,
    location,
    employmentType,
    workplaceType,
    salaryRange,
    benefits,
    customMessage,
    applicantSkills = [],
    applicantExperience = ''
  } = params;

  const aiPrompt = `Generate a professional job offer letter with the following details:

COMPANY INFORMATION:
- Company Name: ${companyName}
- Position: ${jobTitle}
- Location: ${location}
- Employment Type: ${employmentType}
- Workplace Type: ${workplaceType}
- Compensation: ${salaryRange}

CANDIDATE INFORMATION:
- Name: ${applicantName}
${applicantSkills.length > 0 ? `- Key Skills: ${applicantSkills.slice(0, 5).join(', ')}` : ''}
${applicantExperience ? `- Strengths: ${applicantExperience}` : ''}

${benefits.length > 0 ? `BENEFITS:
${benefits.map((b: string) => `- ${b}`).join('\n')}` : ''}

${customMessage ? `PERSONALIZED MESSAGE FROM HIRING MANAGER:
${customMessage}` : ''}

Please generate a warm, professional offer letter that:
1. Opens with a personalized greeting using the actual candidate name: ${applicantName}
2. ${customMessage ? 'Incorporates the hiring manager\'s personalized message naturally' : 'Includes a brief, genuine statement about why they were selected'}
3. Clearly outlines the position details, compensation, and benefits using the ACTUAL values provided above
4. Maintains a professional yet welcoming tone
5. Includes next steps for the candidate
6. Ends with an enthusiastic closing signed with "${companyName} Hiring Team" (not placeholders like [Your Name] or [Your Position])

CRITICAL REQUIREMENTS:
- DO NOT use any placeholders like [Your Name], [Your Position], [Specific Date], (date), etc.
- Use ONLY the actual information provided above
- If a specific deadline date is needed for accepting the offer, use "within 7 business days" or similar wording instead of placeholder dates
- The letter should be complete and ready to send as-is, without requiring any manual edits to fill in blanks
- Sign the letter as "${companyName} Hiring Team" - do not use individual names or placeholder names

Format the letter as plain text (not markdown), well-structured with proper spacing and sections. Make it feel personal and genuine, not generic.`;

  try {
    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_OFFER_LETTER || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR professional and offer letter writer. Create compelling, professional, and personalized job offer letters that make candidates excited to join the company.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
      {
        requestType: "offer_letter_generation",
        model: process.env.OPENAI_MODEL_OFFER_LETTER || 'gpt-4',
        requestData: { ...params, aiPrompt },
        metadata: { applicantName, jobTitle, companyName }
      }
    );

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('⚠️  AI offer letter generation failed:', error);
    throw error;
  }
}
