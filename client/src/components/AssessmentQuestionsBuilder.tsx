import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { QuestionEditor } from "./QuestionEditor";
import type { AssessmentQuestion, AssessmentQuestionType } from "@shared/schema";

interface AssessmentQuestionsBuilderProps {
  questions: AssessmentQuestion[];
  onChange: (questions: AssessmentQuestion[]) => void;
}

const generateId = () => crypto.randomUUID();

const createDefaultQuestion = (order: number): AssessmentQuestion => ({
  id: generateId(),
  questionText: "",
  type: "text" as AssessmentQuestionType,
  description: "",
  order,
});

export function AssessmentQuestionsBuilder({ questions, onChange }: AssessmentQuestionsBuilderProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const addQuestion = () => {
    const newQuestion = createDefaultQuestion(questions.length);
    onChange([...questions, newQuestion]);
    setExpandedIds(new Set([...expandedIds, newQuestion.id]));
  };

  const updateQuestion = (id: string, updates: Partial<AssessmentQuestion>) => {
    onChange(
      questions.map((q) =>
        q.id === id ? { ...q, ...updates } : q
      )
    );
  };

  const deleteQuestion = (id: string) => {
    const newQuestions = questions
      .filter((q) => q.id !== id)
      .map((q, index) => ({ ...q, order: index }));
    onChange(newQuestions);
    const newExpanded = new Set(expandedIds);
    newExpanded.delete(id);
    setExpandedIds(newExpanded);
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    onChange(newQuestions.map((q, i) => ({ ...q, order: i })));
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getQuestionTypeLabel = (type: AssessmentQuestionType) => {
    const labels: Record<AssessmentQuestionType, string> = {
      text: "Text",
      multiple_choice: "Multiple Choice",
      yes_no: "Yes/No",
      numeric: "Numeric",
      rating: "Rating",
      file_upload: "File Upload",
    };
    return labels[type];
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
          <Plus className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No Assessment Questions
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
          Add assessment questions to gather specific information from applicants.
          Questions can be text, multiple choice, yes/no, numeric, rating, or file upload.
        </p>
        <Button onClick={addQuestion} className="bg-primary hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add First Question
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            Assessment Questions ({questions.length})
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Questions will be shown to applicants in order
          </p>
        </div>
        <Button onClick={addQuestion} size="sm" className="bg-primary hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      <div className="space-y-3">
        {questions.map((question, index) => {
          const isExpanded = expandedIds.has(question.id);
          return (
            <div
              key={question.id}
              className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden"
            >
              {/* Question Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                onClick={() => toggleExpanded(question.id)}
              >
                <div className="flex items-center gap-2 text-slate-400">
                  <GripVertical className="w-4 h-4" />
                  <span className="text-sm font-medium">#{index + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {question.questionText || "Untitled Question"}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      {getQuestionTypeLabel(question.type)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveQuestion(index, "up");
                    }}
                    disabled={index === 0}
                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveQuestion(index, "down");
                    }}
                    disabled={index === questions.length - 1}
                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteQuestion(question.id);
                    }}
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Question Editor (Expanded) */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
                  <QuestionEditor
                    question={question}
                    onChange={(updates) => updateQuestion(question.id, updates)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {questions.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          className="w-full border-dashed border-blue-300 text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Question
        </Button>
      )}
    </div>
  );
}
