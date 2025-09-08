import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, UserPlus, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface AdminCreationResult {
  success: boolean;
  message: string;
  userId?: string;
  error?: any;
}

const CreateAdminAccount = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    secretKey: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AdminCreationResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Security key - in production, this should be an environment variable
  const ADMIN_CREATION_SECRET = 'MEDMAP_CREATE_ADMIN_2024_SECURE';

  const safeStringify = (value: any) => {
    try {
      const seen = new WeakSet();
      return JSON.stringify(value, (k, v) => {
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack };
        return v;
      }, 2);
    } catch (e) {
      try { return String(value); } catch { return '[Unstringifiable]'; }
    }
  };

  const normalizeError = (err: any) => {
    if (!err) return { message: 'Unknown error', code: 'unknown', raw: err };
    const code = err.code || err.status || err.error || 'unknown';
    let message = err.message ?? err.error_description ?? err.msg ?? err.details ?? (typeof err === 'string' ? err : undefined);
    if (!message && err.name) message = err.name;
    if (typeof message === 'object') message = safeStringify(message);
    if (!message) message = String(err);
    return { message, code, raw: err };
  };

  const callEdgeFix = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fix-admin-account', {
        body: {
          userId,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName
        }
      });
      console.log('Edge function response', { data, error });
      return { data, error };
    } catch (err) {
      console.error('Edge function invocation failed', err);
      return { error: err, data: null };
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.secretKey) {
      return 'All fields are required';
    }
    
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    if (formData.secretKey !== ADMIN_CREATION_SECRET) {
      return 'Invalid admin creation secret key';
    }
    
    if (!formData.email.includes('@')) {
      return 'Please enter a valid email address';
    }
    
    return null;
  };

  const createAdminAccount = async (): Promise<AdminCreationResult> => {
    try {
      // Step 1: Check if admin already exists with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', formData.email)
        .single();

      if (existingProfile) {
        if (existingProfile.role === 'admin') {
          return {
            success: false,
            message: 'An admin account with this email already exists'
          };
        } else {
          return {
            success: false,
            message: 'An account with this email already exists with a different role'
          };
        }
      }

      // Step 2: Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'admin',
          }
        }
      });

      if (authError) {
        return {
          success: false,
          message: `Account creation failed: ${authError.message}`,
          error: authError
        };
      }

      if (!authData.user) {
        return {
          success: false,
          message: 'Account creation failed: No user data returned'
        };
      }

      // Step 3: Wait for profile creation trigger and try multiple times
      let adminProfile = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts && !adminProfile) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Increasing wait time

        // Try to get existing profile
        const { data: existingProfile, error: getError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (getError) {
          console.warn('Get profile error on attempt', attempts, normalizeError(getError));
        }

        if (existingProfile) {
          // Profile exists, try to update it to admin role
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: 'admin',
              first_name: formData.firstName,
              last_name: formData.lastName,
              updated_at: new Date().toISOString()
            })
            .eq('id', authData.user.id);

          if (updateError) {
            console.warn('Update error', normalizeError(updateError));
          } else {
            // Verify the update worked
            const { data: updatedProfile, error: vError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            if (vError) console.warn('Verify profile error', normalizeError(vError));

            if (updatedProfile && updatedProfile.role === 'admin') {
              adminProfile = updatedProfile;
              break;
            }
          }
        } else {
          // Profile doesn't exist, create it manually
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              role: 'admin',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.warn('Create profile error', normalizeError(createError));

            // If RLS or permission-related, attempt Edge Function fallback
            const ne = normalizeError(createError);
            const isRLS = ne.message?.toLowerCase().includes('row-level') || ne.code === 'PGRST301' || ne.message?.toLowerCase().includes('permission denied');
            if (isRLS) {
              console.log('Attempting Edge Function fallback due to RLS/permission issue');
              const edgeResp = await callEdgeFix(authData.user.id);
              if (edgeResp?.data?.success) {
                adminProfile = edgeResp.data.profile;
                break;
              } else {
                console.warn('Edge function fallback failed', edgeResp);
              }
            }

          } else if (createdProfile) {
            adminProfile = createdProfile;
            break;
          }
        }

        console.log(`Profile creation/update attempt ${attempts}/${maxAttempts}`);
      }

      if (!adminProfile) {
        // Try one last time with Edge Function before giving up
        try {
          console.log('Final attempt using Edge Function to create profile');
          const edgeResp = await callEdgeFix(authData.user.id);
          if (edgeResp?.data?.success) {
            adminProfile = edgeResp.data.profile;
          } else {
            console.warn('Final Edge Function attempt failed', edgeResp);
          }
        } catch (e) {
          console.error('Final edge function error', e);
        }
      }

      if (!adminProfile) {
        return {
          success: false,
          message: `Admin account created but profile setup failed after ${maxAttempts} attempts. Please contact support with User ID: ${authData.user.id}`,
          userId: authData.user.id,
          error: { message: 'Profile creation failed', attempts }
        };
      }

      if (adminProfile.role !== 'admin') {
        return {
          success: false,
          message: 'Account created but admin role was not set correctly. Please contact support.',
          userId: authData.user.id
        };
      }

      return {
        success: true,
        message: 'Admin account created successfully! You can now log in with admin privileges.',
        userId: authData.user.id
      };

    } catch (error: any) {
      const nerr = normalizeError(error);
      return {
        success: false,
        message: `Unexpected error: ${nerr.message}`,
        error: nerr
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    
    try {
      const creationResult = await createAdminAccount();
      setResult(creationResult);
      
      if (creationResult.success) {
        toast({
          title: "Success",
          description: creationResult.message,
        });
        
        // Clear sensitive data
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: '',
          secretKey: ''
        });
      } else {
        toast({
          title: "Error",
          description: creationResult.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create admin account: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="medical-hero-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-medical-gradient">
              Create Admin Account
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create a secure administrator account for platform management
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h4 className="font-semibold text-amber-800">Security Notice</h4>
              </div>
              <p className="text-sm text-amber-700">
                This utility creates a permanent admin account with full system access. 
                Use only for legitimate administrative purposes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretKey">Admin Creation Secret Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="Required security key"
                  value={formData.secretKey}
                  onChange={(e) => handleInputChange('secretKey', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Contact system administrator for the secret key
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full btn-medical-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Admin Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Admin Account
                  </>
                )}
              </Button>
            </form>

            {result && (
              <div className={`mt-4 p-4 rounded-lg border-l-4 ${
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
                {result.userId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    User ID: {result.userId}
                  </p>
                )}
                {!result.success && result.userId && result.message.includes('verification failed') && (
                  <div className="mt-3">
                    <Button
                      onClick={() => navigate(`/fix-admin-account`)}
                      size="sm"
                      variant="outline"
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      Fix This Account Issue
                    </Button>
                  </div>
                )}
              </div>
            )}

            {result?.success && (
              <div className="mt-4 flex gap-2">
                <Button 
                  onClick={() => navigate('/admin')}
                  className="flex-1 btn-medical-primary"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Go to Admin Dashboard
                </Button>
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="flex-1"
                >
                  Go Home
                </Button>
              </div>
            )}

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAdminAccount;
