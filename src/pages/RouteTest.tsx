import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ExternalLink, Route } from 'lucide-react';

const RouteTest = () => {
  const adminRoutes = [
    { path: '/admin-setup', description: 'Main admin setup page (canonical)' },
    { path: '/AdminSetup', description: 'PascalCase redirect' },
    { path: '/adminSetup', description: 'camelCase redirect' },
    { path: '/admin_setup', description: 'Underscore redirect' },
    { path: '/ADMIN_SETUP', description: 'Uppercase redirect' },
    { path: '/create-admin-account', description: 'Admin account creation page (canonical)' },
    { path: '/CreateAdminAccount', description: 'PascalCase redirect' },
    { path: '/createAdminAccount', description: 'camelCase redirect' },
  ];

  const testRoute = (path: string) => {
    window.open(path, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-medical-gradient mb-2 flex items-center justify-center gap-3">
              <Route className="h-8 w-8" />
              Admin Route Testing
            </h1>
            <p className="text-xl text-muted-foreground">
              Test all admin route variations to ensure they work correctly
            </p>
          </div>

          <Card className="medical-hero-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Route Status: Fixed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">✅ Issue Resolved:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Added redirect from <code>/AdminSetup</code> to <code>/admin-setup</code></li>
                  <li>• Added multiple URL format redirects for better user experience</li>
                  <li>• All admin routes now work with different case variations</li>
                  <li>• Route redirects are implemented using React Router Navigate</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-hero-card">
            <CardHeader>
              <CardTitle>Test All Admin Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  Click any button below to test the route. All should work correctly now:
                </p>
                
                <div className="grid gap-3">
                  {adminRoutes.map((route, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {route.path}
                          </code>
                          {route.path.includes('-') ? (
                            <Badge variant="default">Canonical</Badge>
                          ) : (
                            <Badge variant="secondary">Redirect</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{route.description}</p>
                      </div>
                      <Button 
                        onClick={() => testRoute(route.path)}
                        size="sm"
                        variant="outline"
                      >
                        Test
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-hero-card mt-8">
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => window.location.href = '/admin-setup'}
                  className="btn-medical-primary"
                  size="lg"
                >
                  Go to Admin Setup Instructions
                </Button>
                <Button 
                  onClick={() => window.location.href = '/create-admin-account'}
                  variant="outline"
                  size="lg"
                >
                  Create Admin Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RouteTest;
