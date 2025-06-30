import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const jobFormSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  description: z.string().min(1, "Job description is required"),
  requirements: z.string().min(1, "Job requirements are required"),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  softSkills: z.array(z.string()).default([]),
  technicalSkills: z.array(z.string()).default([]),
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface JobPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editJob?: any;
}

const softSkillOptions = [
  "Communication",
  "Leadership", 
  "Teamwork",
  "Problem Solving",
  "Adaptability",
  "Creativity",
  "Time Management",
  "Critical Thinking"
];

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
      title: editJob?.title || "",
      description: editJob?.description || "",
      requirements: editJob?.requirements || "",
      salaryMin: editJob?.salaryMin || undefined,
      salaryMax: editJob?.salaryMax || undefined,
      softSkills: editJob?.softSkills || [],
      technicalSkills: editJob?.technicalSkills || [],
    },
  });

  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
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
    },
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
        companyName: organization?.name,
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

  // Dynamic technical skills extraction
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if ((name === "title" || name === "description") && (value.title || value.description)) {
        const extractSkills = async () => {
          try {
            const response = await apiRequest("POST", "/api/ai/extract-skills", {
              jobTitle: value.title || "",
              jobDescription: value.description || "",
            });
            const data = await response.json();
            setDynamicTechnicalSkills(data.skills || []);
          } catch (error) {
            // Silently fail for skills extraction
            console.error("Failed to extract skills:", error);
          }
        };

        const debounceTimer = setTimeout(extractSkills, 100);
        return () => clearTimeout(debounceTimer);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

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
                <Label htmlFor="salaryMin">Salary Range (Min)</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  {...form.register("salaryMin", { valueAsNumber: true })}
                  placeholder="50000"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="salaryMax">Salary Range (Max)</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  {...form.register("salaryMax", { valueAsNumber: true })}
                  placeholder="100000"
                  className="mt-2"
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
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  {softSkillOptions.map((skill) => (
                    <label key={skill} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSoftSkills.includes(skill)}
                        onChange={() => handleSoftSkillToggle(skill)}
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Technical Skills</Label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  {dynamicTechnicalSkills.length > 0 ? (
                    dynamicTechnicalSkills.map((skill) => (
                      <label key={skill} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTechnicalSkills.includes(skill)}
                          onChange={() => handleTechnicalSkillToggle(skill)}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{skill}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      Enter job title and description to see AI-suggested skills
                    </p>
                  )}
                  {dynamicTechnicalSkills.length > 0 && (
                    <div className="flex items-center justify-center pt-2">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      <span className="text-xs text-blue-500 ml-2">Auto-updating...</span>
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
