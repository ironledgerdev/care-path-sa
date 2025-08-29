import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock } from 'lucide-react';

export const AdminAccess = () => {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Simple admin access code - in production this should be more secure
  const ADMIN_ACCESS_CODE = 'MEDMAP_ADMIN_2024';

  const handleAdminAccess = async () => {
    setIsLoading(true);
    
    if (accessCode === ADMIN_ACCESS_CODE) {
      toast({
        title: "Access Granted",
        description: "Welcome to the admin dashboard.",
      });
      navigate('/admin');
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid access code.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-medical-gradient">
            Admin Access
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the admin access code to continue
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-code">Access Code</Label>
            <Input
              id="access-code"
              type="password"
              placeholder="Enter admin access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()}
            />
          </div>
          
          <Button 
            onClick={handleAdminAccess}
            className="w-full btn-medical-primary"
            disabled={isLoading || !accessCode}
          >
            <Lock className="mr-2 h-4 w-4" />
            Access Admin Dashboard
          </Button>

          <div className="text-center">
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
  );
};