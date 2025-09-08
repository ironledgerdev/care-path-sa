import React, { useEffect, useState } from 'react';
import { AdminDashboardContent } from './AdminDashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SESSION_KEY = 'admin_mashau_authenticated';

const AdminMashauPermits: React.FC = () => {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clear error when password changes
    setError(null);
  }, [password]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const expected = import.meta.env.VITE_ADMIN_PASSWORD || '';
    if (!expected) {
      setError('No admin password configured on this deployment.');
      return;
    }

    if (password === expected) {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {}
      setAuthenticated(true);
      setError(null);
    } else {
      setError('Invalid password');
      setAuthenticated(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    setAuthenticated(false);
    setPassword('');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Admin Access (Mashau Permits)</h2>
          <p className="text-sm text-muted-foreground mb-4">Enter the admin access password to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex items-center gap-2">
              <Button className="btn-medical-primary" onClick={handleSubmit}>
                Unlock Admin Panel
              </Button>
            </div>

            <div className="text-xs text-muted-foreground mt-4">This direct access link should only be shared with trusted administrators.</div>
          </form>
        </div>
      </div>
    );
  }

  // Provide a minimal admin profile override for actions performed in the panel
  const overrideProfile = {
    id: 'mashau-admin',
    role: 'admin',
    email: import.meta.env.VITE_ADMIN_EMAIL || 'admin@example.com',
    first_name: 'Mashau',
    last_name: 'Admin'
  };

  return (
    <div>
      <div className="flex justify-end p-4">
        <Button variant="ghost" onClick={handleLogout}>Logout</Button>
      </div>
      <AdminDashboardContent overrideProfile={overrideProfile} bypassAuth={true} />
    </div>
  );
};

export default AdminMashauPermits;
