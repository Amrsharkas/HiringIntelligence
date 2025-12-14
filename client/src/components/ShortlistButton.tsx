import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Star, Check } from "lucide-react";

interface ShortlistButtonProps {
  applicantId: string;
  applicantName: string;
  jobTitle: string;
  jobId: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary";
}

export function ShortlistButton({
  applicantId,
  applicantName,
  jobTitle,
  jobId,
  size = "sm",
  variant = "outline"
}: ShortlistButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [note, setNote] = useState("");

  // Check if already shortlisted
  const { data: shortlistStatus } = useQuery({
    queryKey: ["/api/shortlisted-applicants/check", applicantId, jobId],
    queryFn: async () => {
      return await apiRequest(`/api/shortlisted-applicants/check/${applicantId}/${jobId}`);
    },
    refetchOnWindowFocus: false,
  });

  const shortlistMutation = useMutation({
    mutationFn: async (_noteText: string) => {
      // Use the status-based shortlist endpoint
      return await apiRequest("POST", `/api/applicants/${applicantId}/shortlist`);
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shortlisted-applicants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shortlisted-applicants/check", applicantId, jobId] });
      setIsNoteModalOpen(false);
      setNote("");
      toast({
        title: "Success",
        description: "Applicant added to shortlist",
      });
    },
    onError: (error: any) => {
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
        description: "Failed to add to shortlist",
        variant: "destructive",
      });
    },
  });

  const handleShortlistClick = () => {
    if (shortlistStatus?.isShortlisted) {
      return; // Already shortlisted, do nothing
    }
    setIsNoteModalOpen(true);
  };

  const handleConfirmShortlist = () => {
    shortlistMutation.mutate(note);
  };

  const isAlreadyShortlisted = shortlistStatus?.isShortlisted;

  return (
    <>
      <Button
        size={size}
        variant={isAlreadyShortlisted ? "secondary" : variant}
        onClick={handleShortlistClick}
        disabled={shortlistMutation.isPending || isAlreadyShortlisted}
        className={`flex items-center gap-1 ${
          isAlreadyShortlisted ? "bg-green-100 text-green-700 hover:bg-green-100" : ""
        }`}
      >
        {isAlreadyShortlisted ? (
          <>
            <Check className="h-4 w-4" />
            Shortlisted
          </>
        ) : (
          <>
            <Star className="h-4 w-4" />
            Shortlist
          </>
        )}
      </Button>

      <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Shortlist</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Adding <strong>{applicantName}</strong> for <strong>{jobTitle}</strong> to your shortlist.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note about why this applicant stands out..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNoteModalOpen(false);
                  setNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmShortlist}
                disabled={shortlistMutation.isPending}
              >
                {shortlistMutation.isPending ? "Adding..." : "Add to Shortlist"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}