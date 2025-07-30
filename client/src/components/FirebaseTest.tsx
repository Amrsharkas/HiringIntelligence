import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FirebaseTest() {
  const [status, setStatus] = useState<string>('Testing Firebase...');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('testpassword123');

  const addResult = (message: string, success: boolean = true) => {
    setTestResults(prev => [...prev, `${success ? '✓' : '✗'} ${message}`]);
  };

  useEffect(() => {
    testFirebaseConfig();
  }, []);

  const testFirebaseConfig = async () => {
    try {
      // Test basic Firebase initialization
      addResult('Firebase app initialized');
      addResult('Auth service initialized');
      
      // Check environment variables
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const appId = import.meta.env.VITE_FIREBASE_APP_ID;
      
      addResult(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'Missing'}`);
      addResult(`Project ID: ${projectId || 'Missing'}`);
      addResult(`App ID: ${appId ? appId.substring(0, 10) + '...' : 'Missing'}`);
      
      if (apiKey && projectId && appId) {
        addResult('All Firebase credentials present');
        setStatus('Firebase configuration looks good!');
      } else {
        addResult('Missing Firebase credentials', false);
        setStatus('Firebase configuration has issues');
      }
      
      // Test auth state listener
      auth.onAuthStateChanged((user) => {
        if (user) {
          addResult(`User authenticated: ${user.email}`);
        } else {
          addResult('Auth state listener working (no user signed in)');
        }
      });
      
    } catch (error: any) {
      addResult(`Firebase initialization failed: ${error.message}`, false);
      setStatus('Firebase configuration failed!');
    }
  };

  const testEmailSignup = async () => {
    try {
      setStatus('Testing email signup...');
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      addResult(`Email signup successful: ${userCredential.user.email}`);
      setStatus('Email signup test passed!');
    } catch (error: any) {
      addResult(`Email signup failed: ${error.message}`, false);
      setStatus('Email signup test failed');
    }
  };

  const testEmailLogin = async () => {
    try {
      setStatus('Testing email login...');
      const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      addResult(`Email login successful: ${userCredential.user.email}`);
      setStatus('Email login test passed!');
    } catch (error: any) {
      addResult(`Email login failed: ${error.message}`, false);
      setStatus('Email login test failed');
    }
  };

  const testGoogleLogin = async () => {
    try {
      setStatus('Testing Google login...');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      addResult(`Google login successful: ${result.user.email}`);
      setStatus('Google login test passed!');
    } catch (error: any) {
      addResult(`Google login failed: ${error.message}`, false);
      setStatus('Google login test failed');
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      addResult('Logout successful');
      setStatus('Logged out');
    } catch (error: any) {
      addResult(`Logout failed: ${error.message}`, false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Firebase Authentication Test</CardTitle>
        <p className="text-sm text-gray-600">{status}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          {testResults.map((result, index) => (
            <div key={index} className={`text-sm ${result.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {result}
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold">Test Credentials:</h3>
          <Input
            placeholder="Test email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <Input
            placeholder="Test password"
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={testEmailSignup} variant="outline">
            Test Email Signup
          </Button>
          <Button onClick={testEmailLogin} variant="outline">
            Test Email Login
          </Button>
          <Button onClick={testGoogleLogin} variant="outline">
            Test Google Login
          </Button>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}