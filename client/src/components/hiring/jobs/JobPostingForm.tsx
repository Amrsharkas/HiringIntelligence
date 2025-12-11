import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Sparkles, Loader2, MapPin, DollarSign, Plus, HelpCircle, Mail, Languages, ClipboardList, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { AssessmentQuestionsBuilder } from "@/components/AssessmentQuestionsBuilder";
import type { AssessmentQuestion } from "@shared/schema";

const jobFormSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  description: z.string().min(1, "Job description is required"),
  requirements: z.string().min(1, "Job requirements are required"),
  location: z.string().min(1, "Location is required"),
  salaryRange: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  salaryNegotiable: z.boolean().default(false),
  softSkills: z.array(z.string()).default([]),
  technicalSkills: z.array(z.string()).default([]),
  employerQuestions: z.array(z.string()).default([]),
  aiPrompt: z.string().optional(),
  employmentType: z.string().min(1, "Employment type is required"),
  workplaceType: z.string().min(1, "Workplace type is required"),
  seniorityLevel: z.string().min(1, "Seniority level is required"),
  industry: z.string().min(1, "Industry is required"),
  languagesRequired: z.array(z.object({
    language: z.string(),
    fluency: z.string()
  })).default([]),
  interviewLanguage: z.string().optional(),
  certifications: z.string().optional(),
  scoreMatchingThreshold: z.coerce.number().int().min(0).max(100).default(30),
  emailInviteThreshold: z.coerce.number().int().min(0).max(100).default(30),
  autoShortlistThreshold: z.coerce.number().int().min(0).max(100).default(70),
  autoDeniedThreshold: z.coerce.number().int().min(0).max(100).default(30),
});

type JobFormData = z.infer<typeof jobFormSchema>;

const SALARY_RANGES = [
  "$30,000 - $50,000", "$50,000 - $75,000", "$75,000 - $100,000",
  "$100,000 - $125,000", "$125,000 - $150,000", "$150,000 - $200,000",
  "$200,000+", "Competitive", "To be discussed"
];

const EGP_SALARY_RANGES = [
  "8K–12K EGP", "12K–18K EGP", "18K–25K EGP", "25K–35K EGP",
  "35K–50K EGP", "50K–75K EGP", "75K–100K EGP", "100K+ EGP"
];

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Freelance", "Contract", "Internship"];
const WORKPLACE_TYPES = ["On-site", "Remote", "Hybrid"];
const SENIORITY_LEVELS = ["Internship", "Entry-level", "Junior", "Mid-level", "Senior", "Lead"];
const INDUSTRIES = [
  "Technology", "Marketing", "Education", "Finance", "Legal", "Healthcare",
  "Retail", "Manufacturing", "Consulting", "Real Estate", "Media", "Government",
  "Non-profit", "Construction", "Transportation", "Other"
];
const LANGUAGES = ["Arabic", "English", "French", "German", "Spanish", "Italian", "Turkish", "Chinese", "Japanese", "Russian"];
const INTERVIEW_LANGUAGES = ["Arabic", "English"];
const FLUENCY_LEVELS = ["Basic", "Intermediate", "Fluent", "Native"];

const TECHNICAL_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++", "C#",
  "PHP", "Ruby", "Go", "Rust", "Swift", "Kotlin", "HTML", "CSS", "SQL", "MongoDB",
  "PostgreSQL", "MySQL", "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP",
  "Git", "Linux", "Windows", "macOS", "Android", "iOS", "Flutter", "React Native",
  "Vue.js", "Angular", "Django", "Flask", "Express.js", "Spring", "Laravel", "Rails",
  "TensorFlow", "PyTorch", "Machine Learning", "Data Science", "DevOps", "CI/CD"
];

const SOFT_SKILLS = [
  "Communication", "Leadership", "Problem Solving", "Critical Thinking", "Creativity",
  "Teamwork", "Adaptability", "Time Management", "Project Management", "Mentoring",
  "Public Speaking", "Negotiation", "Conflict Resolution", "Emotional Intelligence",
  "Strategic Thinking", "Innovation", "Analytical Skills", "Attention to Detail",
  "Customer Focus", "Cultural Awareness", "Decision Making", "Collaboration"
];

