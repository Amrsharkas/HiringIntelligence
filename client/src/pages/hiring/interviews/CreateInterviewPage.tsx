import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Users,
  Briefcase,
  Clock,
  Link as LinkIcon,
  FileText,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const TIME_ZONES = [
  { value: "UTC", label: "UTC" },
  { value: "EST", label: "Eastern (EST/EDT)" },
  { value: "CST", label: "Central (CST/CDT)" },
  { value: "MST", label: "Mountain (MST/MDT)" },
  { value: "PST", label: "Pacific (PST/PDT)" },
  { value: "GMT", label: "GMT" },
  { value: "CET", label: "Central European (CET)" },
  { value: "JST", label: "Japan (JST)" },
  { value: "AEST", label: "Australian Eastern (AEST)" },
  { value: "IST", label: "India (IST)" },
  { value: "EET", label: "Egypt (EET)" },
];

export default function CreateInterviewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get applicantId from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const applicantIdFromUrl = urlParams.get("applicantId");

  const [selectedJob, setSelectedJob] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState("");
  const [interviewData, setInterviewData] = useState({
    scheduledDate: "",
    scheduledTime: "",
    timeZone: "EET",
    interviewType: "video",
    meetingLink: "",
    notes: "",
  });

  // Fetch active jobs
  const { data: jobsData } = useQuery<any>({
    queryKey: ["/api/job-postings"],
  });

  const jobs = Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || jobsData?.data || []);

  // Fetch accepted applicants for the selected job
  const { data: acceptedApplicants = [], isLoading: isLoadingApplicants } = useQuery({
    queryKey: ["/api/accepted-applicants", selectedJob],
    queryFn: async () => {
      const res = await fetch(`/api/accepted-applicants/${selectedJob}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedJob,
  });

  // Handle pre-selected applicant from URL
  useEffect(() => {
    if (applicantIdFromUrl) {
      // Would need to fetch applicant details to pre-populate
      setSelectedApplicant(applicantIdFromUrl);
    }
  }, [applicantIdFromUrl]);

  const createInterviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/interviews", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Interview scheduled successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews/count"] });
      navigate("/hiring/interviews");
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
        description: "Failed to schedule interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedJob || !selectedApplicant || !interviewData.scheduledDate || !interviewData.scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const applicant = acceptedApplicants.find((app: any) => app.id === selectedApplicant);
    if (!applicant) {
      toast({
        title: "Error",
        description: "Selected applicant not found",
        variant: "destructive",
      });
      return;
    }

    createInterviewMutation.mutate({
      candidateName: applicant.name,
      candidateEmail: applicant.email || "",
      candidateId: applicant.userId,
      jobId: applicant.jobId,
      jobTitle: applicant.jobTitle,
      ...interviewData,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/hiring/interviews")}
          className="text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Schedule Interview
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Set up an interview with a candidate
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Interview Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Selection */}
            <div>
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Select Job Position *
              </Label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a job position..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job: any) => (
                    <SelectItem key={job.id} value={job.id.toString()}>
                      {job.title} - {job.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Applicant Selection */}
            {selectedJob && (
              <div>
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  Select Accepted Applicant *
                </Label>
                <Select value={selectedApplicant} onValueChange={setSelectedApplicant}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose an accepted applicant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {acceptedApplicants.map((applicant: any) => (
                      <SelectItem key={applicant.id} value={applicant.id}>
                        {applicant.name} - {applicant.jobTitle} {applicant.email ? `(${applicant.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingApplicants && (
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading accepted applicants...
                  </p>
                )}
                {!isLoadingApplicants && acceptedApplicants.length === 0 && (
                  <p className="text-sm text-slate-500 mt-1">
                    No accepted applicants found for this job position.
                  </p>
                )}
              </div>
            )}

            {/* Interview Details */}
            {selectedApplicant && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={interviewData.scheduledDate}
                      onChange={(e) => setInterviewData({ ...interviewData, scheduledDate: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={interviewData.scheduledTime}
                      onChange={(e) => setInterviewData({ ...interviewData, scheduledTime: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Time Zone *</Label>
                    <Select
                      value={interviewData.timeZone}
                      onValueChange={(value) => setInterviewData({ ...interviewData, timeZone: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_ZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Interview Type</Label>
                  <Select
                    value={interviewData.interviewType}
                    onValueChange={(value) => setInterviewData({ ...interviewData, interviewType: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video Call</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="in-person">In-Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {interviewData.interviewType === "video" && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-purple-600" />
                      Meeting Link
                    </Label>
                    <Input
                      type="url"
                      value={interviewData.meetingLink}
                      onChange={(e) => setInterviewData({ ...interviewData, meetingLink: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="mt-2"
                    />
                  </div>
                )}

                <div>
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    Notes
                  </Label>
                  <Textarea
                    value={interviewData.notes}
                    onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                    rows={4}
                    placeholder="Additional notes for the interview..."
                    className="mt-2"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/hiring/interviews")}
                disabled={createInterviewMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createInterviewMutation.isPending ||
                  !selectedApplicant ||
                  !interviewData.scheduledDate ||
                  !interviewData.scheduledTime
                }
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {createInterviewMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule Interview
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
