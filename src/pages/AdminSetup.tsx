import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  UserPlus,
  Key,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  Copy,
  ExternalLink,
  Wrench
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminSetup = () => {
  const { toast } = useToast();
  
  const adminSecretKey = 'MEDMAP_CREATE_ADMIN_2024_SECURE';

  const copySecretKey = () => {
    navigator.clipboard.writeText(adminSecretKey);
    toast({
      title: "Secret Key Copied",
      description: "The admin creation secret key has been copied to your clipboard.",
    });
  };

  const steps = [
    {
      step: 1,
      title: "Navigate to Admin Creation Page",
      description: "Go to the secure admin account creation page",
      action: "Visit /create-admin-account",
      icon: <UserPlus className="h-5 w-5" />
    },
    {
      step: 2,
      title: "Use the Secret Key",
      description: "Enter the admin creation secret key when prompted",
      action: adminSecretKey,
      icon: <Key className="h-5 w-5" />
    },
    {
      step: 3,
      title: "Fill Admin Details",
      description: "Provide your admin account information",
      action: "Email, password, and personal details",
      icon: <Shield className="h-5 w-5" />
    },
    {
      step: 4,
      title: "Login with Admin Privileges",
      description: "Use your new admin account to access the admin dashboard",
      action: "Login normally and access /admin",
      icon: <CheckCircle className="h-5 w-5" />
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-medical-gradient mb-2 flex items-center justify-center gap-3">
              <Shield className="h-8 w-8" />
              Admin Account Setup
            </h1>
            <p className="text-xl text-muted-foreground">
              Create your secure administrator account for platform management
            </p>
          </div>

          {/* Security Notice */}
          <Card className="medical-hero-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Important Security Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold text-amber-800 mb-2">Security Improvements Made:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Removed insecure sessionStorage admin bypass</li>
                  <li>• Implemented proper role-based admin authentication</li>
                  <li>• Added secure admin account creation process</li>
                  <li>• Admin privileges now require actual database admin role</li>
                </ul>
              </div>
              <p className="text-muted-foreground">
                Your admin account will have full access to user management, doctor approvals, system settings, and all administrative functions.
              </p>
            </CardContent>
          </Card>

          {/* Admin Secret Key */}
          <Card className="medical-hero-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Admin Creation Secret Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-800">Your Secret Key:</h4>
                  <Button onClick={copySecretKey} size="sm" variant="outline">
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-white p-3 rounded border font-mono text-sm break-all">
                  {adminSecretKey}
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  Keep this key secure. It's required to create admin accounts.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Setup Steps */}
          <Card className="medical-hero-card mb-8">
            <CardHeader>
              <CardTitle>Admin Account Creation Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div key={step.step} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {step.icon}
                        <h3 className="font-semibold text-primary">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground mb-2">{step.description}</p>
                      <div className="flex items-center gap-2">
                        {step.step === 2 ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {step.action}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {step.action}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting Section */}
          <Card className="medical-hero-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2">Account Created But Verification Failed?</h4>
                  <p className="text-sm text-amber-700 mb-3">
                    If you received an error like "Admin account created but verification failed" with a User ID,
                    use our account recovery tool to fix the issue.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/fix-admin-account'}
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Fix Failed Admin Account
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-semibold text-primary mb-2">Common Issues:</h5>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Database timing issues</li>
                      <li>• Profile creation delays</li>
                      <li>• Role assignment failures</li>
                      <li>• Network connectivity problems</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-primary mb-2">Solutions:</h5>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Use the account recovery tool</li>
                      <li>• Wait and try again later</li>
                      <li>• Check your internet connection</li>
                      <li>• Contact support if issues persist</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle className="text-primary">Ready to Create Admin Account?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Use the secure admin creation process to set up your administrative account.
                </p>
                <Button 
                  onClick={() => window.location.href = '/create-admin-account'}
                  className="w-full btn-medical-primary"
                  size="lg"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create Admin Account
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle className="text-primary">Already Have Admin Account?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Login with your admin credentials to access the dashboard.
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => window.dispatchEvent(new Event('openAuthModal'))}
                    variant="outline" 
                    className="w-full"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Login to Admin Dashboard
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/admin'}
                    className="w-full btn-medical-primary"
                  >
                    Go to Admin Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <Card className="medical-hero-card mt-8">
            <CardHeader>
              <CardTitle>What You Can Do as Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary">User Management</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• View and manage all user accounts</li>
                    <li>• Create new user accounts</li>
                    <li>• Manage user roles and permissions</li>
                    <li>• View user membership information</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary">Doctor Management</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Review and approve doctor applications</li>
                    <li>• Manage doctor profiles and verification</li>
                    <li>• Monitor doctor performance and bookings</li>
                    <li>• Handle doctor disputes and issues</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary">Platform Oversight</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• View real-time platform statistics</li>
                    <li>• Monitor booking and revenue metrics</li>
                    <li>• Access comprehensive reporting</li>
                    <li>• Manage system settings and configuration</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary">Security & Compliance</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Monitor security and access logs</li>
                    <li>• Manage data privacy and compliance</li>
                    <li>• Handle user support and escalations</li>
                    <li>• Configure platform security settings</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
