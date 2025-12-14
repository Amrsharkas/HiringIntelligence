import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Plus, X, AlignLeft, ListChecks, ToggleLeft, Hash, Star, Upload } from "lucide-react";
import type { AssessmentQuestion, AssessmentQuestionType, AssessmentQuestionOption } from "@shared/schema";

interface QuestionEditorProps {
  question: AssessmentQuestion;
  onChange: (updates: Partial<AssessmentQuestion>) => void;
}

const QUESTION_TYPES: { value: AssessmentQuestionType; label: string; description: string; icon: React.ElementType }[] = [
  { value: "text", label: "Text", description: "Free text answer", icon: AlignLeft },
  { value: "multiple_choice", label: "Multiple Choice", description: "Select from options", icon: ListChecks },
  { value: "yes_no", label: "Yes/No", description: "Boolean response", icon: ToggleLeft },
  { value: "numeric", label: "Numeric", description: "Number input", icon: Hash },
  { value: "rating", label: "Rating", description: "Scale rating (1-5 or 1-10)", icon: Star },
  { value: "file_upload", label: "File Upload", description: "Document attachment", icon: Upload },
];

const ALLOWED_FILE_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "DOC" },
  { value: "docx", label: "DOCX" },
  { value: "txt", label: "TXT" },
  { value: "rtf", label: "RTF" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "jpeg", label: "JPEG" },
];

const generateOptionId = () => crypto.randomUUID();

