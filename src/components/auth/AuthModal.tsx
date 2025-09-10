import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, UserPlus, Stethoscope, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<'patient' | 'doctor'>('patient');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const { signIn } = useAuth();

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;

      // Refresh the profile to get latest user data (noop for local admin)
      await refreshProfile();

      // Determine redirect based on profile
      const role = (await (async () => {
        // try to read profile from DB
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('email', email)
            .limit(1)
            .maybeSingle();
          return profileData?.role;
        } catch (e) {
          // fallback to context profile
          return null;
        }
      })()) || (useAuth().profile?.role);

      toast({
        title: "Success",
        description: "Signed in successfully!",
      });

      onClose();

      setTimeout(() => {
        if (role === 'admin' || useAuth().profile?.role === 'admin') {
          navigate('/admin');
        } else if (role === 'doctor' || useAuth().profile?.role === 'doctor') {
          navigate('/doctor');
        } else {
          navigate('/search');
        }
      }, 500);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            role: userType,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account created! Please check your email to verify your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password Reset Sent",
        description: "Check your email for password reset instructions.",
      });

      setShowPasswordReset(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setUserType('patient');
    setShowPasswordReset(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (showPasswordReset) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswordReset(false)}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-medical-gradient">
                Reset Password
              </DialogTitle>
            </div>
          </DialogHeader>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handlePasswordReset}
                className="w-full btn-medical-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset email...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordReset(false)}
                  className="text-sm text-muted-foreground"
                >
                  Back to sign in
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-medical-gradient">
            IronLedgerMedMap Access
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSignIn}
                  className="w-full btn-medical-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full text-sm"
                  disabled={isLoading}
                >
                  Forgot Password?
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user-type">I am a</Label>
                  <Select value={userType} onValueChange={(value: 'patient' | 'doctor') => setUserType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Patient
                        </div>
                      </SelectItem>
                      <SelectItem value="doctor">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4" />
                          Healthcare Provider
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {userType === 'doctor' ? (
                  <div className="text-center space-y-4 py-6">
                    <div className="p-4 bg-accent/50 rounded-lg border-l-4 border-primary">
                      <h4 className="font-semibold text-primary mb-2">Healthcare Provider Registration</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Healthcare providers need to complete a comprehensive enrollment process with professional credentials and verification.
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        onClose();
                        navigate('/doctor-enrollment');
                      }}
                      className="w-full btn-medical-primary"
                    >
                      <Stethoscope className="mr-2 h-4 w-4" />
                      Continue to Doctor Enrollment
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <Input
                          id="first-name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input
                          id="last-name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+27 XX XXX XXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <Button 
                      onClick={handleSignUp}
                      className="w-full btn-medical-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create Patient Account'
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