interface JobPostingFormProps {
  editJob?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JobPostingForm({ editJob, onSuccess, onCancel }: JobPostingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSoftSkills, setSelectedSoftSkills] = useState<string[]>([]);
  const [selectedTechnicalSkills, setSelectedTechnicalSkills] = useState<string[]>([]);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingRequirements, setIsGeneratingRequirements] = useState(false);
  const [dynamicTechnicalSkills, setDynamicTechnicalSkills] = useState<string[]>([]);
  const [employerQuestions, setEmployerQuestions] = useState<string[]>(['']);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedLanguages, setSelectedLanguages] = useState<Array<{language: string, fluency: string}>>([]);
  const [usesEgpSalary, setUsesEgpSalary] = useState(false);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [lastExtractedText, setLastExtractedText] = useState("");

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "", description: "", requirements: "", location: "",
      salaryRange: "", salaryMin: "", salaryMax: "", salaryNegotiable: false,
      softSkills: [], technicalSkills: [], employerQuestions: [], aiPrompt: "",
      employmentType: "", workplaceType: "", seniorityLevel: "", industry: "",
      languagesRequired: [], certifications: "",
      scoreMatchingThreshold: 30, emailInviteThreshold: 30,
      autoShortlistThreshold: 70, autoDeniedThreshold: 30,
    },
  });

  const { data: organization } = useQuery<{ id: number; name: string; companyName?: string }>({
    queryKey: ["/api/organizations/current"],
    retry: false,
  });

  // Reset form when editJob changes
  useEffect(() => {
    if (editJob) {
      form.reset({
        title: editJob.title || "",
        description: editJob.description || "",
        requirements: editJob.requirements || "",
        location: editJob.location || "",
        salaryRange: editJob.salaryRange || "",
        salaryMin: editJob.salaryMin || "",
        salaryMax: editJob.salaryMax || "",
        salaryNegotiable: editJob.salaryNegotiable || false,
        softSkills: editJob.softSkills || [],
        technicalSkills: editJob.technicalSkills || [],
        employerQuestions: editJob.employerQuestions || [],
        aiPrompt: editJob.aiPrompt || "",
        scoreMatchingThreshold: editJob.scoreMatchingThreshold ?? 30,
        emailInviteThreshold: editJob.emailInviteThreshold ?? 30,
        autoShortlistThreshold: editJob.autoShortlistThreshold ?? 70,
        autoDeniedThreshold: editJob.autoDeniedThreshold ?? 30,
        employmentType: editJob.employmentType || "",
        workplaceType: editJob.workplaceType || "",
        seniorityLevel: editJob.seniorityLevel || "",
        industry: editJob.industry || "",
        languagesRequired: editJob.languagesRequired || [],
        interviewLanguage: editJob.interviewLanguage || "no-preference",
        certifications: editJob.certifications || "",
      });
      setSelectedSoftSkills(editJob.softSkills || []);
      setSelectedTechnicalSkills(editJob.technicalSkills || []);
      setEmployerQuestions(editJob.employerQuestions?.length > 0 ? editJob.employerQuestions : ['']);
      setSelectedLanguages(editJob.languagesRequired || []);
      setUsesEgpSalary(editJob.salaryRange?.includes('EGP') || false);
      setAssessmentQuestions(editJob.assessmentQuestions || []);
    }
  }, [editJob, form]);

  // Dynamic technical skills extraction
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if ((name === "title" || name === "description") && (value.title || value.description)) {
        const currentText = `${value.title || ""} ${value.description || ""}`;
        if (currentText.length > 10 && currentText !== lastExtractedText) {
          const extractSkills = async () => {
            setIsExtractingSkills(true);
            try {
              const response = await apiRequest("POST", "/api/ai/extract-skills", {
                jobTitle: value.title || "",
                jobDescription: value.description || "",
              });
              const data = await response.json();
              setDynamicTechnicalSkills(data.skills || []);
              setLastExtractedText(currentText);
            } catch (error) {
              if (value.title) {
                setDynamicTechnicalSkills(getFallbackSkills(value.title));
              }
            } finally {
              setIsExtractingSkills(false);
            }
          };
          const debounceTimer = setTimeout(extractSkills, 200);
          return () => clearTimeout(debounceTimer);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, lastExtractedText]);

  const getFallbackSkills = (jobTitle: string): string[] => {
    const title = jobTitle.toLowerCase();
    if (title.includes('react') || title.includes('frontend')) return ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Git'];
    if (title.includes('backend') || title.includes('api')) return ['Node.js', 'Python', 'SQL', 'REST API', 'Git', 'Docker'];
    if (title.includes('fullstack')) return ['JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'TypeScript'];
    if (title.includes('data') || title.includes('analyst')) return ['Python', 'SQL', 'Excel', 'Tableau', 'R', 'Statistics'];
    if (title.includes('devops') || title.includes('cloud')) return ['AWS', 'Docker', 'Kubernetes', 'Linux', 'Git', 'CI/CD'];
    if (title.includes('mobile') || title.includes('ios') || title.includes('android')) return ['React Native', 'Swift', 'Kotlin', 'Flutter', 'Git'];
    return ['JavaScript', 'Git', 'Communication', 'Problem Solving'];
  };

  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const response = await apiRequest("POST", "/api/job-postings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Job posting created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings/count"] });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create job posting. Please try again.", variant: "destructive" });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const response = await apiRequest("PUT", `/api/job-postings/${editJob.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Job posting updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings"] });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update job posting. Please try again.", variant: "destructive" });
    },
  });

  const generateDescription = async () => {
    const formData = form.getValues();
    if (!formData.title) {
      toast({ title: "Missing Information", description: "Please enter a job title first.", variant: "destructive" });
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-description", {
        jobTitle: formData.title,
        employmentType: formData.employmentType,
        workplaceType: formData.workplaceType,
        seniorityLevel: formData.seniorityLevel,
        industry: formData.industry,
        certifications: formData.certifications,
        location: formData.location || "Cairo, Egypt",
        languagesRequired: selectedLanguages.filter(lang => lang.language && lang.fluency),
        companyName: organization?.companyName || "Our Company",
      });
      const data = await response.json();
      form.setValue("description", data.description);
      toast({ title: "Description Generated", description: "AI created a comprehensive job description." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate description. Please try again.", variant: "destructive" });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const generateRequirements = async () => {
    const formData = form.getValues();
    if (!formData.title) {
      toast({ title: "Missing Information", description: "Please enter a job title first.", variant: "destructive" });
      return;
    }
    setIsGeneratingRequirements(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-requirements", {
        jobTitle: formData.title,
        employmentType: formData.employmentType,
        workplaceType: formData.workplaceType,
        seniorityLevel: formData.seniorityLevel,
        industry: formData.industry,
        certifications: formData.certifications,
        description: formData.description || "",
        languagesRequired: selectedLanguages.filter(lang => lang.language && lang.fluency),
      });
      const data = await response.json();
      form.setValue("requirements", data.requirements);
      toast({ title: "Requirements Generated", description: "AI created detailed requirements." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate requirements. Please try again.", variant: "destructive" });
    } finally {
      setIsGeneratingRequirements(false);
    }
  };

  const onSubmit = (data: JobFormData) => {
    const validQuestions = employerQuestions.filter(q => q.trim() !== '');
    const validLanguages = selectedLanguages.filter(lang => lang.language && lang.fluency);
    const validAssessmentQuestions = assessmentQuestions.filter(q => q.questionText.trim() !== '');

    const jobData = {
      ...data,
      softSkills: selectedSoftSkills,
      technicalSkills: selectedTechnicalSkills,
      employerQuestions: validQuestions,
      aiPrompt: data.aiPrompt || "",
      languagesRequired: validLanguages,
      interviewLanguage: data.interviewLanguage === "no-preference" ? "" : data.interviewLanguage,
      salaryMin: data.salaryMin ? parseInt(data.salaryMin) : undefined,
      salaryMax: data.salaryMax ? parseInt(data.salaryMax) : undefined,
      assessmentQuestions: validAssessmentQuestions.length > 0 ? validAssessmentQuestions : null,
    };

    if (editJob) {
      updateJobMutation.mutate(jobData);
    } else {
      createJobMutation.mutate(jobData);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Job Details
          </TabsTrigger>
          <TabsTrigger value="assessment" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Assessment
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div>
            <Label htmlFor="title">Job Title</Label>
            <Input id="title" {...form.register("title")} placeholder="e.g., Senior Frontend Developer" className="mt-2" />
            {form.formState.errors.title && <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employment Type</Label>
              <Controller name="employmentType" control={form.control}
                render={({ field }) => (
                  <Combobox options={EMPLOYMENT_TYPES} value={field.value} onValueChange={field.onChange}
                    placeholder="Select employment type..." allowCustomValue={true} className="mt-2" />
                )} />
              {form.formState.errors.employmentType && <p className="text-red-500 text-sm mt-1">{form.formState.errors.employmentType.message}</p>}
            </div>
            <div>
              <Label>Workplace Type</Label>
              <Controller name="workplaceType" control={form.control}
                render={({ field }) => (
                  <Combobox options={WORKPLACE_TYPES} value={field.value} onValueChange={field.onChange}
                    placeholder="Select workplace type..." allowCustomValue={true} className="mt-2" />
                )} />
              {form.formState.errors.workplaceType && <p className="text-red-500 text-sm mt-1">{form.formState.errors.workplaceType.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Seniority Level</Label>
              <Controller name="seniorityLevel" control={form.control}
                render={({ field }) => (
                  <Combobox options={SENIORITY_LEVELS} value={field.value} onValueChange={field.onChange}
                    placeholder="Select seniority level..." allowCustomValue={true} className="mt-2" />
                )} />
              {form.formState.errors.seniorityLevel && <p className="text-red-500 text-sm mt-1">{form.formState.errors.seniorityLevel.message}</p>}
            </div>
            <div>
              <Label>Industry</Label>
              <Controller name="industry" control={form.control}
                render={({ field }) => (
                  <Combobox options={INDUSTRIES} value={field.value} onValueChange={field.onChange}
                    placeholder="Select industry..." allowCustomValue={true} className="mt-2" />
                )} />
              {form.formState.errors.industry && <p className="text-red-500 text-sm mt-1">{form.formState.errors.industry.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" />Location</Label>
              <Input {...form.register("location")} placeholder="e.g., Remote, Cairo, Egypt" className="mt-2" />
              {form.formState.errors.location && <p className="text-red-500 text-sm mt-1">{form.formState.errors.location.message}</p>}
            </div>
            <div>
              <Label className="flex items-center gap-2"><Languages className="w-4 h-4 text-indigo-600" />Interview Language</Label>
              <Controller name="interviewLanguage" control={form.control}
                render={({ field }) => (
                  <Combobox options={["No preference", ...INTERVIEW_LANGUAGES]}
                    value={field.value === "" || !field.value ? "No preference" : field.value}
                    onValueChange={(value) => field.onChange(value === "No preference" ? "no-preference" : value)}
                    placeholder="Select language..." allowCustomValue={true} className="mt-2" />
                )} />
              <p className="text-xs text-slate-500 mt-1">Language for interviews</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2"><HelpCircle className="w-4 h-4 text-orange-600" />Score Matching Threshold</Label>
              <Input type="number" min={0} max={100} {...form.register("scoreMatchingThreshold")} placeholder="30" className="mt-2" />
              <p className="text-xs text-slate-500 mt-1">Only candidates with score ≥ this will be saved.</p>
            </div>
            <div>
              <Label className="flex items-center gap-2"><Mail className="w-4 h-4 text-purple-600" />Email Invite Threshold</Label>
              <Input type="number" min={0} max={100} {...form.register("emailInviteThreshold")} placeholder="30" className="mt-2" />
              <p className="text-xs text-slate-500 mt-1">Candidates with score ≥ this receive email invites.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Auto Shortlist Threshold</Label>
              <Input type="number" min={0} max={100} {...form.register("autoShortlistThreshold")} placeholder="70" className="mt-2" />
              <p className="text-xs text-slate-500 mt-1">Candidates scoring ≥ this after interview are auto-shortlisted.</p>
            </div>
            <div>
              <Label className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" />Auto Denied Threshold</Label>
              <Input type="number" min={0} max={100} {...form.register("autoDeniedThreshold")} placeholder="30" className="mt-2" />
              <p className="text-xs text-slate-500 mt-1">Candidates scoring below this are auto-denied.</p>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-600" />Salary Range</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox checked={usesEgpSalary} onCheckedChange={(checked) => setUsesEgpSalary(checked === true)} />
                <Label className="text-sm">Use Egyptian Pound (EGP)</Label>
              </div>
              <Controller name="salaryRange" control={form.control}
                render={({ field }) => (
                  <Combobox options={usesEgpSalary ? EGP_SALARY_RANGES : SALARY_RANGES}
                    value={field.value} onValueChange={field.onChange}
                    placeholder="Select salary range..." allowCustomValue={true} />
                )} />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
            <Label className="text-sm font-medium">Manual Salary Entry (Optional)</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <Label className="text-xs">Minimum {usesEgpSalary ? 'EGP' : 'USD'}</Label>
                <Input {...form.register("salaryMin")} placeholder={usesEgpSalary ? "8000" : "50000"} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Maximum {usesEgpSalary ? 'EGP' : 'USD'}</Label>
                <Input {...form.register("salaryMax")} placeholder={usesEgpSalary ? "15000" : "75000"} className="mt-1" />
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <Controller name="salaryNegotiable" control={form.control}
                    render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />} />
                  <Label className="text-xs">Negotiable</Label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="description">Job Description</Label>
              <Button type="button" onClick={generateDescription} disabled={isGeneratingDescription}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg">
                {isGeneratingDescription ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                AI Generate
              </Button>
            </div>
            <Textarea id="description" {...form.register("description")} placeholder="Describe the role, responsibilities..." rows={5} className="mt-2" />
            {form.formState.errors.description && <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="requirements">Job Requirements</Label>
              <Button type="button" onClick={generateRequirements} disabled={isGeneratingRequirements}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg">
                {isGeneratingRequirements ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                AI Generate
              </Button>
            </div>
            <Textarea id="requirements" {...form.register("requirements")} placeholder="List required skills, experience..." rows={4} className="mt-2" />
            {form.formState.errors.requirements && <p className="text-red-500 text-sm mt-1">{form.formState.errors.requirements.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Soft Skills</Label>
              <div className="mt-2">
                <Combobox options={SOFT_SKILLS.filter(skill => !selectedSoftSkills.includes(skill))} value=""
                  onValueChange={(value) => {
                    if (value && !selectedSoftSkills.includes(value)) {
                      const newSkills = [...selectedSoftSkills, value];
                      setSelectedSoftSkills(newSkills);
                      form.setValue("softSkills", newSkills);
                    }
                  }}
                  placeholder="Add soft skills..." allowCustomValue={true} />
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedSoftSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {skill}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => {
                        const newSkills = selectedSoftSkills.filter(s => s !== skill);
                        setSelectedSoftSkills(newSkills);
                        form.setValue("softSkills", newSkills);
                      }} />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Technical Skills</Label>
              <div className="mt-2">
                <Combobox options={[...dynamicTechnicalSkills.filter(skill => !selectedTechnicalSkills.includes(skill)),
                  ...TECHNICAL_SKILLS.filter(skill => !selectedTechnicalSkills.includes(skill) && !dynamicTechnicalSkills.includes(skill))]}
                  value="" onValueChange={(value) => {
                    if (value && !selectedTechnicalSkills.includes(value)) {
                      const newSkills = [...selectedTechnicalSkills, value];
                      setSelectedTechnicalSkills(newSkills);
                      form.setValue("technicalSkills", newSkills);
                    }
                  }}
                  placeholder={dynamicTechnicalSkills.length > 0 ? "Add AI-suggested skills..." : "Add technical skills..."} allowCustomValue={true} />
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedTechnicalSkills.map((skill) => {
                    const isAiSuggested = dynamicTechnicalSkills.includes(skill);
                    return (
                      <Badge key={skill} variant="secondary" className={`flex items-center gap-1 ${isAiSuggested ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'}`}>
                        {isAiSuggested && <Sparkles className="w-3 h-3" />}
                        {skill}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => {
                          const newSkills = selectedTechnicalSkills.filter(s => s !== skill);
                          setSelectedTechnicalSkills(newSkills);
                          form.setValue("technicalSkills", newSkills);
                        }} />
                      </Badge>
                    );
                  })}
                </div>
                {isExtractingSkills && (
                  <div className="flex items-center justify-center pt-2">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-xs text-blue-500 ml-2">AI analyzing skills...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label>Languages Required (Optional)</Label>
            <div className="mt-2 space-y-3">
              {selectedLanguages.map((langReq, index) => (
                <div key={index} className="flex gap-3 items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex-1">
                    <Combobox options={LANGUAGES} value={langReq.language}
                      onValueChange={(value) => {
                        const newLanguages = [...selectedLanguages];
                        newLanguages[index] = { ...langReq, language: value };
                        setSelectedLanguages(newLanguages);
                        form.setValue("languagesRequired", newLanguages);
                      }}
                      placeholder="Select language..." allowCustomValue={true} />
                  </div>
                  <div className="flex-1">
                    <Combobox options={FLUENCY_LEVELS} value={langReq.fluency}
                      onValueChange={(value) => {
                        const newLanguages = [...selectedLanguages];
                        newLanguages[index] = { ...langReq, fluency: value };
                        setSelectedLanguages(newLanguages);
                        form.setValue("languagesRequired", newLanguages);
                      }}
                      placeholder="Select fluency..." allowCustomValue={true} />
                  </div>
                  <Button type="button" variant="outline" size="icon"
                    onClick={() => {
                      const newLanguages = selectedLanguages.filter((_, i) => i !== index);
                      setSelectedLanguages(newLanguages);
                      form.setValue("languagesRequired", newLanguages);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline"
                onClick={() => {
                  const newLanguages = [...selectedLanguages, { language: "", fluency: "" }];
                  setSelectedLanguages(newLanguages);
                  form.setValue("languagesRequired", newLanguages);
                }}
                className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900">
                <Plus className="w-4 h-4 mr-2" />
                Add Language Requirement
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="certifications">Required Certifications (Optional)</Label>
            <Textarea id="certifications" {...form.register("certifications")}
              placeholder="e.g., AWS Certified, PMP, Google Analytics Certified..." rows={3} className="mt-2" />
            <p className="text-xs text-slate-500 mt-1">List any professional certifications required or preferred</p>
          </div>
        </TabsContent>

        <TabsContent value="assessment" className="space-y-6">
          <AssessmentQuestionsBuilder questions={assessmentQuestions} onChange={setAssessmentQuestions} />
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <div className="space-y-4">
            <div className="text-center py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
              <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">AI Prompt for Applicant Information</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Add notes for the AI to get more information from applicants.</p>
            </div>

            <div>
              <Label htmlFor="ai-prompt">AI Prompt</Label>
              <Textarea id="ai-prompt" {...form.register("aiPrompt")}
                placeholder="e.g., 'Focus on the candidate's experience with React and Node.js...'" rows={6} className="mt-2" />
              <p className="text-xs text-slate-500 mt-2">Be specific about what information you want the AI to gather.</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Tips for Effective AI Prompts</h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Be specific about skills and experiences</li>
                    <li>• Mention particular projects or technologies</li>
                    <li>• Include soft skills important for the role</li>
                    <li>• Specify unique aspects of your company culture</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}
          disabled={createJobMutation.isPending || updateJobMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={createJobMutation.isPending || updateJobMutation.isPending}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg">
          {(createJobMutation.isPending || updateJobMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {editJob ? "Update Job" : "Post Job"}
        </Button>
      </div>
    </form>
  );
}
