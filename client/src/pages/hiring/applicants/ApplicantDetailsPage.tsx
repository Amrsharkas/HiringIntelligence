import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Star,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  Play,
  User,
  Brain,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HLSVideoPlayer } from "@/components/HLSVideoPlayer";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "shortlisted":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Shortlisted</Badge>;
    case "denied":
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Denied</Badge>;
    case "accepted":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Accepted</Badge>;
    default:
      return <Badge variant="secondary">New</Badge>;
  }
};

export default function ApplicantDetailsPage() {
  const { applicantId } = useParams<{ applicantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Single query to fetch all applicant data including interview video URL and transcription
  const { data: applicant, isLoading } = useQuery<any>({
    queryKey: ["/api/applicants/detail", applicantId],
    queryFn: async () => {
      const response = await fetch(`/api/applicants/detail/${applicantId}`);
      if (!response.ok) throw new Error("Failed to fetch applicant");
      return response.json();
    },
  });

  // Extract transcription data from the applicant
  const interviewTranscription = applicant?.interviewTranscription;

  const shortlistMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/applicants/${applicantId}/shortlist`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Applicant shortlisted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to shortlist applicant",
        variant: "destructive",
      });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/applicants/${applicantId}/accept`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Applicant accepted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept applicant",
        variant: "destructive",
      });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/applicants/${applicantId}/deny`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Applicant denied" });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deny applicant",
        variant: "destructive",
      });
    },
  });

  const regenerateProfileMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/applicants/${applicantId}/regenerate-profile`);
    },
    onSuccess: () => {
      // Invalidate queries to refetch applicant data with new profile
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
    },
    onError: (error) => {
      console.error("Failed to regenerate profile:", error);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Applicant not found
        </h3>
        <Button onClick={() => navigate("/hiring/applicants")}>
          Back to Applicants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hiring/applicants")}
            className="mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-semibold">
              {applicant.firstName?.[0] || applicant.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {applicant.firstName && applicant.lastName
                    ? `${applicant.firstName} ${applicant.lastName}`
                    : applicant.name || applicant.email}
                </h1>
                {getStatusBadge(applicant.status)}
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Applied for: {applicant.jobTitle || "Unknown Position"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {applicant.status !== "shortlisted" && applicant.status !== "accepted" && (
            <Button
              variant="outline"
              onClick={() => shortlistMutation.mutate()}
              disabled={shortlistMutation.isPending}
            >
              <Star className="w-4 h-4 mr-2" />
              Shortlist
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(`/hiring/interviews/new?applicantId=${applicantId}`)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Interview
          </Button>
          <Button
            variant="outline"
            onClick={() => regenerateProfileMutation.mutate()}
            disabled={regenerateProfileMutation.isPending}
          >
            {regenerateProfileMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Regenerate Profile
          </Button>
          {applicant.status === "shortlisted" && (
            <Button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept
            </Button>
          )}
          {applicant.status !== "denied" && (
            <Button
              variant="outline"
              onClick={() => denyMutation.mutate()}
              disabled={denyMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Deny
            </Button>
          )}
        </div>
      </motion.div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-6 pr-4">
          {/* Basic Info Section */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-600 dark:text-slate-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {applicant.firstName && applicant.lastName
                    ? `${applicant.firstName} ${applicant.lastName}`
                    : applicant.name || applicant.email}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{applicant.email}</p>
                {applicant.phone && <p className="text-sm text-slate-500 dark:text-slate-400">{applicant.phone}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Interview Video and Transcription Section */}
          {applicant.interviewVideoUrl && (
            <>
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Play className="w-5 h-5" />
                    Interview Recording & Transcription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Video Player */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Video Recording</h4>
                      <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                        <HLSVideoPlayer
                          src={applicant.interviewVideoUrl}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Transcription */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Interview Transcription
                      </h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 h-[calc(100%-3rem)] overflow-y-auto max-h-96 lg:max-h-none">
                        {interviewTranscription ? (
                          <div className="space-y-3">
                            {(() => {
                              // Handle different transcription formats
                              if (interviewTranscription.questions && interviewTranscription.responses) {
                                // Session format with questions and responses arrays
                                const elements = [];
                                const questions = interviewTranscription.questions || [];
                                const responses = interviewTranscription.responses || [];

                                for (let i = 0; i < Math.max(questions.length, responses.length); i++) {
                                  if (questions[i]) {
                                    elements.push(
                                      <div key={`q-${i}`} className="border-l-2 border-blue-200 pl-3 py-2">
                                        <div className="flex items-start gap-2">
                                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 min-w-[80px]">
                                            Interviewer:
                                          </span>
                                          <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                                            {questions[i].question}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (responses[i]) {
                                    elements.push(
                                      <div key={`r-${i}`} className="border-l-2 border-green-200 pl-3 py-2 ml-4">
                                        <div className="flex items-start gap-2">
                                          <span className="text-xs font-medium text-green-600 dark:text-green-400 min-w-[80px]">
                                            Candidate:
                                          </span>
                                          <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                                            {responses[i].content}
                                          </p>
                                        </div>
                                        {responses[i].timestamp && (
                                          <span className="text-xs text-slate-400 ml-[92px] block">
                                            {new Date(responses[i].timestamp).toLocaleTimeString()}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                }
                                return elements;
                              } else if (Array.isArray(interviewTranscription)) {
                                // Simple array format
                                return interviewTranscription.map((item: any, index: number) => (
                                  <div key={index} className={`border-l-2 pl-3 py-1 ${
                                    item.role === 'assistant' ? 'border-blue-200' : 'border-green-200'
                                  }`}>
                                    <div className="flex items-start gap-2">
                                      <span className={`text-xs font-medium min-w-[80px] ${
                                        item.role === 'assistant'
                                          ? 'text-blue-600 dark:text-blue-400'
                                          : 'text-green-600 dark:text-green-400'
                                      }`}>
                                        {item.role === 'assistant' ? 'Interviewer' : 'Candidate'}:
                                      </span>
                                      <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                                        {item.content}
                                      </p>
                                    </div>
                                    {item.timestamp && (
                                      <span className="text-xs text-slate-400 ml-[92px] block">
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                      </span>
                                    )}
                                  </div>
                                ));
                              } else if (typeof interviewTranscription === 'string') {
                                // Plain string format
                                return (
                                  <div className="border-l-2 border-slate-200 pl-3 py-2">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                      {interviewTranscription}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">
                            Transcription not available for this interview.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Separator />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}