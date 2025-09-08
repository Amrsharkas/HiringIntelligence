import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Sparkles, Loader2, MapPin, DollarSign, Plus, Trash2, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

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
  // New metadata fields
  employmentType: z.string().min(1, "Employment type is required"),
  workplaceType: z.string().min(1, "Workplace type is required"),
  seniorityLevel: z.string().min(1, "Seniority level is required"),
  industry: z.string().min(1, "Industry is required"),
  languagesRequired: z.array(z.object({
    language: z.string(),
    fluency: z.string()
  })).default([]),
  certifications: z.string().optional(),
  // Score matching threshold: 0-100
  scoreMatchingThreshold: z.coerce.number().int().min(0, "Must be at least 0").max(100, "Must be 100 or less").default(30),
});

type JobFormData = z.infer<typeof jobFormSchema>;

const SALARY_RANGES = [
  "$30,000 - $50,000",
  "$50,000 - $75,000", 
  "$75,000 - $100,000",
  "$100,000 - $125,000",
  "$125,000 - $150,000",
  "$150,000 - $200,000",
  "$200,000+",
  "Competitive",
  "To be discussed"
];

// Egyptian Pound salary ranges for quick selection
const EGP_SALARY_RANGES = [
  "8K–12K EGP",
  "12K–18K EGP", 
  "18K–25K EGP",
  "25K–35K EGP",
  "35K–50K EGP",
  "50K–75K EGP",
  "75K–100K EGP",
  "100K+ EGP"
];

// New metadata options
const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time", 
  "Freelance",
  "Contract",
  "Internship"
];

const WORKPLACE_TYPES = [
  "On-site",
  "Remote",
  "Hybrid"
];

const SENIORITY_LEVELS = [
  "Entry-level",
  "Junior",
  "Mid-level",
  "Senior",
  "Lead"
];

const INDUSTRIES = [
  "Technology",
  "Marketing",
  "Education",
  "Finance",
  "Legal",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Real Estate",
  "Media",
  "Government",
  "Non-profit",
  "Construction",
  "Transportation",
  "Other"
];

const LANGUAGES = [
  "Arabic",
  "English", 
  "French",
  "German",
  "Spanish",
  "Italian",
  "Turkish",
  "Chinese",
  "Japanese",
  "Russian"
];

const FLUENCY_LEVELS = [
  "Basic",
  "Intermediate", 
  "Fluent",
  "Native"
];

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

interface JobPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editJob?: any;
}

