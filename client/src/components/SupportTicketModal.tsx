import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, AlertCircle } from "lucide-react";

const supportTicketSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  issueType: z.string().min(1, "Please select an issue type"),
  description: z.string().min(10, "Please provide more details about the issue"),
});

type SupportTicketData = z.infer<typeof supportTicketSchema>;

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ISSUE_TYPES = [
  "Cannot sign in - getting stuck on permissions screen",
  "Cannot create organization after login",
  "Email verification not working",
  "Account locked or suspended",
  "Password reset not working",
  "General login assistance",
  "Other technical issue"
];

export function SupportTicketModal({ isOpen, onClose }: SupportTicketModalProps) {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<SupportTicketData>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      name: "",
      email: "",
      issueType: "",
      description: "",
    },
  });

  const supportMutation = useMutation({
    mutationFn: async (data: SupportTicketData) => {
      const response = await apiRequest("POST", "/api/support/ticket", data);
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Support ticket created",
        description: "We've received your request and will respond within 24 hours.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit support ticket. Please try again or email support@platohiring.com directly.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupportTicketData) => {
    supportMutation.mutate(data);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    form.reset();
    onClose();
  };

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Mail className="w-5 h-5" />
              Ticket Submitted Successfully
            </DialogTitle>
            <DialogDescription>
              Thank you for contacting support. We've created ticket #{Math.random().toString(36).substr(2, 8).toUpperCase()} for your request.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Next steps:</strong><br/>
                • Our support team will review your request<br/>
                • You'll receive a response within 24 hours<br/>
                • Check your email for updates
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Need immediate assistance? Email us directly at{" "}
                <a href="mailto:support@platohiring.com" className="text-blue-600 hover:underline">
                  support@platohiring.com
                </a>
              </p>
              
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Get Login Support
          </DialogTitle>
          <DialogDescription>
            Having trouble signing in? We're here to help. Fill out this form and our support team will assist you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Your full name"
                className="mt-1"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="your@email.com"
                className="mt-1"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="issueType">What's the problem?</Label>
            <Select onValueChange={(value) => form.setValue("issueType", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select the issue you're experiencing" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((issue) => (
                  <SelectItem key={issue} value={issue}>
                    {issue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.issueType && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.issueType.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Describe the issue</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Please provide as much detail as possible. What steps did you take? What error messages did you see?"
              rows={4}
              className="mt-1"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Include screenshots of any error messages and the steps you took before encountering the issue.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={supportMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {supportMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Submit Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}