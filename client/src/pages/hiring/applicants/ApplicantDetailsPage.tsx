import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Play,
  User,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Star,
  AlertTriangle,
  TrendingUp,
  Brain,
  DollarSign,
  Code,
  Briefcase,
  Target,
  Users,
  Award,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Info,
  Lightbulb,
  TrendingDown,
  BarChart3,
  FileText,
  Shield,
  Zap,
  BookOpen,
  Heart,
  Building2,
  Rocket,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HLSVideoPlayer } from "@/components/HLSVideoPlayer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// HR-Focused Profile Processing Utilities
// ============================================================================

type AnyObject = Record<string, any>;

function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function deepClean<T>(input: T): T {
  if (Array.isArray(input)) {
    const cleanedArray = input
      .map(deepClean)
      .filter(item => !isEmpty(item));
    return cleanedArray as T;
  }

  if (typeof input === "object" && input !== null) {
    const cleanedObject: AnyObject = {};

    for (const [key, value] of Object.entries(input)) {
      const cleanedValue = deepClean(value);
      if (!isEmpty(cleanedValue)) {
        cleanedObject[key] = cleanedValue;
      }
    }

    return cleanedObject as T;
  }

  return input;
}

type GroupMap = {
  [groupName: string]: (key: string) => boolean;
};

const HR_GROUPS: GroupMap = {
  "🧠 Executive Summary": key =>
    ["summary", "profileSummary", "one_line_summary", "headline", "executive_summary", "oneSentence", "oneLiner", "key_impression"].some(k =>
      key.toLowerCase().includes(k.toLowerCase())
    ),

  "💼 Skills & Technical Capability": key =>
    key.toLowerCase().includes("skill") ||
    key.toLowerCase().includes("tech") ||
    key.toLowerCase().includes("tools") ||
    key.toLowerCase().includes("competenc") ||
    key.toLowerCase().includes("proficien"),

  "📊 Scores & Evaluation": key =>
    key.toLowerCase().includes("score") ||
    key.toLowerCase().includes("percentage") ||
    key.toLowerCase().includes("rating") ||
    key.toLowerCase().includes("metric"),

  "🧑‍💻 Experience & Background": key =>
    ["experience", "career_story", "years_of_experience", "background", "work_experience", "achievements", "projects"].some(k =>
      key.toLowerCase().includes(k.toLowerCase())
    ),

  "🧠 Personality & Culture Fit": key =>
    ["personality", "workstyle", "culture", "values", "behavioral", "soft_skills", "communication"].some(k =>
      key.toLowerCase().includes(k.toLowerCase())
    ),

  "🚩 Risks, Gaps & Red Flags": key =>
    ["redflags", "gaps", "concerns", "weakness", "improvement", "dealbreakers", "risk"].some(k =>
      key.toLowerCase().includes(k.toLowerCase())
    ),

  "🎯 Career Direction & Motivation": key =>
    ["career", "goals", "motivation", "direction", "aspirations", "objectives"].some(k =>
      key.toLowerCase().includes(k.toLowerCase())
    ),

  "🧾 Metadata & Admin": key =>
    ["metadata", "noticeperiod", "salary", "location", "timestamp", "created", "updated", "session"].some(k =>
      key.toLowerCase().includes(k.toLowerCase())
    )
};

function groupForHRReview(input: AnyObject): AnyObject {
  const cleaned = deepClean(input);
  const grouped: AnyObject = {};

  for (const [key, value] of Object.entries(cleaned)) {
    let assigned = false;

    for (const [groupName, matcher] of Object.entries(HR_GROUPS)) {
      if (matcher(key)) {
        grouped[groupName] ??= {};
        grouped[groupName][key] = value;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      grouped["📦 Other Relevant Data"] ??= {};
      grouped["📦 Other Relevant Data"][key] = value;
    }
  }

  return grouped;
}

// Helper to get score color
function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

// Normalize score key to identify duplicates (same meaning, different names)
function normalizeScoreKey(key: string): string {
  const lower = key.toLowerCase();

  // Map variations to standard names
  if (lower.includes('experience') && (lower.includes('score') || lower.includes('percentage'))) {
    return 'experience_score';
  }
  if (lower.includes('technical') || lower.includes('tech') && (lower.includes('score') || lower.includes('percentage'))) {
    return 'technical_skills_score';
  }
  if (lower.includes('cultural') && (lower.includes('score') || lower.includes('percentage'))) {
    return 'cultural_fit_score';
  }
  if (lower.includes('quality') && lower.includes('score')) {
    return 'quality_score';
  }
  if (lower.includes('hirability') && lower.includes('score')) {
    return 'hirability_score';
  }

  // For other scores, normalize by removing numbers and extra spaces
  return lower
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\d+/g, '')
    .trim();
}

// Recursively extract all scores from nested objects (with deduplication)
function extractAllScores(obj: any, path = ''): Array<{ key: string; value: number; path: string; normalizedKey: string }> {
  const seenValues = new Map<string, { key: string; value: number; path: string }>(); // normalizedKey+value -> best score entry

  function searchScores(currentObj: any, currentPath: string) {
    if (!currentObj || typeof currentObj !== 'object') return;

    for (const [key, value] of Object.entries(currentObj)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      // Check if key indicates a score and value is a number
      if (
        (key.toLowerCase().includes('score') ||
          key.toLowerCase().includes('percentage') ||
          key.toLowerCase().startsWith('section')) &&
        typeof value === 'number' &&
        value >= 0 &&
        value <= 100
      ) {
        const normalizedKey = normalizeScoreKey(key);
        // Use normalizedKey + value as unique identifier to avoid duplicates with same value
        const uniqueId = `${normalizedKey}_${value}`;
        const existing = seenValues.get(uniqueId);

        // Keep the most descriptive key (prefer shorter, clearer names, avoid "0 100" suffix)
        const isBetterKey = !existing ||
          key.length < existing.key.length ||
          (!key.includes('0') && !key.includes('100') && existing.key.includes('0')) ||
          key.toLowerCase().includes('overall');

        if (isBetterKey) {
          seenValues.set(uniqueId, { key, value, path: fullPath });
        }
      }

      // Recursively search nested objects (but skip already processed comprehensiveProfile/brutallyHonestProfile)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Skip nested comprehensiveProfile/brutallyHonestProfile to avoid duplicates
        if (key !== 'comprehensiveProfile' && key !== 'brutallyHonestProfile' && key !== 'honestProfile') {
          searchScores(value, fullPath);
        }
      }
    }
  }

  searchScores(obj, path);

  // Convert to array with normalizedKey, but remove duplicates with same normalizedKey and value
  const finalScores = new Map<string, { key: string; value: number; path: string; normalizedKey: string }>();
  Array.from(seenValues.values()).forEach(entry => {
    const normalizedKey = normalizeScoreKey(entry.key);
    const uniqueId = `${normalizedKey}_${entry.value}`;

    if (!finalScores.has(uniqueId)) {
      finalScores.set(uniqueId, {
        ...entry,
        normalizedKey
      });
    }
  });

  return Array.from(finalScores.values());
}