export function JobPostingModal({ isOpen, onClose, editJob }: JobPostingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSoftSkills, setSelectedSoftSkills] = useState<string[]>([]);
  const [selectedTechnicalSkills, setSelectedTechnicalSkills] = useState<string[]>([]);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingRequirements, setIsGeneratingRequirements] = useState(false);
  const [dynamicTechnicalSkills, setDynamicTechnicalSkills] = useState<string[]>([]);
  const [employerQuestions, setEmployerQuestions] = useState<string[]>(['']);
  const [activeTab, setActiveTab] = useState('details');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<Array<{language: string, fluency: string}>>([]);
  const [usesEgpSalary, setUsesEgpSalary] = useState(false);

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      description: "",
      requirements: "",
      location: "",
      salaryRange: "",
      salaryMin: "",
      salaryMax: "",
      salaryNegotiable: false,
      softSkills: [],
      technicalSkills: [],
      employerQuestions: [],
      employmentType: "",
      workplaceType: "",
      seniorityLevel: "",
      industry: "",
      languagesRequired: [],
      certifications: "",
      scoreMatchingThreshold: 30,
    },
  });

  // Functions for managing employer questions
  const addEmployerQuestion = () => {
    if (employerQuestions.length < 5) {
      setEmployerQuestions([...employerQuestions, '']);
    }
  };

  const removeEmployerQuestion = (index: number) => {
    const newQuestions = employerQuestions.filter((_, i) => i !== index);
    setEmployerQuestions(newQuestions.length === 0 ? [''] : newQuestions);
    form.setValue('employerQuestions', newQuestions.filter(q => q.trim() !== ''));
  };

  const updateEmployerQuestion = (index: number, value: string) => {
    const newQuestions = [...employerQuestions];
    newQuestions[index] = value;
    setEmployerQuestions(newQuestions);
    // Only include non-empty questions in form data
    const validQuestions = newQuestions.filter(q => q.trim() !== '');
    form.setValue('employerQuestions', validQuestions);
  };

  const generateEmployerQuestions = async () => {
    const jobTitle = form.watch("title");
    const jobDescription = form.watch("description");
    const requirements = form.watch("requirements");

    if (!jobTitle) {
      toast({
        title: "Missing Information",
        description: "Please add a job title first to generate relevant questions.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingQuestions(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-employer-questions", {
        jobTitle,
        jobDescription,
        requirements,
      });
      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        setEmployerQuestions(data.questions);
        form.setValue('employerQuestions', data.questions);
        toast({
          title: "Questions Generated",
          description: `Generated ${data.questions.length} employer questions based on your job posting.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Reset form when editJob changes
  useEffect(() => {
    if (editJob) {
      form.reset({
        title: editJob.title || "",
        description: editJob.description || "",
        requirements: editJob.requirements || "",
        location: editJob.location || "",
        salaryRange: editJob.salaryRange || "",
        softSkills: editJob.softSkills || [],
        technicalSkills: editJob.technicalSkills || [],
        employerQuestions: editJob.employerQuestions || [],
        scoreMatchingThreshold: editJob.scoreMatchingThreshold ?? 30,
      });
      setSelectedSoftSkills(editJob.softSkills || []);
      setSelectedTechnicalSkills(editJob.technicalSkills || []);
      setEmployerQuestions(editJob.employerQuestions?.length > 0 ? editJob.employerQuestions : ['']);
    } else {
      form.reset({
        title: "",
        description: "",
        requirements: "",
        location: "",
        salaryRange: "",
        softSkills: [],
        technicalSkills: [],
        employerQuestions: [],
        scoreMatchingThreshold: 30,
      });
      setSelectedSoftSkills([]);
      setSelectedTechnicalSkills([]);
      setEmployerQuestions(['']);
      setActiveTab('details');
    }
  }, [editJob, form]);

  const { data: organization } = useQuery<{ id: number; name: string }>({
    queryKey: ["/api/organizations/current"],
    retry: false,
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const response = await apiRequest("POST", "/api/job-postings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job posting created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings/count"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create job posting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const response = await apiRequest("PUT", `/api/job-postings/${editJob.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job posting updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings"] });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update job posting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateDescription = async () => {
    const formData = form.getValues();
    const { title, employmentType, workplaceType, seniorityLevel, industry, certifications, location } = formData;
    
    if (!title) {
      toast({
        title: "Missing Information",
        description: "Please enter a job title first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-description", {
        jobTitle: title,
        employmentType,
        workplaceType,
        seniorityLevel,
        industry,
        certifications,
        location: location || "Cairo, Egypt",
        languagesRequired: selectedLanguages.filter(lang => lang.language && lang.fluency),
        companyName: (organization as any)?.companyName || "Our Company",
      });
      const data = await response.json();
      form.setValue("description", data.description);
      toast({
        title: "Description Generated",
        description: "AI created a comprehensive job description based on all your inputs.",
      });
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const generateRequirements = async () => {
    const formData = form.getValues();
    const { title, employmentType, workplaceType, seniorityLevel, industry, certifications, description } = formData;
    
    if (!title) {
      toast({
        title: "Missing Information",
        description: "Please enter a job title first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingRequirements(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-requirements", {
        jobTitle: title,
        employmentType,
        workplaceType,
        seniorityLevel,
        industry,
        certifications,
        description: description || "",
        languagesRequired: selectedLanguages.filter(lang => lang.language && lang.fluency),
      });
      const data = await response.json();
      form.setValue("requirements", data.requirements);
      toast({
        title: "Requirements Generated",
        description: "AI created detailed requirements based on your job specifications.",
      });
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate requirements. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingRequirements(false);
    }
  };

  // Dynamic technical skills extraction with improved performance
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [lastExtractedText, setLastExtractedText] = useState("");

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if ((name === "title" || name === "description") && (value.title || value.description)) {
        const currentText = `${value.title || ""} ${value.description || ""}`;
        
        // Only extract if the text has meaningfully changed (avoid unnecessary API calls)
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
              console.error("Failed to extract skills:", error);
              // Provide fallback skills for common job titles
              if (value.title) {
                const fallbackSkills = getFallbackSkills(value.title);
                setDynamicTechnicalSkills(fallbackSkills);
              }
            } finally {
              setIsExtractingSkills(false);
            }
          };

          const debounceTimer = setTimeout(extractSkills, 200); // 200ms debounce delay
          return () => clearTimeout(debounceTimer);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, lastExtractedText]);

  // Fallback skills for common job titles
  const getFallbackSkills = (jobTitle: string): string[] => {
    const title = jobTitle.toLowerCase();
    
    if (title.includes('react') || title.includes('frontend') || title.includes('front-end')) {
      return ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Git'];
    }
    if (title.includes('backend') || title.includes('back-end') || title.includes('api')) {
      return ['Node.js', 'Python', 'SQL', 'REST API', 'Git', 'Docker'];
    }
    if (title.includes('fullstack') || title.includes('full-stack')) {
      return ['JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'TypeScript'];
    }
    if (title.includes('data') || title.includes('analyst')) {
      return ['Python', 'SQL', 'Excel', 'Tableau', 'R', 'Statistics'];
    }
    if (title.includes('devops') || title.includes('cloud')) {
      return ['AWS', 'Docker', 'Kubernetes', 'Linux', 'Git', 'CI/CD'];
    }
    if (title.includes('mobile') || title.includes('ios') || title.includes('android')) {
      return ['React Native', 'Swift', 'Kotlin', 'Flutter', 'Git', 'Mobile Development'];
    }
    
    return ['JavaScript', 'Git', 'Communication', 'Problem Solving']; // Generic fallback
  };

  const handleSoftSkillToggle = (skill: string) => {
    setSelectedSoftSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleTechnicalSkillToggle = (skill: string) => {
    setSelectedTechnicalSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const onSubmit = (data: JobFormData) => {
    // Combine employer questions into single text block with numbering, send empty string if no questions
    const validQuestions = employerQuestions.filter(q => q.trim() !== '');
    const employerQuestionsArray = validQuestions.length > 0 ? validQuestions : [];
    
    // Filter out empty language requirements
    const validLanguages = selectedLanguages.filter(lang => lang.language && lang.fluency);
    
    const jobData = {
      ...data,
      softSkills: selectedSoftSkills,
      technicalSkills: selectedTechnicalSkills,
      employerQuestions: employerQuestionsArray,
      languagesRequired: validLanguages,
      // Convert salary values to numbers if they exist  
      salaryMin: data.salaryMin ? parseInt(data.salaryMin) : undefined,
      salaryMax: data.salaryMax ? parseInt(data.salaryMax) : undefined,
      scoreMatchingThreshold: data.scoreMatchingThreshold,
    };

    if (editJob) {
      updateJobMutation.mutate(jobData);
    } else {
      createJobMutation.mutate(jobData);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {editJob ? "Edit Job Posting" : "Post New Job"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Job Details
                </TabsTrigger>
                <TabsTrigger value="questions" className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Optional Questions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="e.g., Senior Frontend Developer"
                className="mt-2"
              />
              {form.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Job Metadata Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employment Type</Label>
                <Controller
                  name="employmentType"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.employmentType && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.employmentType.message}</p>
                )}
              </div>
              <div>
                <Label>Workplace Type</Label>
                <Controller
                  name="workplaceType"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select workplace type" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKPLACE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.workplaceType && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.workplaceType.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Seniority Level</Label>
                <Controller
                  name="seniorityLevel"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select seniority level" />
                      </SelectTrigger>
                      <SelectContent>
                        {SENIORITY_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.seniorityLevel && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.seniorityLevel.message}</p>
                )}
              </div>
              <div>
                <Label>Industry</Label>
                <Controller
                  name="industry"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.industry && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.industry.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Location
                </Label>
                <Input
                  {...form.register("location")}
                  placeholder="e.g., Remote, New York, NY, or San Francisco, CA"
                  className="mt-2"
                />
                {form.formState.errors.location && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.location.message}</p>
                )}
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  Score Matching Threshold
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  {...form.register("scoreMatchingThreshold", { valueAsNumber: true })}
                  placeholder="30"
                  className="mt-2"
                />
                {form.formState.errors.scoreMatchingThreshold && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.scoreMatchingThreshold.message as any}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">Only candidates with a score ≥ this value will be saved.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Salary Range
                </Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={usesEgpSalary}
                      onCheckedChange={(checked) => setUsesEgpSalary(checked === true)}
                    />
                    <Label className="text-sm">Use Egyptian Pound (EGP)</Label>
                  </div>
                  <Controller
                    name="salaryRange"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select salary range" />
                        </SelectTrigger>
                        <SelectContent>
                          {(usesEgpSalary ? EGP_SALARY_RANGES : SALARY_RANGES).map((range) => (
                            <SelectItem key={range} value={range}>
                              {range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Manual Salary Entry */}
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Manual Salary Entry (Optional)</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Minimum {usesEgpSalary ? 'EGP' : 'USD'}</Label>
                  <Input
                    {...form.register("salaryMin")}
                    placeholder={usesEgpSalary ? "8000" : "50000"}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Maximum {usesEgpSalary ? 'EGP' : 'USD'}</Label>
                  <Input
                    {...form.register("salaryMax")}
                    placeholder={usesEgpSalary ? "15000" : "75000"}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2">
                    <Controller
                      name="salaryNegotiable"
                      control={form.control}
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Negotiable</Label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="description">Job Description</Label>
                <Button
                  type="button"
                  onClick={generateDescription}
                  disabled={isGeneratingDescription}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg"
                >
                  {isGeneratingDescription ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  AI Generate
                </Button>
              </div>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                rows={5}
                className="mt-2"
              />
              {form.formState.errors.description && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="requirements">Job Requirements</Label>
                <Button
                  type="button"
                  onClick={generateRequirements}
                  disabled={isGeneratingRequirements}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg"
                >
                  {isGeneratingRequirements ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  AI Generate
                </Button>
              </div>
              <Textarea
                id="requirements"
                {...form.register("requirements")}
                placeholder="List required skills, experience, and qualifications..."
                rows={4}
                className="mt-2"
              />
              {form.formState.errors.requirements && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.requirements.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Soft Skills</Label>
                <div className="mt-2">
                  <Select
                    onValueChange={(value) => {
                      if (!selectedSoftSkills.includes(value)) {
                        const newSkills = [...selectedSoftSkills, value];
                        setSelectedSoftSkills(newSkills);
                        form.setValue("softSkills", newSkills);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add soft skills" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOFT_SKILLS.filter(skill => !selectedSoftSkills.includes(skill)).map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedSoftSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {skill}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-blue-600" 
                          onClick={() => {
                            const newSkills = selectedSoftSkills.filter(s => s !== skill);
                            setSelectedSoftSkills(newSkills);
                            form.setValue("softSkills", newSkills);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label>Technical Skills</Label>
                <div className="mt-2">
                  <Select
                    onValueChange={(value) => {
                      if (!selectedTechnicalSkills.includes(value)) {
                        const newSkills = [...selectedTechnicalSkills, value];
                        setSelectedTechnicalSkills(newSkills);
                        form.setValue("technicalSkills", newSkills);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={dynamicTechnicalSkills.length > 0 ? "Add AI-suggested skills" : "Add technical skills"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {dynamicTechnicalSkills.length > 0 ? (
                        <>
                          {dynamicTechnicalSkills.filter(skill => !selectedTechnicalSkills.includes(skill)).map((skill) => (
                            <SelectItem key={skill} value={skill} className="bg-blue-50 dark:bg-blue-900/20">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-blue-500" />
                                {skill}
                              </div>
                            </SelectItem>
                          ))}
                          <div className="border-t my-1"></div>
                        </>
                      ) : null}
                      {TECHNICAL_SKILLS.filter(skill => 
                        !selectedTechnicalSkills.includes(skill) && 
                        !dynamicTechnicalSkills.includes(skill)
                      ).map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedTechnicalSkills.map((skill) => {
                      const isAiSuggested = dynamicTechnicalSkills.includes(skill);
                      return (
                        <Badge 
                          key={skill} 
                          variant="secondary" 
                          className={`flex items-center gap-1 ${
                            isAiSuggested 
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700' 
                              : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                          }`}
                        >
                          {isAiSuggested && <Sparkles className="w-3 h-3" />}
                          {skill}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-purple-600" 
                            onClick={() => {
                              const newSkills = selectedTechnicalSkills.filter(s => s !== skill);
                              setSelectedTechnicalSkills(newSkills);
                              form.setValue("technicalSkills", newSkills);
                            }}
                          />
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
                  {!isExtractingSkills && dynamicTechnicalSkills.length === 0 && (form.watch("title") || form.watch("description")) && (
                    <div className="text-xs text-slate-400 pt-2 text-center">
                      Add more job details to get AI skill suggestions
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Languages Required Section */}
            <div>
              <Label>Languages Required (Optional)</Label>
              <div className="mt-2 space-y-3">
                {selectedLanguages.map((langReq, index) => (
                  <div key={index} className="flex gap-3 items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex-1">
                      <Select
                        value={langReq.language}
                        onValueChange={(value) => {
                          const newLanguages = [...selectedLanguages];
                          newLanguages[index] = { ...langReq, language: value };
                          setSelectedLanguages(newLanguages);
                          form.setValue("languagesRequired", newLanguages);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={langReq.fluency}
                        onValueChange={(value) => {
                          const newLanguages = [...selectedLanguages];
                          newLanguages[index] = { ...langReq, fluency: value };
                          setSelectedLanguages(newLanguages);
                          form.setValue("languagesRequired", newLanguages);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fluency level" />
                        </SelectTrigger>
                        <SelectContent>
                          {FLUENCY_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newLanguages = selectedLanguages.filter((_, i) => i !== index);
                        setSelectedLanguages(newLanguages);
                        form.setValue("languagesRequired", newLanguages);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newLanguages = [...selectedLanguages, { language: "", fluency: "" }];
                    setSelectedLanguages(newLanguages);
                    form.setValue("languagesRequired", newLanguages);
                  }}
                  className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Language Requirement
                </Button>
              </div>
            </div>

            {/* Certifications Section */}
            <div>
              <Label htmlFor="certifications">Required Certifications (Optional)</Label>
              <Textarea
                id="certifications"
                {...form.register("certifications")}
                placeholder="e.g., AWS Certified Solutions Architect, PMP, Google Analytics Certified, etc."
                rows={3}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                List any professional certifications that are required or preferred for this role
              </p>
            </div>
              </TabsContent>

              <TabsContent value="questions" className="space-y-6">
                <div className="space-y-4">
                  <div className="text-center py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                    <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Employer Questions
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Add up to 5 optional questions to ask candidates during the application process.
                      These help you learn more about candidates beyond their resume.
                    </p>
                    <Button
                      type="button"
                      onClick={generateEmployerQuestions}
                      disabled={isGeneratingQuestions}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg"
                    >
                      {isGeneratingQuestions ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      AI Generate Questions
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {employerQuestions.map((question, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1">
                          <Label htmlFor={`question-${index}`} className="text-sm font-medium">
                            Question {index + 1} {index === 0 && employerQuestions.length === 1 ? '(Optional)' : ''}
                          </Label>
                          <Textarea
                            id={`question-${index}`}
                            value={question}
                            onChange={(e) => updateEmployerQuestion(index, e.target.value)}
                            placeholder={`e.g., "What interests you most about this role?" or "Describe a challenging project you've worked on."`}
                            rows={2}
                            className="mt-2"
                          />
                        </div>
                        {employerQuestions.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeEmployerQuestion(index)}
                            className="mt-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {employerQuestions.length < 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addEmployerQuestion}
                        className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 dark:border-blue-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question ({employerQuestions.length}/5)
                      </Button>
                    )}
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                          Tips for Great Questions
                        </h4>
                        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                          <li>• Ask about motivation and passion for the role</li>
                          <li>• Inquire about specific experiences or challenges</li>
                          <li>• Keep questions open-ended to encourage detailed responses</li>
                          <li>• Avoid questions that can be answered with yes/no</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createJobMutation.isPending || updateJobMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createJobMutation.isPending || updateJobMutation.isPending}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg"
              >
                {(createJobMutation.isPending || updateJobMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editJob ? "Update Job" : "Post Job"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
