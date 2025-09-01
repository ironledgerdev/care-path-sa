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
  const [userId, setUserId] = useState('3a7e63fa-b246-4f21-a44d-a3ca020e2198'); // Pre-fill with the failed ID
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

      // Skip auth system check - focus on profile fix
      console.log('🔄 Proceeding directly to profile fix...');

      // Step 1: Check current profile
      const { data: existingProfile, error: getError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (getError && getError.code !== 'PGRST116') { // PGRST116 = no rows found
        return {
          success: false,
          message: `Database error when checking profile: ${getError.message}`,
          error: getError
        };
      }

      let profile;

      if (existingProfile) {
        console.log('📝 Profile exists, updating to admin role...');
        // Profile exists, update it
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'admin',
            first_name: firstName || existingProfile.first_name,
            last_name: lastName || existingProfile.last_name,
            email: email || existingProfile.email,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          return {
            success: false,
            message: `Failed to update profile: ${updateError.message}`,
            error: updateError
          };
        }

        profile = updatedProfile;
      } else {
        console.log('🆕 Profile does not exist, creating new one...');

        if (!email || !firstName || !lastName) {
          return {
            success: false,
            message: 'Profile does not exist. Please provide email, first name, and last name to create it.',
          };
        }

        // Profile doesn't exist, create it
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          return {
            success: false,
            message: `Failed to create profile: ${createError.message}`,
            error: createError
          };
        }

        profile = createdProfile;
      }

      // Step 3: Final verification
      if (profile.role !== 'admin') {
        return {
          success: false,
          message: 'Profile updated but admin role was not set correctly',
          profile
        };
      }

      return {
        success: true,
        message: 'Admin profile created/updated successfully! You can now login with your email and password to access admin features.',
        profile
      };

    } catch (error: any) {
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
                If your admin account was created but verification failed, this tool will create or update
                your profile with admin privileges. You'll need to provide your full details.
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
                  This was shown in the error message
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
                        name: `${result.profile.first_name} ${result.profile.last_name}`
                      }, null, 2)}
                    </pre>
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
