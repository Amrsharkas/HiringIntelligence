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
import { X, Sparkles, Loader2, MapPin, DollarSign, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const jobFormSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  description: z.string().min(1, "Job description is required"),
  requirements: z.string().min(1, "Job requirements are required"),
  location: z.string().min(1, "Location is required"),
  salaryRange: z.string().optional(),
  softSkills: z.array(z.string()).default([]),
  technicalSkills: z.array(z.string()).default([]),
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

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      description: "",
      requirements: "",
      location: "",
      salaryRange: "",
      softSkills: [],
      technicalSkills: [],
    },
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
        softSkills: editJob.softSkills || [],
        technicalSkills: editJob.technicalSkills || [],
      });
      setSelectedSoftSkills(editJob.softSkills || []);
      setSelectedTechnicalSkills(editJob.technicalSkills || []);
    } else {
      form.reset({
        title: "",
        description: "",
        requirements: "",
        location: "",
        salaryRange: "",
        softSkills: [],
        technicalSkills: [],
      });
      setSelectedSoftSkills([]);
      setSelectedTechnicalSkills([]);
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
    const jobTitle = form.getValues("title");
    const location = form.getValues("location");
    if (!jobTitle) {
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
        jobTitle,
        location: location || "Remote",
        companyName: (organization as any)?.name || "Our Company",
      });
      const data = await response.json();
      form.setValue("description", data.description);
    } catch (error) {
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
    const jobTitle = form.getValues("title");
    const jobDescription = form.getValues("description");
    
    if (!jobTitle) {
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
        jobTitle,
        jobDescription,
      });
      const data = await response.json();
      form.setValue("requirements", data.requirements);
    } catch (error) {
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
    const jobData = {
      ...data,
      softSkills: selectedSoftSkills,
      technicalSkills: selectedTechnicalSkills,
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

          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
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
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Salary Range
                </Label>
                <Controller
                  name="salaryRange"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select salary range" />
                      </SelectTrigger>
                      <SelectContent>
                        {SALARY_RANGES.map((range) => (
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