export function QuestionEditor({ question, onChange }: QuestionEditorProps) {
  const handleTypeChange = (type: AssessmentQuestionType) => {
    const updates: Partial<AssessmentQuestion> = { type };

    // Initialize type-specific defaults
    if (type === "multiple_choice" && (!question.options || question.options.length < 2)) {
      updates.options = [
        { id: generateOptionId(), label: "", value: "" },
        { id: generateOptionId(), label: "", value: "" },
      ];
    }
    if (type === "rating" && !question.ratingScale) {
      updates.ratingScale = { min: 1, max: 5 };
    }
    if (type === "file_upload" && !question.validation?.allowedFileTypes) {
      updates.validation = {
        ...question.validation,
        allowedFileTypes: ["pdf", "doc", "docx"],
        maxFileSize: 10 * 1024 * 1024, // 10MB
      };
    }

    onChange(updates);
  };

  const addOption = () => {
    const newOption: AssessmentQuestionOption = {
      id: generateOptionId(),
      label: "",
      value: "",
    };
    onChange({
      options: [...(question.options || []), newOption],
    });
  };

  const updateOption = (optionId: string, updates: Partial<AssessmentQuestionOption>) => {
    onChange({
      options: question.options?.map((opt) =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      ),
    });
  };

  const removeOption = (optionId: string) => {
    onChange({
      options: question.options?.filter((opt) => opt.id !== optionId),
    });
  };

  const updateValidation = (updates: Partial<NonNullable<AssessmentQuestion["validation"]>>) => {
    onChange({
      validation: { ...question.validation, ...updates },
    });
  };

  const toggleFileType = (type: string) => {
    const current = question.validation?.allowedFileTypes || [];
    const newTypes = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateValidation({ allowedFileTypes: newTypes });
  };

  return (
    <div className="space-y-4">
      {/* Question Text */}
      <div>
        <Label className="text-sm font-medium">Question Text</Label>
        <Input
          value={question.questionText}
          onChange={(e) => onChange({ questionText: e.target.value })}
          placeholder="Enter your question..."
          className="mt-1"
        />
      </div>

      {/* Question Type */}
      <div>
        <Label className="text-sm font-medium">Question Type</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {QUESTION_TYPES.map(({ value, label, description, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeChange(value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                question.type === value
                  ? "border-primary bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${
                question.type === value ? "text-primary" : "text-slate-400"
              }`} />
              <div className={`text-sm font-medium ${
                question.type === value ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"
              }`}>
                {label}
              </div>
              <div className="text-xs text-slate-500">{description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label className="text-sm font-medium">Description (Optional)</Label>
        <Textarea
          value={question.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Add help text or instructions for this question..."
          rows={2}
          className="mt-1"
        />
      </div>

      {/* Type-specific Configuration */}
      {question.type === "multiple_choice" && (
        <div>
          <Label className="text-sm font-medium">Options</Label>
          <div className="space-y-2 mt-1">
            {question.options?.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <span className="text-sm text-slate-500 w-6">{index + 1}.</span>
                <Input
                  value={option.label}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateOption(option.id, {
                      label: value,
                      value: value.toLowerCase().replace(/\s+/g, "_"),
                    });
                  }}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(option.id)}
                  disabled={(question.options?.length || 0) <= 2}
                  className="h-8 w-8 text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {question.type === "rating" && (
        <div>
          <Label className="text-sm font-medium">Rating Scale</Label>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500">Min</Label>
              <Input
                type="number"
                value={question.ratingScale?.min || 1}
                onChange={(e) =>
                  onChange({
                    ratingScale: {
                      ...question.ratingScale,
                      min: parseInt(e.target.value) || 1,
                      max: question.ratingScale?.max || 5,
                    },
                  })
                }
                className="w-20"
                min={0}
              />
            </div>
            <span className="text-slate-400">to</span>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500">Max</Label>
              <Combobox
                options={["5", "10"]}
                value={String(question.ratingScale?.max || 5)}
                onValueChange={(value) =>
                  onChange({
                    ratingScale: {
                      min: question.ratingScale?.min || 1,
                      max: parseInt(value) || 5,
                    },
                  })
                }
                placeholder="Max"
                allowCustomValue={false}
              />
            </div>
          </div>
        </div>
      )}

      {question.type === "numeric" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Minimum Value (Optional)</Label>
            <Input
              type="number"
              value={question.validation?.minValue ?? ""}
              onChange={(e) =>
                updateValidation({
                  minValue: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="No minimum"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Maximum Value (Optional)</Label>
            <Input
              type="number"
              value={question.validation?.maxValue ?? ""}
              onChange={(e) =>
                updateValidation({
                  maxValue: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="No maximum"
              className="mt-1"
            />
          </div>
        </div>
      )}

      {question.type === "text" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Min Length (Optional)</Label>
            <Input
              type="number"
              value={question.validation?.minLength ?? ""}
              onChange={(e) =>
                updateValidation({
                  minLength: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="No minimum"
              className="mt-1"
              min={0}
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Max Length (Optional)</Label>
            <Input
              type="number"
              value={question.validation?.maxLength ?? ""}
              onChange={(e) =>
                updateValidation({
                  maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="No maximum"
              className="mt-1"
              min={1}
            />
          </div>
        </div>
      )}

      {question.type === "file_upload" && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Allowed File Types</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ALLOWED_FILE_TYPES.map(({ value, label }) => {
                const isSelected = question.validation?.allowedFileTypes?.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleFileType(value)}
                    className={`px-3 py-1 rounded-full text-sm border transition-all ${
                      isSelected
                        ? "border-primary bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    .{label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Max File Size (MB)</Label>
            <Input
              type="number"
              value={Math.round((question.validation?.maxFileSize || 10485760) / 1024 / 1024)}
              onChange={(e) =>
                updateValidation({
                  maxFileSize: (parseInt(e.target.value) || 10) * 1024 * 1024,
                })
              }
              className="mt-1 w-32"
              min={1}
              max={50}
            />
          </div>
        </div>
      )}

      {/* Required Toggle */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <Checkbox
          checked={question.validation?.required || false}
          onCheckedChange={(checked) =>
            updateValidation({ required: checked === true })
          }
        />
        <Label className="text-sm font-medium cursor-pointer">
          Required question
        </Label>
      </div>
    </div>
  );
}
