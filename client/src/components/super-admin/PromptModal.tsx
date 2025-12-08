import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  MessageSquareCode,
  Eye,
  Settings,
  Code,
  Variable,
  Loader2,
} from "lucide-react";

interface Prompt {
  id: string;
  name: string;
  description: string | null;
  type: string;
  systemPrompt: string;
  userPrompt: string;
  variables: any;
  modelId: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  version: number;
}

interface PromptType {
  value: string;
  label: string;
  description: string;
}

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt | null;
  isCreating: boolean;
  promptTypes: PromptType[];
  onSuccess: () => void;
}

interface PreviewResult {
  renderedSystemPrompt: string;
  renderedUserPrompt: string;
  sampleDataUsed: Record<string, any>;
  variablesInSystemPrompt: string[];
  variablesInUserPrompt: string[];
  variableSchema: Array<{ name: string; type: string; description: string; required: boolean }>;
}

export function PromptModal({
  isOpen,
  onClose,
  prompt,
  isCreating,
  promptTypes,
  onSuccess,
}: PromptModalProps) {
  const { toast } = useToast();
  const isEditing = !isCreating && prompt !== null;

  const [activeTab, setActiveTab] = useState("edit");
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "job_scoring",
    systemPrompt: "",
    userPrompt: "",
    modelId: "",
    isActive: true,
    isDefault: false,
    sortOrder: 0,
    changeNote: "",
  });

  // Initialize form data when prompt changes
  useEffect(() => {
    if (prompt && !isCreating) {
      setFormData({
        name: prompt.name || "",
        description: prompt.description || "",
        type: prompt.type || "job_scoring",
        systemPrompt: prompt.systemPrompt || "",
        userPrompt: prompt.userPrompt || "",
        modelId: prompt.modelId || "",
        isActive: prompt.isActive,
        isDefault: prompt.isDefault,
        sortOrder: prompt.sortOrder || 0,
        changeNote: "",
      });
    } else {
      // Reset form for creation
      setFormData({
        name: "",
        description: "",
        type: "job_scoring",
        systemPrompt: "",
        userPrompt: "",
        modelId: "",
        isActive: true,
        isDefault: false,
        sortOrder: 0,
        changeNote: "",
      });
    }
    setActiveTab("edit");
    setPreviewResult(null);
  }, [prompt, isCreating, isOpen]);

  // Fetch preview when preview tab is activated
  const fetchPreview = async () => {
    if (!formData.systemPrompt || !formData.userPrompt || !formData.type) {
      toast({
        title: "Missing content",
        description: "Please fill in the system prompt and user prompt first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPreview(true);
    try {
      const res = await apiRequest("POST", "/api/super-admin/prompts/preview", {
        systemPrompt: formData.systemPrompt,
        userPrompt: formData.userPrompt,
        type: formData.type,
      });
      if (!res.ok) throw new Error("Failed to generate preview");
      const data = await res.json();
      setPreviewResult(data);
    } catch (error) {
      toast({
        title: "Preview Error",
        description: "Failed to generate preview",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (activeTab === "preview" && !previewResult && !isLoadingPreview) {
      fetchPreview();
    }
  }, [activeTab]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        name: data.name,
        description: data.description || null,
        type: data.type,
        systemPrompt: data.systemPrompt,
        userPrompt: data.userPrompt,
        modelId: data.modelId || null,
        isActive: data.isActive,
        isDefault: data.isDefault,
        sortOrder: data.sortOrder,
      };

      if (isEditing && data.changeNote) {
        payload.changeNote = data.changeNote;
      }

      const url = isEditing
        ? `/api/super-admin/prompts/${prompt!.id}`
        : "/api/super-admin/prompts";
      const method = isEditing ? "PUT" : "POST";

      const res = await apiRequest(method, url, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${isEditing ? "update" : "create"} prompt`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Prompt updated" : "Prompt created",
        description: `The prompt has been ${isEditing ? "updated" : "created"} successfully.`,
      });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for the prompt.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.systemPrompt.trim() || !formData.userPrompt.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both the system prompt and user prompt.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareCode className="w-5 h-5" />
            {isEditing ? "Edit Prompt" : "Create New Prompt"}
            {prompt?.version && (
              <Badge variant="outline" className="ml-2">
                v{prompt.version}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the prompt configuration. Changes will be saved to version history."
              : "Create a new AI prompt template for the system."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Edit Tab */}
            <TabsContent value="edit" className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Job Scoring v2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {promptTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe what this prompt does..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelId">Model Override (Optional)</Label>
                  <Input
                    id="modelId"
                    value={formData.modelId}
                    onChange={(e) =>
                      setFormData({ ...formData, modelId: e.target.value })
                    }
                    placeholder="e.g., gpt-4o or leave empty for default"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 py-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isDefault: checked })
                    }
                  />
                  <Label htmlFor="isDefault">Set as Default</Label>
                </div>
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="changeNote">Change Note (Optional)</Label>
                  <Input
                    id="changeNote"
                    value={formData.changeNote}
                    onChange={(e) =>
                      setFormData({ ...formData, changeNote: e.target.value })
                    }
                    placeholder="Describe what changed in this version..."
                  />
                </div>
              )}

              {/* Variable Reference */}
              <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Variable className="w-4 h-4" />
                  <Label className="font-medium">Available Variables</Label>
                </div>
                <p className="text-sm text-slate-500 mb-3">
                  Use these placeholders in your prompts. They will be replaced with actual values at runtime.
                </p>
                <div className="flex flex-wrap gap-2">
                  {formData.type === "job_scoring" && (
                    <>
                      <Badge variant="secondary">{"{{jobTitle}}"}</Badge>
                      <Badge variant="secondary">{"{{jobDescription}}"}</Badge>
                      <Badge variant="secondary">{"{{jobRequirements}}"}</Badge>
                      <Badge variant="secondary">{"{{resume.name}}"}</Badge>
                      <Badge variant="secondary">{"{{resume.summary}}"}</Badge>
                      <Badge variant="secondary">{"{{resume.skills}}"}</Badge>
                      <Badge variant="secondary">{"{{resume.experience}}"}</Badge>
                      <Badge variant="secondary">{"{{resume.education}}"}</Badge>
                      <Badge variant="secondary">{"{{resume.certifications}}"}</Badge>
                      <Badge variant="secondary">{"{{resume.languages}}"}</Badge>
                      <Badge variant="secondary">{"{{customRules}}"}</Badge>
                    </>
                  )}
                  {formData.type === "resume_parsing" && (
                    <>
                      <Badge variant="secondary">{"{{resumeText}}"}</Badge>
                      <Badge variant="secondary">{"{{customRules}}"}</Badge>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Prompts Tab */}
            <TabsContent value="prompts" className="space-y-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt *</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  placeholder="Enter the system prompt with {{variables}}..."
                  className="font-mono text-sm min-h-[200px]"
                  rows={12}
                />
                <p className="text-xs text-slate-500">
                  This is the instruction set that defines how the AI behaves. Use {"{{variableName}}"} for dynamic values.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userPrompt">User Prompt *</Label>
                <Textarea
                  id="userPrompt"
                  value={formData.userPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, userPrompt: e.target.value })
                  }
                  placeholder="Enter the user prompt template with {{variables}}..."
                  className="font-mono text-sm min-h-[150px]"
                  rows={8}
                />
                <p className="text-xs text-slate-500">
                  This is the template for the user message. Variables will be replaced with actual job/resume data.
                </p>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4 pr-4">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : previewResult ? (
                <div className="space-y-6">
                  {/* Sample Data Used */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sample Data Used</Label>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <pre className="text-xs overflow-auto max-h-32">
                        {JSON.stringify(previewResult.sampleDataUsed, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Variables Found */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Variables Found</Label>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set([...previewResult.variablesInSystemPrompt, ...previewResult.variablesInUserPrompt])].map((v) => (
                        <Badge key={v} variant="outline">{`{{${v}}}`}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Rendered System Prompt */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Rendered System Prompt</Label>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64">
                        {previewResult.renderedSystemPrompt}
                      </pre>
                    </div>
                  </div>

                  {/* Rendered User Prompt */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Rendered User Prompt</Label>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64">
                        {previewResult.renderedUserPrompt}
                      </pre>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={fetchPreview}
                    className="w-full"
                  >
                    Refresh Preview
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Fill in the prompts to see a preview with sample data</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : isEditing ? (
              "Update Prompt"
            ) : (
              "Create Prompt"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
