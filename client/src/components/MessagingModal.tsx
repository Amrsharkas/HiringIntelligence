import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Send, Search, MessageSquare, Users, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface MessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MessagingModal({ isOpen, onClose }: MessagingModalProps) {
  const { toast } = useToast();
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: matches = [], isLoading } = useQuery<any[]>({
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

  const filteredMatches = matches.filter(match =>
    match.candidate?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.candidate?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!message.trim() || !selectedCandidate) return;
    
    toast({
      title: "Message Sent",
      description: `Message sent to ${selectedCandidate.firstName} ${selectedCandidate.lastName}`,
    });
    setMessage("");
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        >
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Message Candidates
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

          <div className="flex h-[70vh]">
            {/* Candidates List */}
            <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredMatches.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-400 text-sm">No matched candidates found</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredMatches.map((match) => (
                      <motion.div
                        key={match.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedCandidate(match.candidate)}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedCandidate?.id === match.candidate?.id
                            ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                            : "bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-600/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                              {match.candidate?.firstName} {match.candidate?.lastName}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {match.candidate?.title}
                            </p>
                          </div>
                          <div className={`text-sm font-bold ${getMatchScoreColor(match.matchScore)}`}>
                            {match.matchScore}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          Applied for: {match.job?.title}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Messaging Area */}
            <div className="flex-1 flex flex-col">
              {selectedCandidate ? (
                <>
                  {/* Chat Header */}
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
                        {selectedCandidate.firstName?.charAt(0)}{selectedCandidate.lastName?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {selectedCandidate.firstName} {selectedCandidate.lastName}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{selectedCandidate.title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 p-6 bg-slate-25 dark:bg-slate-800/30">
                    <div className="text-center py-8">
                      <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Start the conversation</h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Send a message to {selectedCandidate.firstName} about potential opportunities.
                      </p>
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex gap-3">
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={`Send a message to ${selectedCandidate.firstName}...`}
                        rows={3}
                        className="flex-1 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg self-end"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Press Ctrl+Enter to send
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Select a candidate</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Choose a candidate from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
