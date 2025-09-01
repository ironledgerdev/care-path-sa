import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Wrench, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
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
  const { toast } = useToast();
  const navigate = useNavigate();

  const fixAdminAccount = async (): Promise<FixResult> => {
    try {
      console.log('🔧 Attempting to fix admin account:', userId);

      // Use the Edge Function to fix the admin account (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('fix-admin-account', {
        body: {
          userId,
          email,
          firstName,
          lastName
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        return {
          success: false,
          message: `Fix operation failed: ${error.message}`,
          error
        };
      }

      if (!data?.success) {
        return {
          success: false,
          message: data?.error || 'Fix operation failed for unknown reason',
          error: data
        };
      }

      return {
        success: true,
        message: data.message || 'Admin account fixed successfully!',
        profile: data.profile
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
                This tool uses a secure server-side function to create or update your admin profile,
                bypassing security policies that may prevent direct database access.
              </p>
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
