import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Send, Loader2, ArrowLeft, Eye, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface GenerateOfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  jobId: string;
}

type Step = 'input' | 'edit' | 'preview' | 'sending' | 'success';

export function GenerateOfferLetterModal({
  isOpen,
  onClose,
  applicantId,
  applicantName,
  applicantEmail,
  jobTitle,
  jobId
}: GenerateOfferLetterModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [customMessage, setCustomMessage] = useState('');
  const [generatedOffer, setGeneratedOffer] = useState('');
  const [editedOffer, setEditedOffer] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset modal state when it closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('input');
        setCustomMessage('');
        setGeneratedOffer('');
        setEditedOffer('');
      }, 300);
    }
  }, [isOpen]);

  // Debug log when step changes to edit
  useEffect(() => {
    if (step === 'edit') {
      console.log('📝 Edit step activated. Current state:', {
        generatedOfferLength: generatedOffer.length,
        editedOfferLength: editedOffer.length,
        generatedOfferPreview: generatedOffer.substring(0, 100),
        editedOfferPreview: editedOffer.substring(0, 100)
      });
    }
  }, [step, generatedOffer, editedOffer]);

  // Generate offer letter mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      console.log('📝 Generating offer letter for applicant:', applicantId);
      console.log('Custom message:', customMessage ? `${customMessage.substring(0, 50)}...` : 'None');

      const response = await apiRequest('POST', `/api/applicants/${applicantId}/generate-offer-letter`, {
        customMessage: customMessage.trim() || undefined
      });

      const data = await response.json();

      console.log('✅ Offer letter response received:', {
        hasOfferText: !!data.offerText,
        offerTextLength: data.offerText?.length || 0,
        offerTextPreview: data.offerText?.substring(0, 100) + '...'
      });

      return data;
    },
    onSuccess: (data) => {
      console.log('🎯 Processing successful response:', data);

      if (!data.offerText) {
        console.error('❌ No offerText in response:', data);
        toast({
          title: "Error",
          description: "No offer text was generated. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const offerText = data.offerText.trim();
      console.log('Setting offer text:', {
        length: offerText.length,
        preview: offerText.substring(0, 100)
      });

      setGeneratedOffer(offerText);
      setEditedOffer(offerText);
      setStep('edit');

      toast({
        title: "Offer Letter Generated",
        description: "Review and edit the offer letter before sending.",
      });

      console.log('✅ State updated, moving to edit step');
    },
    onError: (error: any) => {
      console.error('❌ Error generating offer letter:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate offer letter",
        variant: "destructive",
      });
    },
  });

  // Send offer letter mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/applicants/${applicantId}/send-offer-letter`, {
        offerContent: editedOffer,
      });
      return response.json();
    },
    onSuccess: () => {
      setStep('success');
      toast({
        title: "Success!",
        description: `Offer letter sent to ${applicantEmail}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shortlisted-applicants'] });

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    onError: (error: any) => {
      setStep('edit');
      toast({
        title: "Error",
        description: error.message || "Failed to send offer letter",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleSend = () => {
    if (!editedOffer.trim()) {
      toast({
        title: "Error",
        description: "Offer letter cannot be empty",
        variant: "destructive",
      });
      return;
    }
    setStep('sending');
    sendMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="w-5 h-5 text-primary dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Generate Offer Letter
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {applicantName} • {jobTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={step === 'sending'}
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { id: 'input', label: 'Customize', icon: FileText },
                { id: 'edit', label: 'Edit', icon: FileText },
                { id: 'preview', label: 'Preview', icon: Eye },
                { id: 'sending', label: 'Send', icon: Send },
              ].map((s, idx) => {
                const isActive = step === s.id;
                const isComplete = ['input', 'edit', 'preview', 'sending'].indexOf(step) > idx;
                const Icon = s.icon;

                return (
                  <div key={s.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-primary text-white shadow-lg'
                            : isComplete
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {isComplete && step !== s.id ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={`text-xs mt-1 ${
                          isActive
                            ? 'text-primary dark:text-blue-400 font-semibold'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div
                        className={`h-0.5 w-16 mx-2 transition-colors ${
                          isComplete ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 240px)' }}>
            {/* Step 1: Input Custom Message */}
            {step === 'input' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personalized message to the candidate... (e.g., 'We were particularly impressed with your experience in...')"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
                    rows={6}
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    This message will be included in the offer letter after the opening greeting.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>What happens next:</strong> We'll generate a professional offer letter including job
                    details, compensation, benefits, and next steps. You'll be able to review and edit it before
                    sending.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Edit Generated Offer */}
            {step === 'edit' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Edit Offer Letter
                  </label>
                  <textarea
                    value={editedOffer}
                    onChange={(e) => {
                      console.log('Textarea value changed:', e.target.value.length, 'characters');
                      setEditedOffer(e.target.value);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm resize-none"
                    rows={20}
                    style={{ whiteSpace: 'pre-wrap' }}
                    placeholder="Offer letter text will appear here..."
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Edit the offer letter text as needed. The final version will be formatted professionally when sent
                    via email.
                  </p>
                  {editedOffer.length === 0 && (
                    <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        ⚠️ No offer text loaded. This might indicate an issue with the generation process.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Final Preview
                  </label>
                  <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-6 shadow-sm">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                      {editedOffer}
                    </pre>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Ready to send?</strong> This offer letter will be sent to{' '}
                    <strong className="text-blue-900 dark:text-blue-200">{applicantEmail}</strong> and formatted as a professional HTML email.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Sending */}
            {step === 'sending' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="w-16 h-16 text-primary dark:text-blue-400 animate-spin mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Sending Offer Letter...
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please wait while we send the offer to {applicantEmail}
                </p>
              </motion.div>
            )}

            {/* Step 5: Success */}
            {step === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Offer Letter Sent!</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  The offer letter has been successfully sent to {applicantEmail}
                </p>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          {step !== 'sending' && step !== 'success' && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => {
                  if (step === 'edit') setStep('input');
                  else if (step === 'preview') setStep('edit');
                  else onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={generateMutation.isPending}
              >
                <ArrowLeft className="w-4 h-4" />
                {step === 'input' ? 'Cancel' : 'Back'}
              </button>

              <div className="flex items-center gap-3">
                {step === 'input' && (
                  <button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Generate Offer Letter
                      </>
                    )}
                  </button>
                )}

                {step === 'edit' && (
                  <button
                    onClick={() => setStep('preview')}
                    className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                )}

                {step === 'preview' && (
                  <button
                    onClick={handleSend}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    <Send className="w-4 h-4" />
                    Send Offer Letter
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