// Extract overall score with priority
function extractOverallScore(profile: AnyObject): number | null {
  // Priority order: overall_weighted_score > overallScore > matchScorePercentage
  return (
    profile?.comprehensiveProfile?.brutallyHonestProfile?.scores?.overall_weighted_score_0_100 ||
    profile?.brutallyHonestProfile?.scores?.overall_weighted_score_0_100 ||
    profile?.scores?.overall_weighted_score_0_100 ||
    profile?.overallScore ||
    profile?.overall_score ||
    profile?.scores?.overallScore ||
    profile?.scores?.overall_score?.value ||
    profile?.scores?.overall_score?.score ||
    profile?.keyMetrics?.overallScore ||
    profile?.matchScorePercentage ||
    null
  );
}

// Extract AI opinion from multiple possible locations
function extractAIOpinion(profile: AnyObject): string | null {
  return (
    profile?.executive_summary?.one_sentence ||
    profile?.executive_summary?.oneSentence ||
    profile?.executive_summary?.oneLiner ||
    profile?.executive_summary?.key_impression ||
    profile?.executiveSummary?.oneSentence ||
    profile?.comprehensiveProfile?.brutallyHonestProfile?.meta_profile_overview?.one_line_summary ||
    profile?.brutallyHonestProfile?.meta_profile_overview?.one_line_summary ||
    profile?.summary ||
    profile?.profileSummary ||
    null
  );
}

// Extract array data (strengths, red flags, gaps) from multiple locations
function extractArrayData(profile: AnyObject, keys: string[]): any[] {
  const result: any[] = [];
  const seen = new Set<string>();

  function searchInObject(obj: any, depth = 0) {
    if (depth > 5 || !obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if this key matches any of our search keys
      if (keys.some(searchKey => lowerKey.includes(searchKey.toLowerCase()))) {
        if (Array.isArray(value) && value.length > 0) {
          value.forEach((item: any) => {
            const itemStr = typeof item === 'object'
              ? JSON.stringify(item)
              : String(item);
            if (!seen.has(itemStr)) {
              seen.add(itemStr);
              result.push(item);
            }
          });
        }
      }

      // Recursively search nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        searchInObject(value, depth + 1);
      }
    }
  }

  searchInObject(profile);
  return result;
}

// Extract specific data fields from profile
function extractField(profile: AnyObject, paths: string[]): any {
  for (const path of paths) {
    const keys = path.split('.');
    let value: any = profile;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        value = null;
        break;
      }
    }
    if (value !== null && !isEmpty(value)) return value;
  }
  return null;
}

// Extract skills from multiple locations
function extractSkills(profile: AnyObject): string[] {
  const skills = new Set<string>();

  const skillPaths = [
    'skills',
    'comprehensiveProfile.skills',
    'brutallyHonestProfile.skills_and_capabilities.core_hard_skills',
    'honestProfile.skills',
  ];

  skillPaths.forEach(path => {
    const value = extractField(profile, [path]);
    if (Array.isArray(value)) {
      value.forEach((skill: any) => {
        if (typeof skill === 'string') skills.add(skill);
        else if (skill?.skill) skills.add(skill.skill);
      });
    }
  });

  return Array.from(skills);
}

// Extract salary information
function extractSalary(profile: AnyObject): { range?: string; expectation?: string } {
  return {
    range: extractField(profile, [
      'honestProfile.salaryRange',
      'comprehensiveProfile.brutallyHonestProfile.metadata.salaryExpectation',
      'brutallyHonestProfile.metadata.salaryExpectation',
    ]) || undefined,
    expectation: extractField(profile, [
      'comprehensiveProfile.brutallyHonestProfile.metadata.salaryExpectation',
      'brutallyHonestProfile.metadata.salaryExpectation',
    ]) || undefined,
  };
}

