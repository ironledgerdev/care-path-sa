import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Wrench, CheckCircle2, AlertTriangle, Loader2, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface FixResult {
  success: boolean;
  message: string;
  profile?: any;
  error?: any;
}

const FixAdminAccount = () => {
  const [userId, setUserId] = useState(''); // User should enter their actual User ID
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const testDatabaseAccess = async () => {
    setDebugInfo('Testing database access...');
    try {
      // Test 1: Can we read from profiles table?
      const { data: profilesTest, error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (profilesError) {
        setDebugInfo(`❌ Cannot read profiles table: ${profilesError.message}`);
        return;
      }

      // Test 2: Can we read our specific user?
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found
        setDebugInfo(`❌ Cannot query user profile: ${userError.message}`);
        return;
      }

      if (userProfile) {
        setDebugInfo(`✅ User profile found: ${JSON.stringify(userProfile, null, 2)}`);
      } else {
        setDebugInfo(`ℹ️ User profile not found - this means we need to create it`);
      }

    } catch (error: any) {
      setDebugInfo(`❌ Unexpected error: ${error.message}`);
    }
  };

  const fixAdminAccountDirect = async (): Promise<FixResult> => {
    try {
      console.log('🔧 Attempting direct admin account fix:', userId);
      console.log('📧 Email:', email);
      console.log('👤 Name:', firstName, lastName);

      // First, let's test if we can access the profiles table at all
      console.log('🔍 Testing profiles table access...');
      const { data: accessTest, error: accessError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (accessError) {
        console.error('❌ Cannot access profiles table:', accessError);
        return {
          success: false,
          message: `Cannot access profiles table: ${accessError.message || JSON.stringify(accessError)}. This suggests RLS (Row Level Security) is blocking access. Please use the manual SQL method.`,
          error: {
            type: 'rls_blocked',
            details: accessError,
            suggestion: 'Use manual database method - go to /manual-admin-setup'
          }
        };
      }

      console.log('✅ Profiles table access confirmed');

      // Check if the user exists in auth.users (this tells us if the User ID is valid)
      console.log('🔍 Checking if User ID exists...');

      // Try to update the existing profile using upsert (which may work better with RLS)
      console.log('📝 Attempting upsert operation...');
      const { data: profile, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          email_verified: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (upsertError) {
        console.error('❌ Direct upsert failed:', upsertError);
        const errorMessage = upsertError.message || upsertError.error_description || JSON.stringify(upsertError);
        const errorCode = upsertError.code || upsertError.error || 'unknown';

        // Categorize common error types
        let userFriendlyMessage = '';
        let suggestion = '';

        if (errorCode === 'PGRST301' || errorMessage.includes('violates row-level security')) {
          userFriendlyMessage = 'Row Level Security is blocking this operation. You need to use the manual SQL method.';
          suggestion = 'Go to /manual-admin-setup and run the SQL commands directly in your Supabase Dashboard.';
        } else if (errorCode === '23503' || errorMessage.includes('foreign key')) {
          userFriendlyMessage = 'The User ID does not exist in the authentication system. Please verify the User ID is correct.';
          suggestion = 'Double-check the User ID from your original error message, or create a new admin account instead.';
        } else if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
          userFriendlyMessage = 'A profile with this ID already exists but couldn\'t be updated due to permissions.';
          suggestion = 'Try the manual SQL method to update the existing profile.';
        } else if (errorMessage.includes('permission denied') || errorMessage.includes('access denied')) {
          userFriendlyMessage = 'Permission denied. Your current user doesn\'t have rights to modify profiles.';
          suggestion = 'Use the manual SQL method with database admin access.';
        } else {
          userFriendlyMessage = `Upsert operation failed: ${errorMessage}`;
          suggestion = 'Try the manual database method for guaranteed success.';
        }

        return {
          success: false,
          message: `${userFriendlyMessage} Error code: ${errorCode}`,
          error: {
            message: errorMessage,
            code: errorCode,
            type: 'upsert_failed',
            details: upsertError,
            suggestion: suggestion,
            userFriendlyMessage: userFriendlyMessage
          }
        };
      }

      if (profile && profile.role === 'admin') {
        return {
          success: true,
          message: 'Admin account fixed successfully using direct method!',
          profile
        };
      }

      return {
        success: false,
        message: 'Profile updated but admin role was not set correctly',
        profile
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Direct fix failed: ${error.message}`,
        error
      };
    }
  };

  const fixAdminAccount = async (): Promise<FixResult> => {
    try {
      console.log('🔧 Attempting to fix admin account:', userId);

      // First try the Edge Function approach
      try {
        const { data, error } = await supabase.functions.invoke('fix-admin-account', {
          body: {
            userId,
            email,
            firstName,
            lastName
          }
        });

        if (!error && data?.success) {
          return {
            success: true,
            message: data.message || 'Admin account fixed successfully!',
            profile: data.profile
          };
        }

        console.log('Edge Function failed, trying direct method...', error);
      } catch (edgeFunctionError) {
        console.log('Edge Function not available, trying direct method...', edgeFunctionError);
      }

      // Fallback to direct method
      const directResult = await fixAdminAccountDirect();

      if (directResult.success) {
        return {
          ...directResult,
          message: directResult.message + ' (Used fallback method)'
        };
      }

      // If both methods fail, provide helpful instructions
      return {
        success: false,
        message: 'Unable to fix admin account automatically. Please try these steps:\n\n1. Make sure you used the exact User ID from your error message\n2. Use the same email address you registered with\n3. Contact support if the issue persists\n\nTechnical details: Both Edge Function and direct database methods failed.',
        error: directResult.error
      };

    } catch (error: any) {
      console.error('Unexpected error:', error);
      return {
        success: false,
        message: `Unexpected error: ${error.message}`,
        error
      };
    }
  };

  const handleFix = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Please enter the User ID",
        variant: "destructive",
      });
      return;
    }

    if (!firstName || !lastName || !email) {
      toast({
        title: "Error",
        description: "Please fill in your first name, last name, and email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const fixResult = await fixAdminAccount();
      setResult(fixResult);

      if (fixResult.success) {
        toast({
          title: "Success",
          description: fixResult.message,
        });
      } else {
        toast({
          title: "Error",
          description: fixResult.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fix admin account: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="medical-hero-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-medical-gradient">
              Fix Admin Account
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Repair admin accounts that failed verification
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Account Recovery</h4>
              </div>
              <p className="text-sm text-blue-700">
                This tool tries multiple methods to fix your admin account:
              </p>
              <ul className="text-xs text-blue-600 mt-2 space-y-1 ml-4 list-disc">
                <li>Secure server-side function (if available)</li>
                <li>Direct database operations with fallback methods</li>
                <li>Manual SQL commands (if automated methods fail)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID *</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g., 3a7e63fa-b246-4f21-a44d-a3ca020e2198"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Copy this from the "User ID: ..." shown in your error message
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Your last name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email address you used for the admin account
                </p>
              </div>
            </div>

            <Button 
              onClick={handleFix}
              className="w-full btn-medical-primary"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing Admin Account...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Fix Admin Account
                </>
              )}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg border-l-4 ${
                result.success 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.success ? 'Success' : 'Error'}
                  </span>
                </div>
                <p className={`text-sm ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.message}
                </p>
                {!result.success && result.error?.suggestion && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-semibold text-blue-800 mb-1">💡 Suggested Solution:</p>
                    <p className="text-sm text-blue-700">{result.error.suggestion}</p>
                  </div>
                )}
                {result.profile && (
                  <div className="mt-3 p-2 bg-white rounded border text-xs">
                    <strong>Profile Details:</strong>
                    <pre className="mt-1 text-gray-600">
                      {JSON.stringify({
                        id: result.profile.id,
                        email: result.profile.email,
                        role: result.profile.role,
                        name: `${result.profile.firstName || result.profile.first_name} ${result.profile.lastName || result.profile.last_name}`
                      }, null, 2)}
                    </pre>
                  </div>
                )}
                {!result.success && result.error && (
                  <details className="mt-3">
                    <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                      Show technical details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(result.error, null, 2)}
                    </pre>
                  </details>
                )}
                {!result.success && (
                  <div className="mt-3 space-y-2">
                    <Button
                      onClick={() => navigate('/manual-admin-setup')}
                      size="sm"
                      variant="outline"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <Database className="mr-2 h-4 w-4" />
                      Try Manual Database Method
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Use direct SQL commands to fix your admin account
                    </p>
                  </div>
                )}
              </div>
            )}

            {result?.success && (
              <div className="grid md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => navigate('/admin')}
                  className="btn-medical-primary"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Go to Admin Dashboard
                </Button>
                <Button 
                  onClick={() => window.dispatchEvent(new Event('openAuthModal'))}
                  variant="outline"
                >
                  Login Now
                </Button>
              </div>
            )}

            <div className="text-center pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin-setup')}
                className="text-sm text-muted-foreground"
              >
                Back to Admin Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FixAdminAccount;
