import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, BarChart3, TrendingUp, Users, Target, Eye, Clock, Award, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  const { toast } = useToast();

  const { data: matches = [], isLoading: matchesLoading } = useQuery<any[]>({
    queryKey: ["/api/companies/matches"],
    enabled: isOpen,
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

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["/api/job-postings"],
    enabled: isOpen,
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

  // Calculate analytics metrics
  const totalViews = jobs.reduce((sum, job) => sum + (job.views || 0), 0);
  const averageMatchScore = matches.length > 0 
    ? Math.round(matches.reduce((sum, match) => sum + (match.matchScore || 0), 0) / matches.length)
    : 0;
  const highQualityMatches = matches.filter(match => (match.matchScore || 0) >= 80).length;
  const thisMonthMatches = matches.filter(match => {
    const matchDate = new Date(match.createdAt);
    const now = new Date();
    return matchDate.getMonth() === now.getMonth() && matchDate.getFullYear() === now.getFullYear();
  }).length;

  const analyticsCards = [
    {
      title: "Total Job Views",
      value: totalViews,
      icon: Eye,
      color: "blue",
      change: "+12% from last month",
      trending: "up"
    },
    {
      title: "Average Match Score",
      value: `${averageMatchScore}%`,
      icon: Target,
      color: "green",
      change: "+5% from last month",
      trending: "up"
    },
    {
      title: "High-Quality Matches",
      value: highQualityMatches,
      icon: Award,
      color: "purple",
      change: "+18% from last month",
      trending: "up"
    },
    {
      title: "Monthly Matches",
      value: thisMonthMatches,
      icon: TrendingUp,
      color: "orange",
      change: "+25% from last month",
      trending: "up"
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                Analytics Dashboard
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

          <div className="p-6">
            {matchesLoading || jobsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading analytics...</span>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {analyticsCards.map((card, index) => (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`bg-gradient-to-br from-${card.color}-50 to-${card.color}-100/50 dark:from-${card.color}-900/20 dark:to-${card.color}-800/10 border border-${card.color}-200/50 dark:border-${card.color}-700/50 hover:shadow-lg transition-all duration-300`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <card.icon className={`w-8 h-8 text-${card.color}-600 dark:text-${card.color}-400`} />
                            <div className="text-right">
                              <div className={`text-2xl font-bold text-${card.color}-600 dark:text-${card.color}-400`}>
                                {card.value}
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{card.title}</p>
                            <p className={`text-xs flex items-center gap-1 ${
                              card.trending === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              <TrendingUp className="w-3 h-3" />
                              {card.change}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Job Performance */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        Job Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {jobs.slice(0, 5).map((job, index) => (
                          <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 dark:text-white">{job.title}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Posted {new Date(job.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="text-center">
                                <div className="font-bold text-blue-600 dark:text-blue-400">{job.views || 0}</div>
                                <div className="text-slate-500 dark:text-slate-400">Views</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-green-600 dark:text-green-400">
                                  {matches.filter(m => m.jobId === job.id).length}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400">Matches</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-purple-600 dark:text-purple-400">
                                  {matches.filter(m => m.jobId === job.id && m.matchScore >= 80).length}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400">Quality</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Match Quality Distribution */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                        Match Quality Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { range: "90-100%", count: matches.filter(m => m.matchScore >= 90).length, color: "green" },
                          { range: "80-89%", count: matches.filter(m => m.matchScore >= 80 && m.matchScore < 90).length, color: "blue" },
                          { range: "70-79%", count: matches.filter(m => m.matchScore >= 70 && m.matchScore < 80).length, color: "yellow" },
                          { range: "60-69%", count: matches.filter(m => m.matchScore >= 60 && m.matchScore < 70).length, color: "orange" },
                        ].map((bucket, index) => (
                          <div key={bucket.range} className={`text-center p-4 bg-${bucket.color}-50 dark:bg-${bucket.color}-900/20 rounded-lg border border-${bucket.color}-200/50 dark:border-${bucket.color}-700/50`}>
                            <div className={`text-2xl font-bold text-${bucket.color}-600 dark:text-${bucket.color}-400`}>
                              {bucket.count}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">{bucket.range}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Insights */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-blue-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Key Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">High-Quality Candidate Pool</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {Math.round((highQualityMatches / Math.max(matches.length, 1)) * 100)}% of your matches score 80+ points, indicating excellent candidate quality.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Growing Visibility</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Your job postings have received {totalViews} total views, showing strong market visibility.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Efficient Matching</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              AI matching is performing excellently with an average score of {averageMatchScore}%.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
