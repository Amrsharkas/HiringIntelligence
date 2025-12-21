import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function InviteAccept() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  // Extract token from URL on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setInviteToken(token);
      console.log('🔗 Magic link token extracted:', token);
    } else {
      setInviteStatus('error');
      setMessage('Invalid invitation link - no token found');
    }
  }, []);

  // Handle authentication and invitation processing
  useEffect(() => {
    if (!inviteToken) return;

    if (isLoading) {
      setInviteStatus('loading');
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login with return URL
      console.log('🔐 User not authenticated, redirecting to login...');
      const returnUrl = encodeURIComponent(`/invite/accept?token=${inviteToken}`);
      window.location.href = `/api/login?redirect=${returnUrl}`;
      return;
    }

    // User is authenticated, process the invitation
    processInvitation();
  }, [inviteToken, isAuthenticated, isLoading]);

  const processInvitation = async () => {
    if (!inviteToken) return;

    setInviteStatus('processing');
    setMessage('Processing your invitation...');

    try {
      console.log('🔄 Processing magic link invitation with token:', inviteToken);
      
      // Debug: Log the exact request being made
      console.log('📤 Making POST request to /api/invitations/accept with token:', inviteToken);
      
      const response = await apiRequest('POST', '/api/invitations/accept', {
        token: inviteToken
      });

      // Debug: Log the response
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('📋 Response data:', result);
      
      if (response.ok) {
        console.log('✅ Invitation processed successfully:', result);
        
        setInviteStatus('success');
        setMessage(result.message || 'Successfully joined the team!');
        setOrganizationName(result.organization?.companyName || 'the team');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          setLocation('/');
        }, 2000);
      } else {
        throw new Error(result.message || `Server returned ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Failed to process invitation:', error);
      setInviteStatus('error');
      
      // More detailed error handling
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage('Failed to process invitation');
      }
    }
  };

  // Loading state
  if (inviteStatus === 'loading') {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Loading Invitation</h2>
            <p className="text-gray-600">
              Please wait while we process your invitation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing state
  if (inviteStatus === 'processing') {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <UserPlus className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
            <h2 className="text-xl font-semibold mb-2">Joining Team</h2>
            <p className="text-gray-600 mb-4">
              {message}
            </p>
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (inviteStatus === 'success') {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-semibold mb-2 text-green-700">Welcome!</h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-700">
                <strong>Organization:</strong> {organizationName}
              </p>
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
              <span>Redirecting to dashboard</span>
              <ArrowRight className="w-4 h-4 ml-2 animate-pulse" />
            </div>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full bg-linear-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              Go to Dashboard Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2 text-red-700">Invitation Error</h2>
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => setLocation("/")}
              className="w-full"
              variant="outline"
            >
              Go to Dashboard
            </Button>
            {!isAuthenticated && (
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Sign In
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Please contact the team admin for a new invitation link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}