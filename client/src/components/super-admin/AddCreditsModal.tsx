import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Sparkles } from "lucide-react";

interface Organization {
  id: string;
  companyName: string;
  cvProcessingCredits: number;
  interviewCredits: number;
}

interface AddCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  onSuccess: () => void;
}

export function AddCreditsModal({ isOpen, onClose, organization, onSuccess }: AddCreditsModalProps) {
  const { toast } = useToast();
  const [creditType, setCreditType] = useState<"cv_processing" | "interview">("cv_processing");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const addCreditsMutation = useMutation({
    mutationFn: async (data: { amount: number; creditType: string; description: string }) => {
      const res = await apiRequest("POST", `/api/super-admin/organizations/${organization.id}/credits`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add credits");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credits added",
        description: data.message,
      });
      // Reset form
      setAmount("");
      setDescription("");
      setCreditType("cv_processing");
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add credits",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a positive number",
        variant: "destructive",
      });
      return;
    }
    addCreditsMutation.mutate({
      amount: numAmount,
      creditType,
      description,
    });
  };

  const handleClose = () => {
    setAmount("");
    setDescription("");
    setCreditType("cv_processing");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Add Credits
          </DialogTitle>
          <DialogDescription>
            Add credits to {organization.companyName}
          </DialogDescription>
        </DialogHeader>

        {/* Current Balance Display */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">CV Credits</p>
              <p className="font-semibold">{organization.cvProcessingCredits}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Interview Credits</p>
              <p className="font-semibold">{organization.interviewCredits}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="creditType">Credit Type</Label>
            <Select
              value={creditType}
              onValueChange={(value: "cv_processing" | "interview") => setCreditType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select credit type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cv_processing">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    CV Processing Credits
                  </div>
                </SelectItem>
                <SelectItem value="interview">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Interview Credits
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to add"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for adding credits..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addCreditsMutation.isPending}>
              {addCreditsMutation.isPending ? "Adding..." : "Add Credits"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