// Render FAQ-style item
function renderFAQItem(question: string, answer: any, index: number): React.ReactNode {
  return (
    <AccordionItem key={index} value={`faq-${index}`} className="border-b border-slate-200 dark:border-slate-700">
      <AccordionTrigger className="hover:no-underline text-left">
        <div className="flex items-start gap-2 flex-1">
          <span className="text-primary font-semibold mt-1">Q{index + 1}:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{question}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2">
        <div className="pl-6 text-slate-600 dark:text-slate-400">
          {typeof answer === 'object' ? (
            <div className="space-y-2">
              {Object.entries(answer).map(([key, val]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {String(val)}
                </div>
              ))}
            </div>
          ) : (
            <p>{String(answer)}</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// Component to render profile in structured format (like pitch.tsx)
function renderStructuredProfile(profile: AnyObject): React.ReactNode {
  const cleaned = deepClean(profile);

  // Extract overall score separately with priority
  const overallScoreValue = extractOverallScore(cleaned);

  // Extract all other scores (excluding overall to avoid duplication)
  const allScores = extractAllScores(cleaned);

  // Filter out overall/match scores from allScores since we handle them separately
  const sectionScores = allScores.filter(s =>
    s.key.toLowerCase().startsWith('section')
  );

  // Get other scores, but exclude duplicates and overall scores
  const seenNormalized = new Set<string>();
  const otherScores = allScores.filter(s => {
    const normalized = s.normalizedKey;
    // Skip if already seen or if it's an overall/match score
    if (seenNormalized.has(normalized) ||
      s.key.toLowerCase().includes('overall') ||
      s.key.toLowerCase().includes('match')) {
      return false;
    }
    seenNormalized.add(normalized);
    return true;
  });

  // Extract AI opinion
  const aiOpinion = extractAIOpinion(cleaned);

  // Extract arrays (no duplicates)
  const strengths = extractArrayData(cleaned, ['strength', 'highlight', 'green_flag', 'achievement', 'key_highlights']);
  const redFlags = extractArrayData(cleaned, ['red_flag', 'dealbreaker', 'risk']);
  let gaps = extractArrayData(cleaned, ['gap', 'concern', 'weakness', 'improvement', 'watchout', 'criticalWeaknesses']);

  // Extract concerns from brutallyHonestProfile and add to gaps
  const concernsData = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.concerns',
    'brutallyHonestProfile.concerns',
  ]);

  // Handle both formats: array of concerns OR object with concerns array
  if (concernsData) {
    if (Array.isArray(concernsData)) {
      // Format 1: concerns is directly an array
      gaps = [...gaps, ...concernsData];
    } else if (Array.isArray(concernsData.concerns)) {
      // Format 2: concerns is an object with concerns array
      gaps = [...gaps, ...concernsData.concerns];
    }
  }

  // Extract specific important fields
  const skills = extractSkills(cleaned);
  const salary = extractSalary(cleaned);
  const workStyle = extractField(cleaned, ['workStyle', 'comprehensiveProfile.workStyle', 'brutallyHonestProfile.work_style_and_collaboration.day_to_day_work_style']);
  const careerGoals = extractField(cleaned, ['careerGoals', 'comprehensiveProfile.careerGoals', 'brutallyHonestProfile.motivation_and_career_direction.short_term_goals_1_2_years']);
  const personality = extractField(cleaned, ['personality', 'comprehensiveProfile.personality', 'brutallyHonestProfile.personality_and_values.personality_summary']);
  const recommendedRole = extractField(cleaned, ['honestProfile.recommendedRole', 'brutallyHonestProfile.recommended_roles_and_pathways.recommended_role_types']);
  const skillAssessment = extractField(cleaned, ['honestProfile.skillAssessment']);
  const experienceVerification = extractField(cleaned, ['honestProfile.experienceVerification']);

  // Extract career story
  const careerStory = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.career_story',
    'brutallyHonestProfile.career_story',
  ]);

  // Extract trends
  const trends = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.trends',
    'brutallyHonestProfile.trends',
  ]);

  // Extract concerns (yellow flags, mitigation)
  const concerns = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.concerns',
    'brutallyHonestProfile.concerns',
  ]);

  // Extract interview quality metadata
  const interviewQuality = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.metadata.interviewQuality',
    'brutallyHonestProfile.metadata.interviewQuality',
  ]);

  // Extract identity & background
  const identity = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.identity_and_background',
    'brutallyHonestProfile.identity_and_background',
  ]);

  // Extract achievements
  const achievements = extractArrayData(cleaned, ['achievement', 'representative_achievements', 'key_milestones']);

  // Extract derived tags
  const tags = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.derived_tags',
    'brutallyHonestProfile.derived_tags',
  ]);

  // Extract risk & stability
  const riskStability = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.risk_and_stability',
    'brutallyHonestProfile.risk_and_stability',
  ]);

  // Extract additional fields from Format 1 (new format)
  const skillsMatch = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.skills_match',
    'brutallyHonestProfile.skills_match',
  ]);

  const overallScoring = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.overall_scoring',
    'brutallyHonestProfile.overall_scoring',
  ]);

  const experienceAnalysis = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.experience_analysis',
    'brutallyHonestProfile.experience_analysis',
  ]);

  const answerQualityAnalysis = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.answer_quality_analysis',
    'brutallyHonestProfile.answer_quality_analysis',
  ]);

  const overallRiskAssessment = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.overall_risk_assessment',
    'brutallyHonestProfile.overall_risk_assessment',
  ]);

  const compensationLogistics = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.compensation_and_logistics',
    'brutallyHonestProfile.compensation_and_logistics',
  ]);

  const dataQualityNotes = extractField(cleaned, [
    'comprehensiveProfile.brutallyHonestProfile.data_quality_notes',
    'brutallyHonestProfile.data_quality_notes',
  ]);

  // Get all other data (excluding scores and already extracted arrays)
  const processedKeys = new Set([
    'overallScore', 'overall_score', 'matchScorePercentage', 'sectionA', 'sectionB', 'sectionC', 'sectionD', 'sectionE', 'sectionF',
    'strengthsHighlights', 'strengths', 'redFlags', 'improvementAreas', 'gaps', 'concerns',
    'executive_summary', 'executiveSummary', 'summary', 'profileSummary',
    'comprehensiveProfile', 'brutallyHonestProfile', 'honestProfile'
  ]);

  const otherData: Array<{ key: string; value: any }> = [];
  const seenValues = new Set<string>();

  function extractOtherData(obj: any, prefix = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // Skip if already processed or empty
      if (processedKeys.has(key) || isEmpty(value)) continue;

      // Skip if it's a nested object we've already processed
      if (key === 'comprehensiveProfile' || key === 'brutallyHonestProfile' || key === 'honestProfile') {
        extractOtherData(value, fullKey);
        continue;
      }

      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (!seenValues.has(valueStr) && !isEmpty(value)) {
        seenValues.add(valueStr);
        otherData.push({ key: fullKey, value });
      }

      // Recursively process nested objects (but not too deep)
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && prefix.split('.').length < 3) {
        extractOtherData(value, fullKey);
      }
    }
  }

  extractOtherData(cleaned);

  return (
    <div className="space-y-6">
      {/* Section 1: Scores Dashboard - Top Priority */}
      {(overallScoreValue !== null || sectionScores.length > 0 || otherScores.length > 0) && (
        <Card className="bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border-2 border-primary">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Scores & Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Overall Score - Large Display */}
              {overallScoreValue !== null && (
                <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-xl border-2 border-primary shadow-lg">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Overall Score
                  </div>
                  <div className={`text-6xl font-bold ${getScoreColor(overallScoreValue)}`}>
                    {overallScoreValue}%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Weighted Assessment Score
                  </div>
                </div>
              )}

              {/* Section Scores */}
              {sectionScores.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Section Scores
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {sectionScores.map((score) => (
                      <div key={score.path} className={`text-center p-4 rounded-lg ${getScoreBgColor(score.value)} border border-slate-200 dark:border-slate-700`}>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          {score.key}
                        </div>
                        <div className={`text-3xl font-bold ${getScoreColor(score.value)}`}>
                          {score.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Scores */}
              {otherScores.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Additional Scores
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {otherScores.map((score) => (
                      <div key={score.path} className={`text-center p-3 rounded-lg ${getScoreBgColor(score.value)} border border-slate-200 dark:border-slate-700`}>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 truncate" title={score.key}>
                          {score.key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                        </div>
                        <div className={`text-2xl font-bold ${getScoreColor(score.value)}`}>
                          {score.value}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Opinion Card */}
      {aiOpinion && (
        <Card className="bg-linear-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border border-indigo-200 dark:border-indigo-700">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                  AI Opinion
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {aiOpinion}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Power Points (Strengths) */}
      {strengths.length > 0 && (
        <Card className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Star className="w-6 h-6 text-green-600" />
              Power Points & Strengths ({strengths.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {strengths.map((strength: any, index: number) => {
                // Check if it's a detailed object with point/reason/evidence (FAQ format)
                const isDetailedFormat = typeof strength === 'object' &&
                  strength !== null &&
                  (strength.point || strength.reason || strength.evidence);

                if (isDetailedFormat) {
                  // FAQ Style for detailed format
                  const question = strength.point || strength.strength || strength.description || 'Strength';
                  const answer = {
                    reason: strength.reason || 'N/A',
                    evidence: strength.evidence || 'N/A',
                    confidence_level_0_100: strength.confidence_level_0_100 || 'N/A',
                    ...strength
                  };
                  return (
                    <div key={index}>
                      <Accordion type="multiple" className="w-full">
                        {renderFAQItem(question, answer, index)}
                      </Accordion>
                    </div>
                  );
                } else {
                  // Simple one-line format
                  const displayText = typeof strength === 'object'
                    ? (strength.strength || strength.description || strength.highlight || JSON.stringify(strength))
                    : String(strength);

                  return (
                    <div key={index} className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 border border-green-200 dark:border-green-700">
                      <div className="flex items-start gap-2">
                        <Star className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{displayText}</p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Red Flags */}
      {redFlags.length > 0 && (
        <Card className="bg-linear-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border border-red-200 dark:border-red-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Red Flags ({redFlags.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {redFlags.map((flag: any, index: number) => {
                // Check if it's a detailed object with point/reason/evidence (FAQ format)
                const isDetailedFormat = typeof flag === 'object' &&
                  flag !== null &&
                  (flag.point || flag.reason || flag.evidence);

                if (isDetailedFormat) {
                  // FAQ Style for detailed format
                  const question = flag.point || flag.issue || flag.type || flag.flag || 'Red Flag';
                  const answer = {
                    reason: flag.reason || 'N/A',
                    evidence: flag.evidence || 'N/A',
                    severity: flag.severity || 'N/A',
                    confidence_level_0_100: flag.confidence_level_0_100 || 'N/A',
                    ...flag
                  };
                  return (
                    <div key={index}>
                      <Accordion type="multiple" className="w-full">
                        {renderFAQItem(question, answer, index)}
                      </Accordion>
                    </div>
                  );
                } else {
                  // Simple one-line format
                  const displayText = typeof flag === 'object'
                    ? (flag.issue || flag.type || flag.flag || JSON.stringify(flag))
                    : String(flag);

                  return (
                    <div key={index} className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 border border-red-200 dark:border-red-700">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{displayText}</p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Gaps & Concerns */}
      {gaps.length > 0 && (
        <Card className="bg-linear-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200 dark:border-orange-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-orange-600" />
              Gaps & Concerns ({gaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gaps.map((gap: any, index: number) => {
                // Check if it's a detailed object with point/reason/evidence (FAQ format)
                const isDetailedFormat = typeof gap === 'object' &&
                  gap !== null &&
                  (gap.point || gap.reason || gap.evidence);

                if (isDetailedFormat) {
                  // FAQ Style for detailed format
                  const question = gap.point || gap.gap || gap.concern || gap.weakness || gap.watchout || 'Gap/Concern';
                  const answer = {
                    reason: gap.reason || 'N/A',
                    evidence: gap.evidence || 'N/A',
                    recommendation: gap.recommendation || 'N/A',
                    severity: gap.severity || 'N/A',
                    confidence_level_0_100: gap.confidence_level_0_100 || 'N/A',
                    ...gap
                  };
                  return (
                    <div key={index}>
                      <Accordion type="multiple" className="w-full">
                        {renderFAQItem(question, answer, index)}
                      </Accordion>
                    </div>
                  );
                } else {
                  // Simple one-line format
                  const displayText = typeof gap === 'object'
                    ? (gap.gap || gap.concern || gap.weakness || gap.watchout || JSON.stringify(gap))
                    : String(gap);

                  return (
                    <div key={index} className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{displayText}</p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Salary - Very Important */}
      {(salary.range || salary.expectation) && (
        <Card className="bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-300 dark:border-emerald-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              Salary Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {salary.range && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Salary Range</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{salary.range}</p>
                </div>
              )}
              {salary.expectation && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Expected Salary</span>
                  </div>
                  <p className="text-lg text-slate-600 dark:text-slate-400">{salary.expectation}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 6: Skills */}
      {skills.length > 0 && (
        <Card className="bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-200 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Code className="w-6 h-6 text-blue-600" />
              Technical Skills ({skills.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span key={index} className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )
      }

      {/* Section 7: Identity & Background */}
      {
        identity && (
          <Card className="bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <User className="w-6 h-6 text-purple-600" />
                Identity & Background
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {identity.full_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Full Name</div>
                      <div className="font-medium">{identity.full_name}</div>
                    </div>
                  </div>
                )}
                {identity.primary_role && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Role</div>
                      <div className="font-medium">{identity.primary_role}</div>
                    </div>
                  </div>
                )}
                {identity.years_of_experience !== undefined && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Experience</div>
                      <div className="font-medium">{identity.years_of_experience} years</div>
                    </div>
                  </div>
                )}
                {identity.city && identity.country && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Location</div>
                      <div className="font-medium">{identity.city}, {identity.country}</div>
                    </div>
                  </div>
                )}
                {identity.seniority_level && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Seniority</div>
                      <div className="font-medium capitalize">{identity.seniority_level}</div>
                    </div>
                  </div>
                )}
              </div>
              {identity.brief_background_summary && (
                <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{identity.brief_background_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }

      {/* Section 8: Work Style & Personality */}
      {
        (workStyle || personality || careerGoals) && (
          <Card className="bg-linear-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 border border-indigo-200 dark:border-indigo-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                Work Style & Personality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workStyle && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Work Style</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">{workStyle}</p>
                </div>
              )}
              {personality && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Personality</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">{personality}</p>
                </div>
              )}
              {careerGoals && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Career Goals</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">{careerGoals}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }

      {/* Section 9: Career Story */}
      {
        careerStory && (
          <Card className="bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border border-amber-200 dark:border-amber-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-amber-600" />
                Career Story
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {careerStory.narrative && (
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Narrative</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{careerStory.narrative}</p>
                </div>
              )}
              {careerStory.key_milestones && Array.isArray(careerStory.key_milestones) && careerStory.key_milestones.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Key Milestones</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {careerStory.key_milestones.map((milestone: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{milestone}</li>
                    ))}
                  </ul>
                </div>
              )}
              {careerStory.representative_achievements && Array.isArray(careerStory.representative_achievements) && careerStory.representative_achievements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Representative Achievements</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {careerStory.representative_achievements.map((achievement: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{achievement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }

      {/* Section 10: Recommended Role & Assessment */}
      {
        (recommendedRole || skillAssessment || experienceVerification) && (
          <Card className="bg-linear-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-slate-600" />
                Assessment & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedRole && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Recommended Role</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">
                    {Array.isArray(recommendedRole) ? recommendedRole.join(', ') : recommendedRole}
                  </p>
                </div>
              )}
              {skillAssessment && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Skill Assessment</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">{skillAssessment}</p>
                </div>
              )}
              {experienceVerification && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Experience Verification</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">{experienceVerification}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }

      {/* Section 11: Trends */}
      {
        trends && (
          <Card className="bg-linear-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 border border-cyan-200 dark:border-cyan-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-cyan-600" />
                Trends & Development
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {trends.career_trajectory && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-cyan-200 dark:border-cyan-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Career Trajectory</div>
                    <div className="font-semibold text-cyan-600 capitalize">{trends.career_trajectory}</div>
                  </div>
                )}
                {trends.communication_trend && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-cyan-200 dark:border-cyan-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Communication</div>
                    <div className="font-semibold text-cyan-600">{trends.communication_trend}</div>
                  </div>
                )}
                {trends.skill_development_trend && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-cyan-200 dark:border-cyan-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Skill Development</div>
                    <div className="font-semibold text-cyan-600">{trends.skill_development_trend}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* Section 12: Concerns (Yellow Flags & Mitigation) */}
      {
        concerns && (concerns.yellow_flags?.length > 0 || concerns.mitigation_strategies?.length > 0) && (
          <Card className="bg-linear-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border border-yellow-200 dark:border-yellow-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                Concerns & Mitigation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {concerns.yellow_flags && concerns.yellow_flags.length > 0 && (
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Yellow Flags</div>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {concerns.yellow_flags.map((flag: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
              {concerns.mitigation_strategies && concerns.mitigation_strategies.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Mitigation Strategies</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {concerns.mitigation_strategies.map((strategy: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{strategy}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }

      {/* Section 13: Interview Quality */}
      {
        interviewQuality && (
          <Card className="bg-linear-to-r from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30 border border-teal-200 dark:border-teal-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="w-6 h-6 text-teal-600" />
                Interview Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {interviewQuality.qualityScore !== undefined && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-teal-200 dark:border-teal-700 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Quality Score</div>
                    <div className={`text-2xl font-bold ${getScoreColor(interviewQuality.qualityScore)}`}>
                      {interviewQuality.qualityScore}%
                    </div>
                  </div>
                )}
                {interviewQuality.totalWords !== undefined && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-teal-200 dark:border-teal-700 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Words</div>
                    <div className="text-2xl font-bold text-teal-600">{interviewQuality.totalWords}</div>
                  </div>
                )}
                {interviewQuality.questionsCount !== undefined && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-teal-200 dark:border-teal-700 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Questions</div>
                    <div className="text-2xl font-bold text-teal-600">{interviewQuality.questionsCount}</div>
                  </div>
                )}
                {interviewQuality.dataSufficiency && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-teal-200 dark:border-teal-700 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data Sufficiency</div>
                    <div className={`text-lg font-bold ${interviewQuality.dataSufficiency === 'SUFFICIENT' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {interviewQuality.dataSufficiency}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* Section 14: Achievements */}
      {
        achievements.length > 0 && (
          <Card className="bg-linear-to-r from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30 border border-pink-200 dark:border-pink-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Award className="w-6 h-6 text-pink-600" />
                Achievements ({achievements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 pl-4">
                {achievements.map((achievement: any, i: number) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400">
                    {typeof achievement === 'object' ? JSON.stringify(achievement) : String(achievement)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      }

      {/* Section 15: Tags */}
      {
        tags && Array.isArray(tags) && tags.length > 0 && (
          <Card className="bg-linear-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 border border-violet-200 dark:border-violet-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Zap className="w-6 h-6 text-violet-600" />
                Derived Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-sm font-medium text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 capitalize">
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* Section 16: Risk & Stability */}
      {
        riskStability && (
          <Card className="bg-linear-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Shield className="w-6 h-6 text-slate-600" />
                Risk & Stability Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {riskStability.integrated_risk_view && (
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Integrated Risk View</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{riskStability.integrated_risk_view}</p>
                </div>
              )}
              {riskStability.stability_overall_assessment && (
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Stability Assessment</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{riskStability.stability_overall_assessment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }

      {/* Section 17: Skills Match (Format 1) */}
      {skillsMatch && Array.isArray(skillsMatch) && skillsMatch.length > 0 && (
        <Card className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Code className="w-6 h-6 text-green-600" />
              Skills Match Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {skillsMatch.map((match: any, index: number) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{match.skill}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${match.match_level === 'STRONG' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      match.match_level === 'MODERATE' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        match.match_level === 'WEAK' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {match.match_level}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{match.reason}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 italic">Evidence: {match.evidence}</p>
                  {match.confidence_level_0_100 !== undefined && (
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Confidence: {match.confidence_level_0_100}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 18: Overall Scoring (Format 1) */}
      {overallScoring && (
        <Card className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Overall Scoring Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overallScoring.scoring_explanation && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{overallScoring.scoring_explanation}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {overallScoring.job_core_fit_score_0_100 !== undefined && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Job Core Fit</div>
                  <div className={`text-2xl font-bold ${getScoreColor(overallScoring.job_core_fit_score_0_100)}`}>
                    {overallScoring.job_core_fit_score_0_100}%
                  </div>
                </div>
              )}
              {overallScoring.final_overall_score_0_100 !== undefined && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Final Overall</div>
                  <div className={`text-2xl font-bold ${getScoreColor(overallScoring.final_overall_score_0_100)}`}>
                    {overallScoring.final_overall_score_0_100}%
                  </div>
                </div>
              )}
              {overallScoring.answer_quality_score_0_100 !== undefined && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Answer Quality</div>
                  <div className={`text-2xl font-bold ${getScoreColor(overallScoring.answer_quality_score_0_100)}`}>
                    {overallScoring.answer_quality_score_0_100}%
                  </div>
                </div>
              )}
              {overallScoring.risk_adjustment_score_0_100 !== undefined && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Risk Adjustment</div>
                  <div className={`text-2xl font-bold ${getScoreColor(overallScoring.risk_adjustment_score_0_100)}`}>
                    {overallScoring.risk_adjustment_score_0_100}%
                  </div>
                </div>
              )}
              {overallScoring.experience_quality_score_0_100 !== undefined && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Experience Quality</div>
                  <div className={`text-2xl font-bold ${getScoreColor(overallScoring.experience_quality_score_0_100)}`}>
                    {overallScoring.experience_quality_score_0_100}%
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 19: Experience Analysis (Format 1) */}
      {experienceAnalysis && (
        <Card className="bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-purple-600" />
              Experience Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {experienceAnalysis.ai_reasoning_summary && (
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Summary</div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{experienceAnalysis.ai_reasoning_summary}</p>
              </div>
            )}
            {experienceAnalysis.relevant_experience_years !== undefined && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Relevant Experience</div>
                  <div className="text-xl font-bold text-purple-600">{experienceAnalysis.relevant_experience_years} years</div>
                </div>
                {experienceAnalysis.irrelevant_or_partial_experience_years !== undefined && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Irrelevant/Partial</div>
                    <div className="text-xl font-bold text-purple-600">{experienceAnalysis.irrelevant_or_partial_experience_years} years</div>
                  </div>
                )}
              </div>
            )}
            {experienceAnalysis.breakdown_by_role && Array.isArray(experienceAnalysis.breakdown_by_role) && experienceAnalysis.breakdown_by_role.length > 0 && (
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Breakdown by Role</div>
                <div className="space-y-2">
                  {experienceAnalysis.breakdown_by_role.map((role: any, i: number) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{role.role}</span>
                        <span className={`px-2 py-1 rounded text-xs ${role.relevance_level === 'HIGH' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          role.relevance_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          {role.relevance_level}
                        </span>
                      </div>
                      {role.company && <div className="text-xs text-slate-500 dark:text-slate-400">{role.company}</div>}
                      {role.duration_months && <div className="text-xs text-slate-500 dark:text-slate-400">{role.duration_months} months</div>}
                      {role.reason && <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{role.reason}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 20: Answer Quality Analysis (Format 1) */}
      {answerQualityAnalysis && Array.isArray(answerQualityAnalysis) && answerQualityAnalysis.length > 0 && (
        <Card className="bg-linear-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 border border-cyan-200 dark:border-cyan-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-600" />
              Answer Quality Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {answerQualityAnalysis.map((analysis: any, index: number) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-cyan-200 dark:border-cyan-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{analysis.question_topic}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${analysis.answer_quality === 'GOOD' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      analysis.answer_quality === 'AVERAGE' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {analysis.answer_quality}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{analysis.evidence}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 italic">AI Reasoning: {analysis.ai_reasoning}</p>
                  {analysis.depth_level && (
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Depth Level: <span className="font-medium">{analysis.depth_level}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 21: Overall Risk Assessment (Format 1) */}
      {overallRiskAssessment && (
        <Card className="bg-linear-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 border border-orange-200 dark:border-orange-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              Overall Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overallRiskAssessment.overall_ai_judgment && (
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">AI Judgment</div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{overallRiskAssessment.overall_ai_judgment}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overallRiskAssessment.retention_risk && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Retention Risk</div>
                  <div className={`font-semibold ${overallRiskAssessment.retention_risk === 'LOW' ? 'text-green-600' :
                    overallRiskAssessment.retention_risk === 'MEDIUM' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                    {overallRiskAssessment.retention_risk}
                  </div>
                </div>
              )}
              {overallRiskAssessment.hire_risk_level && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Hire Risk Level</div>
                  <div className={`font-semibold ${overallRiskAssessment.hire_risk_level === 'LOW' ? 'text-green-600' :
                    overallRiskAssessment.hire_risk_level === 'MEDIUM' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                    {overallRiskAssessment.hire_risk_level}
                  </div>
                </div>
              )}
            </div>
            {overallRiskAssessment.key_risk_drivers && Array.isArray(overallRiskAssessment.key_risk_drivers) && overallRiskAssessment.key_risk_drivers.length > 0 && (
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Key Risk Drivers</div>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  {overallRiskAssessment.key_risk_drivers.map((driver: string, i: number) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{driver}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 22: Compensation & Logistics (Format 1) */}
      {compensationLogistics && (
        <Card className="bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              Compensation & Logistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {compensationLogistics.notice_period && compensationLogistics.notice_period.value && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Notice Period</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">{compensationLogistics.notice_period.value}</p>
                {compensationLogistics.notice_period.evidence && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 italic">Evidence: {compensationLogistics.notice_period.evidence}</p>
                )}
              </div>
            )}
            {compensationLogistics.job_search_reason && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Job Search Reason</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">{compensationLogistics.job_search_reason.stated_reason}</p>
                {compensationLogistics.job_search_reason.ai_interpretation && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 italic">AI Interpretation: {compensationLogistics.job_search_reason.ai_interpretation}</p>
                )}
                {compensationLogistics.job_search_reason.risk_level && (
                  <div className="mt-1 pl-6">
                    <span className={`px-2 py-1 rounded text-xs ${compensationLogistics.job_search_reason.risk_level === 'LOW' ? 'bg-green-100 text-green-700' :
                      compensationLogistics.job_search_reason.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                      Risk: {compensationLogistics.job_search_reason.risk_level}
                    </span>
                  </div>
                )}
              </div>
            )}
            {compensationLogistics.salary_expectation && compensationLogistics.salary_expectation.value && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Salary Expectation</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">{compensationLogistics.salary_expectation.value}</p>
              </div>
            )}
            {compensationLogistics.background_highlights && Array.isArray(compensationLogistics.background_highlights) && compensationLogistics.background_highlights.length > 0 && (
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Background Highlights</div>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  {compensationLogistics.background_highlights.map((highlight: string, i: number) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{highlight}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 23: Data Quality Notes (Format 1) */}
      {dataQualityNotes && (
        <Card className="bg-linear-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 border border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Info className="w-6 h-6 text-slate-600" />
              Data Quality Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dataQualityNotes.notes && (
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{dataQualityNotes.notes}</p>
              </div>
            )}
            {dataQualityNotes.confidence_in_profile_0_100 !== undefined && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Confidence in Profile</div>
                <div className={`text-2xl font-bold ${getScoreColor(dataQualityNotes.confidence_in_profile_0_100)}`}>
                  {dataQualityNotes.confidence_in_profile_0_100}%
                </div>
              </div>
            )}
            {dataQualityNotes.major_information_gaps && Array.isArray(dataQualityNotes.major_information_gaps) && dataQualityNotes.major_information_gaps.length > 0 && (
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Major Information Gaps</div>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  {dataQualityNotes.major_information_gaps.map((gap: string, i: number) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{gap}</li>
                  ))}
                </ul>
              </div>
            )}
            {dataQualityNotes.inconsistencies_detected && Array.isArray(dataQualityNotes.inconsistencies_detected) && dataQualityNotes.inconsistencies_detected.length > 0 && (
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Inconsistencies Detected</div>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  {dataQualityNotes.inconsistencies_detected.map((inconsistency: string, i: number) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{inconsistency}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 24: Other Data - Dynamic Cards */}
      {otherData.length > 0 && (
        <Card className="bg-linear-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 border border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200">
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherData.map(({ key, value }, index) => {
                const displayKey = key.split('.').pop() || key;
                const formattedKey = displayKey
                  .replace(/_/g, ' ')
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .trim();

                // Determine card color based on key
                let cardColor = 'from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30';
                let borderColor = 'border-blue-200 dark:border-blue-700';

                if (key.toLowerCase().includes('skill')) {
                  cardColor = 'from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30';
                  borderColor = 'border-green-200 dark:border-green-700';
                } else if (key.toLowerCase().includes('experience') || key.toLowerCase().includes('career')) {
                  cardColor = 'from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30';
                  borderColor = 'border-purple-200 dark:border-purple-700';
                } else if (key.toLowerCase().includes('personality') || key.toLowerCase().includes('culture')) {
                  cardColor = 'from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30';
                  borderColor = 'border-indigo-200 dark:border-indigo-700';
                }

                return (
                  <div
                    key={index}
                    className={`bg-linear-to-br ${cardColor} rounded-lg p-4 border ${borderColor}`}
                  >
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {formattedKey}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-2">
                          {value.map((item: any, i: number) => (
                            <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-xs">
                              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                            </span>
                          ))}
                        </div>
                      ) : typeof value === 'object' && value !== null ? (
                        <pre className="whitespace-pre-wrap font-mono text-xs bg-white dark:bg-slate-800 p-2 rounded">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <p className="whitespace-pre-wrap">{String(value)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )
      }
    </div >
  );
}

// Helper function to render transcription in different formats
function renderTranscription(interviewTranscription: any): React.ReactNode {
  if (!interviewTranscription) {
    return (
      <p className="text-sm text-slate-500 italic">
        Transcription not available for this interview.
      </p>
    );
  }

  // Format 1: Session format with questions and responses arrays
  if (interviewTranscription.questions && interviewTranscription.responses) {
    const elements: React.ReactNode[] = [];
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
  }

  // Format 2: Simple array format
  if (Array.isArray(interviewTranscription)) {
    return interviewTranscription.map((item: any, index: number) => (
      <div
        key={index}
        className={`border-l-2 pl-3 py-1 ${item.role === 'assistant' ? 'border-blue-200' : 'border-green-200'
          }`}
      >
        <div className="flex items-start gap-2">
          <span
            className={`text-xs font-medium min-w-[80px] ${item.role === 'assistant'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-green-600 dark:text-green-400'
              }`}
          >
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
  }

  // Format 3: Plain string format
  if (typeof interviewTranscription === 'string') {
    return (
      <div className="border-l-2 border-slate-200 pl-3 py-2">
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {interviewTranscription}
        </p>
      </div>
    );
  }

  return null;
}

// Interview Video and Transcription Component
interface InterviewVideoAndTranscriptionProps {
  videoUrl: string;
  transcription: any;
}

function InterviewVideoAndTranscription({
  videoUrl,
  transcription,
}: InterviewVideoAndTranscriptionProps) {
  return (
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
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Video Recording
              </h4>
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <HLSVideoPlayer
                  src={videoUrl}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Transcription */}
            <div className="flex flex-col">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Interview Transcription
              </h4>
              <div className="aspect-video bg-slate-50 dark:bg-slate-800 rounded-lg p-4 overflow-y-auto">
                <div className="space-y-3">{renderTranscription(transcription)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Separator />
    </>
  );
}

// Modal Component for Skills Matched
function SkillsMatchedModal({
  isOpen,
  onClose,
  title,
  data,
  icon: Icon,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  icon: React.ElementType;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[70vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-4">
            {data.map((item: any, index: number) => (
              <Card key={index} className="border border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 space-y-3">
                  {item.skill && (
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Skill:
                      </div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                        {item.skill}
                      </div>
                    </div>
                  )}
                  {item.evidence && (
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Evidence:
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {item.evidence.interview ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-medium">Interview:</span> Yes
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-red-600" />
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-medium">Interview:</span> No
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.evidence.cv ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-medium">CV:</span> Yes
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-red-600" />
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-medium">CV:</span> No
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.evidence.jobDescription ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-medium">Job Description:</span> Yes
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-red-600" />
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-medium">Job Description:</span> No
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal Component for Array Data
function ArrayDataModal({
  isOpen,
  onClose,
  title,
  data,
  icon: Icon,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  icon: React.ElementType;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[70vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-4">
            {data.map((item: any, index: number) => (
              <Card key={index} className="border border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 space-y-3">
                  {item.point && (
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Point:
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {item.point}
                      </div>
                    </div>
                  )}
                  {item.evidence && (
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Evidence:
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {item.evidence}
                      </div>
                    </div>
                  )}
                  {item.source && (
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Source:
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        {item.source.interview && (
                          <div>
                            <span className="font-medium">Interview:</span> {item.source.interview}
                          </div>
                        )}
                        {item.source.cv && (
                          <div>
                            <span className="font-medium">CV:</span> {item.source.cv}
                          </div>
                        )}
                        {item.source.aiViewPoint && (
                          <div>
                            <span className="font-medium">AI View:</span> {item.source.aiViewPoint}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Render Pitch-style Profile (based on images) - React Component
function PitchProfile({ profile, applicant }: { profile: AnyObject; applicant: any }) {
  const cleaned = deepClean(profile);

  // State for modals
  const [openModal, setOpenModal] = useState<string | null>(null);

  // Extract scores
  const scores = cleaned?.scores || {};
  const overallScore = scores?.overallScore ?? null;
  const technicalScore = scores?.technicalSkillsScore ?? null;
  const experienceScore = scores?.experienceScore ?? null;
  const culturalScore = scores?.culturalFitScore ?? null;

  // Extract arrays - only if they exist and are not empty
  const strengths = (cleaned?.strength && Array.isArray(cleaned.strength) && cleaned.strength.length > 0) ? cleaned.strength : null;
  const gaps = (cleaned?.gap && Array.isArray(cleaned.gap) && cleaned.gap.length > 0) ? cleaned.gap : null;
  const concerns = (cleaned?.concern && Array.isArray(cleaned.concern) && cleaned.concern.length > 0) ? cleaned.concern : null;
  const watchouts = (cleaned?.watchout && Array.isArray(cleaned.watchout) && cleaned.watchout.length > 0) ? cleaned.watchout : null;
  const weaknesses = (cleaned?.weakness && Array.isArray(cleaned.weakness) && cleaned.weakness.length > 0) ? cleaned.weakness : null;
  const redFlags = (cleaned?.redFlag && Array.isArray(cleaned.redFlag) && cleaned.redFlag.length > 0) ? cleaned.redFlag : null;
  const resumeContradictions = (cleaned?.resumeContradiction && Array.isArray(cleaned.resumeContradiction) && cleaned.resumeContradiction.length > 0) ? cleaned.resumeContradiction : null;
  const answers = (cleaned?.answers && Array.isArray(cleaned.answers) && cleaned.answers.length > 0) ? cleaned.answers : null;

  // Extract other fields
  const recommendedNextSteps = cleaned?.recommendedNextSteps || null;
  const questionToAskInNextInterview = cleaned?.questionToAskInNextInterview || null;
  const candidateSalary = cleaned?.candidateSalary || null;
  const relocationVisa = cleaned?.relocationVisa || null;
  const skillsMatched = (cleaned?.skillsMatched && Array.isArray(cleaned.skillsMatched) && cleaned.skillsMatched.length > 0) ? cleaned.skillsMatched : null;
  const aiOpinion = cleaned?.aiOpinion || null;
  const experienceAnalysis = cleaned?.experienceAnalysis || null;
  const highlightsOfBackground = cleaned?.highlightsOfBackground || null;
  const reasonSearchingForJob = cleaned?.reasonSearchingForJob || null;
  const highlightsOfTransitions = cleaned?.highlightsOfTransitions || null;

  // Helper to check if value should be displayed
  const shouldDisplay = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  };

  // Grid items configuration
  const gridItems = [
    { key: 'strengths', label: 'Strengths', data: strengths, icon: Star, colorClass: 'text-green-600' },
    { key: 'gaps', label: 'Gaps', data: gaps, icon: TrendingDown, colorClass: 'text-orange-600' },
    { key: 'concerns', label: 'Concerns', data: concerns, icon: AlertTriangle, colorClass: 'text-yellow-600' },
    { key: 'watchouts', label: 'Watchouts', data: watchouts, icon: Info, colorClass: 'text-blue-600' },
    { key: 'weaknesses', label: 'Weaknesses', data: weaknesses, icon: XCircle, colorClass: 'text-red-600' },
    { key: 'redFlags', label: 'Red Flags', data: redFlags, icon: AlertTriangle, colorClass: 'text-red-600' },
    { key: 'resumeContradictions', label: 'Resume Contradictions', data: resumeContradictions, icon: FileText, colorClass: 'text-orange-600' },
    { key: 'answers', label: 'Answers', data: answers, icon: MessageSquare, colorClass: 'text-blue-600' },
    { key: 'skillsMatched', label: 'Skills Matched', data: skillsMatched, icon: Code, colorClass: 'text-purple-600' },
  ].filter(item => shouldDisplay(item.data));

  return (
    <div className="space-y-6">
      {/* Scores Section - First Section */}
      {(overallScore !== null || technicalScore !== null || experienceScore !== null || culturalScore !== null) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Overall Score - Large Display */}
              {overallScore !== null && (
                <div className="text-center">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Overall Score
                  </div>
                  <div className={`text-6xl font-extrabold ${getScoreColor(overallScore)}`}>
                    {overallScore}%
                  </div>
                </div>
              )}

              {/* Three Scores in One Row */}
              {(technicalScore !== null || experienceScore !== null || culturalScore !== null) && (
                <div className="grid grid-cols-3 gap-4">
                  {technicalScore !== null && (
                    <div className="text-center p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Technical Skills Score
                      </div>
                      <div className={`text-3xl font-bold ${getScoreColor(technicalScore)}`}>
                        {technicalScore}%
                      </div>
                    </div>
                  )}
                  {experienceScore !== null && (
                    <div className="text-center p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Experience Score
                      </div>
                      <div className={`text-3xl font-bold ${getScoreColor(experienceScore)}`}>
                        {experienceScore}%
                      </div>
                    </div>
                  )}
                  {culturalScore !== null && (
                    <div className="text-center p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Cultural Fit Score
                      </div>
                      <div className={`text-3xl font-bold ${getScoreColor(culturalScore)}`}>
                        {culturalScore}%
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid System - Two Columns per Row */}
      {gridItems.length > 0 && (
        <div className="space-y-4">
          {Array.from({ length: Math.ceil(gridItems.length / 2) }).map((_, rowIndex) => {
            const startIndex = rowIndex * 2;
            const rowItems = gridItems.slice(startIndex, startIndex + 2);

            return (
              <div key={rowIndex} className="grid grid-cols-2 gap-4">
                {rowItems.map((item) => {
                  const Icon = item.icon;
                  const count = Array.isArray(item.data) ? item.data.length : 0;

                  return (
                    <Card
                      key={item.key}
                      className="border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setOpenModal(item.key)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-5 h-5 ${item.colorClass}`} />
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                              {item.label}
                            </h3>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals for Grid Items */}
      {gridItems.map((item) => {
        const Icon = item.icon;
        if (item.key === 'skillsMatched') {
          return (
            <SkillsMatchedModal
              key={item.key}
              isOpen={openModal === item.key}
              onClose={() => setOpenModal(null)}
              title={item.label}
              data={Array.isArray(item.data) ? item.data : []}
              icon={Icon}
            />
          );
        }
        return (
          <ArrayDataModal
            key={item.key}
            isOpen={openModal === item.key}
            onClose={() => setOpenModal(null)}
            title={item.label}
            data={Array.isArray(item.data) ? item.data : []}
            icon={Icon}
          />
        );
      })}

      {/* Recommended Next Steps - FAQ Expandable */}
      {shouldDisplay(recommendedNextSteps) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardContent className="p-0">
            <Accordion type="single" collapsible>
              <AccordionItem value="recommended-next-steps" className="border-none">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Recommended Next Steps
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {recommendedNextSteps}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Question to Ask in Next Interview - FAQ Expandable */}
      {shouldDisplay(questionToAskInNextInterview) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardContent className="p-0">
            <Accordion type="single" collapsible>
              <AccordionItem value="question-next-interview" className="border-none">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Question to Ask in Next Interview
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {questionToAskInNextInterview}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Candidate Salary Object */}
      {shouldDisplay(candidateSalary) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Candidate Salary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidateSalary.expectedRange && (
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Expected Range:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {candidateSalary.expectedRange}
                </span>
              </div>
            )}
            {candidateSalary.evidence && (
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Evidence:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                  {candidateSalary.evidence}
                </span>
              </div>
            )}
            {candidateSalary.source && (
              <div className="space-y-2">
                {candidateSalary.source.interview && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Interview:
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                      {candidateSalary.source.interview}
                    </span>
                  </div>
                )}
                {candidateSalary.source.cv && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      CV:
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                      {candidateSalary.source.cv}
                    </span>
                  </div>
                )}
                {candidateSalary.source.aiViewPoint && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      AI View:
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                      {candidateSalary.source.aiViewPoint}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Relocation Visa Object */}
      {shouldDisplay(relocationVisa) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Relocation & Visa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {relocationVisa.currentLocation && (
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Current Location:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {relocationVisa.currentLocation}
                </span>
              </div>
            )}
            {relocationVisa.jobLocation && (
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Job Location:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {relocationVisa.jobLocation}
                </span>
              </div>
            )}
            {relocationVisa.hasVisa !== null && (
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Has Visa:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {relocationVisa.hasVisa ? 'Yes' : 'No'}
                </span>
              </div>
            )}
            {relocationVisa.visaStatus && (
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Visa Status:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                  {relocationVisa.visaStatus}
                </span>
              </div>
            )}
            {relocationVisa.willingToRelocate !== null && (
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Willing to Relocate:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {relocationVisa.willingToRelocate ? 'Yes' : 'No'}
                </span>
              </div>
            )}
            {relocationVisa.relocationTimeline && (
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Relocation Timeline:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                  {relocationVisa.relocationTimeline}
                </span>
              </div>
            )}
            {relocationVisa.evidence && (
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Evidence:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                  {relocationVisa.evidence}
                </span>
              </div>
            )}
            {relocationVisa.source && (
              <div className="space-y-0">
                {relocationVisa.source.interview && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Interview:
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                      {relocationVisa.source.interview}
                    </span>
                  </div>
                )}
                {relocationVisa.source.cv && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      CV:
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                      {relocationVisa.source.cv}
                    </span>
                  </div>
                )}
                {relocationVisa.source.aiViewPoint && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      AI View:
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 text-right ml-4">
                      {relocationVisa.source.aiViewPoint}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Opinion */}
      {shouldDisplay(aiOpinion) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI Opinion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {aiOpinion}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Experience Analysis */}
      {shouldDisplay(experienceAnalysis) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Experience Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {experienceAnalysis}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Highlights of Background */}
      {shouldDisplay(highlightsOfBackground) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Highlights of Background
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {highlightsOfBackground}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reason Searching for Job */}
      {shouldDisplay(reasonSearchingForJob) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Reason Searching for Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {reasonSearchingForJob}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Highlights of Transitions */}
      {shouldDisplay(highlightsOfTransitions) && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-teal-600" />
              Highlights of Transitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {highlightsOfTransitions}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
      const data = await response.json();
      return data;
    },
  });

  // Fetch generated profile from airtable_job_applications table
  const { data: generatedProfileData } = useQuery<any>({
    queryKey: ["/api/applicants/generated-profile", applicantId],
    queryFn: async () => {
      const response = await fetch(`/api/applicants/${applicantId}/generated-profile`);
      if (!response.ok) {
        // If not found, return null instead of throwing error
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch generated profile");
      }
      const data = await response.json();
      return data;
    },
    enabled: !!applicantId, // Only fetch if applicantId exists
    retry: false, // Don't retry on 404
  });

  // Extract transcription data from the applicant
  const interviewTranscription = applicant?.interviewTranscription;

  // Use generatedProfile from the new endpoint if available, otherwise fallback to applicant.generatedProfile
  const rawGeneratedProfile = generatedProfileData?.generatedProfile || applicant?.generatedProfile;

  // Check if interview is incomplete (lackOfAnswers)
  const isIncompleteInterview = rawGeneratedProfile?.lackOfAnswers === true;

  // Shortlist mutation
  const shortlistMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      await apiRequest("POST", `/api/applicants/${applicantId}/shortlist`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Applicant shortlisted successfully!"
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to shortlist applicant",
        variant: "destructive",
      });
    },
  });

  // Deny mutation
  const denyMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      await apiRequest("POST", `/api/applicants/${applicantId}/deny`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Applicant denied successfully"
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deny applicant",
        variant: "destructive",
      });
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
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hiring/applicants")}
            className="mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {applicant?.applicantName || applicant?.name || "Applicant Details"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {applicant?.jobTitle || "Job Application"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => applicantId && shortlistMutation.mutate(applicantId)}
            disabled={shortlistMutation.isPending || applicant?.status === "shortlisted"}
            className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
          >
            <Star className="w-4 h-4 mr-2" />
            {shortlistMutation.isPending ? "Shortlisting..." : "Shortlist"}
          </Button>
          <Button
            variant="outline"
            onClick={() => applicantId && denyMutation.mutate(applicantId)}
            disabled={denyMutation.isPending || applicant?.status === "denied"}
            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <XCircle className="w-4 h-4 mr-2" />
            {denyMutation.isPending ? "Denying..." : "Deny"}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-6 pr-4">
          {/* Case 1: Incomplete Interview */}
          {isIncompleteInterview && (
            <Card className="bg-white dark:bg-slate-900 border-2 border-orange-200 dark:border-orange-700">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  Interview Incomplete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                    <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">
                      AI Thoughts About Candidate:
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {rawGeneratedProfile?.aiThoughtsAboutCandidate || 'The candidate did not complete the interview. Insufficient data for assessment.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Case 2: Complete Interview - Pitch Profile */}
          {!isIncompleteInterview && rawGeneratedProfile && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <PitchProfile profile={rawGeneratedProfile} applicant={applicant} />
              </CardContent>
            </Card>
          )}

          {/* Interview Video and Transcription Section */}
          {!isIncompleteInterview && applicant.interviewVideoUrl && (
            <InterviewVideoAndTranscription
              videoUrl={applicant.interviewVideoUrl}
              transcription={interviewTranscription}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}