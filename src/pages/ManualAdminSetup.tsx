import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Terminal, 
  Copy, 
  AlertTriangle, 
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ManualAdminSetup = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${description} copied to clipboard`,
    });
  };

  const sqlCommands = [
    {
      title: "Check if profile exists",
      description: "First, verify if your profile exists in the database",
      sql: `SELECT * FROM profiles WHERE id = '3a7e63fa-b246-4f21-a44d-a3ca020e2198';`
    },
    {
      title: "Update existing profile to admin",
      description: "If profile exists, update it to admin role",
      sql: `UPDATE profiles 
SET role = 'admin', 
    first_name = 'Jay', 
    last_name = 'Mashau', 
    email = 'ironledgerdev@gmail.com',
    updated_at = NOW()
WHERE id = '3a7e63fa-b246-4f21-a44d-a3ca020e2198';`
    },
    {
      title: "Create new admin profile",
      description: "If profile doesn't exist, create it",
      sql: `INSERT INTO profiles (id, email, first_name, last_name, role, email_verified, created_at, updated_at)
VALUES (
  '3a7e63fa-b246-4f21-a44d-a3ca020e2198',
  'ironledgerdev@gmail.com',
  'Jay',
  'Mashau',
  'admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  first_name = 'Jay',
  last_name = 'Mashau',
  email = 'ironledgerdev@gmail.com',
  updated_at = NOW();`
    },
    {
      title: "Verify admin setup",
      description: "Confirm the admin account is set up correctly",
      sql: `SELECT id, email, first_name, last_name, role, created_at 
FROM profiles 
WHERE id = '3a7e63fa-b246-4f21-a44d-a3ca020e2198' AND role = 'admin';`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-medical-gradient mb-2 flex items-center justify-center gap-3">
              <Database className="h-8 w-8" />
              Manual Admin Setup
            </h1>
            <p className="text-xl text-muted-foreground">
              Direct database commands to fix your admin account
            </p>
          </div>

          {/* Warning Notice */}
          <Card className="medical-hero-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Database Access Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700 mb-3">
                  <strong>This method requires direct database access.</strong> You'll need to run these SQL commands 
                  in your Supabase Dashboard's SQL Editor or through another database client.
                </p>
                <div className="text-xs text-amber-600 space-y-1">
                  <p>• Access your Supabase Dashboard → SQL Editor</p>
                  <p>• Or use psql, pgAdmin, or similar database tools</p>
                  <p>• Make sure you have admin/owner permissions on the database</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Instructions */}
          <Card className="medical-hero-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                How to Access Your Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary">Option 1: Supabase Dashboard</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com/dashboard</a></li>
                    <li>Select your project</li>
                    <li>Click on "SQL Editor" in the sidebar</li>
                    <li>Create a new query</li>
                    <li>Paste and run the SQL commands below</li>
                  </ol>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary">Option 2: Direct Connection</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Use your database connection string with:</p>
                    <ul className="list-disc list-inside ml-2">
                      <li>psql (PostgreSQL client)</li>
                      <li>pgAdmin</li>
                      <li>DBeaver</li>
                      <li>Any PostgreSQL-compatible tool</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SQL Commands */}
          <div className="space-y-6">
            {sqlCommands.map((command, index) => (
              <Card key={index} className="medical-hero-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="outline">Step {index + 1}</Badge>
                        {command.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {command.description}
                      </p>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(command.sql, command.title)}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre>{command.sql}</pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Success Verification */}
          <Card className="medical-hero-card mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Verification & Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">After running the SQL commands:</h4>
                  <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                    <li>The verification query should return your admin profile</li>
                    <li>Try logging in normally with your email and password</li>
                    <li>You should automatically be redirected to /admin</li>
                    <li>You'll have full administrative privileges</li>
                  </ol>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => window.location.href = '/admin'}
                    className="btn-medical-primary"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Go to Admin Dashboard
                  </Button>
                  <Button 
                    onClick={() => window.dispatchEvent(new Event('openAuthModal'))}
                    variant="outline"
                  >
                    Login to Test Access
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alternative Options */}
          <Card className="medical-hero-card mt-8">
            <CardHeader>
              <CardTitle>Still Having Issues?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => window.location.href = '/fix-admin-account'}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center text-center"
                >
                  <Terminal className="h-6 w-6 mb-2" />
                  <span className="font-semibold mb-1">Try Automated Fix</span>
                  <span className="text-xs text-muted-foreground">Use the automated account recovery tool</span>
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/create-admin-account'}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center text-center"
                >
                  <Database className="h-6 w-6 mb-2" />
                  <span className="font-semibold mb-1">Create New Account</span>
                  <span className="text-xs text-muted-foreground">Start fresh with a new admin account</span>
                </Button>

                <Button 
                  onClick={() => window.location.href = '/admin-setup'}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center text-center"
                >
                  <ExternalLink className="h-6 w-6 mb-2" />
                  <span className="font-semibold mb-1">Setup Guide</span>
                  <span className="text-xs text-muted-foreground">View complete admin setup instructions</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManualAdminSetup;
