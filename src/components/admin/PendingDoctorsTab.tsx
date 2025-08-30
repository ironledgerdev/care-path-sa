import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PendingDoctor {
  id: string;
  user_id: string;
  practice_name: string;
  speciality: string;
  qualification: string;
  license_number: string;
  years_experience: number;
  consultation_fee: number;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  bio: string;
  status: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface PendingDoctorsTabProps {
  pendingDoctors: PendingDoctor[];
  onApprove: (doctorId: string) => void;
  onReject: (doctorId: string) => void;
  onView: (doctor: PendingDoctor) => void;
  isLoading: boolean;
}

export const PendingDoctorsTab = ({
  pendingDoctors,
  onApprove,
  onReject,
  onView,
  isLoading
}: PendingDoctorsTabProps) => {
  const [query, setQuery] = useState('');
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewDoctor, setViewDoctor] = useState<PendingDoctor | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pendingDoctors;
    return pendingDoctors.filter((d) => {
      const fullName = `${d.profiles.first_name} ${d.profiles.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        d.profiles.email.toLowerCase().includes(q) ||
        d.practice_name.toLowerCase().includes(q) ||
        d.speciality.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q)
      );
    });
  }, [pendingDoctors, query]);

  return (
    <Card className="medical-hero-card">
      <CardHeader>
        <CardTitle>Pending Doctor Applications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
          <Input
            placeholder="Search by name, email, specialty, practice, or license"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
          />
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isLoading || selected.size === 0} className="btn-medical-primary">
                  Approve Selected ({selected.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve {selected.size} application(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create doctor profiles and update their roles.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    for (const id of Array.from(selected)) {
                      await Promise.resolve(onApprove(id));
                    }
                    setSelected(new Set());
                  }}>Approve</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading || selected.size === 0}>
                  Reject Selected ({selected.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject {selected.size} application(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark them as rejected. You can change later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    for (const id of Array.from(selected)) {
                      await Promise.resolve(onReject(id));
                    }
                    setSelected(new Set());
                  }}>Reject</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pending applications</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={selected.size > 0 && selected.size === filtered.length}
                    onCheckedChange={(v) => {
                      if (v) setSelected(new Set(filtered.map((d) => d.id)));
                      else setSelected(new Set());
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Practice</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium">
                    {doctor.profiles.first_name} {doctor.profiles.last_name}
                  </TableCell>
                  <TableCell>{doctor.profiles.email}</TableCell>
                  <TableCell>{doctor.practice_name}</TableCell>
                  <TableCell>{doctor.speciality}</TableCell>
                  <TableCell>{doctor.license_number}</TableCell>
                  <TableCell>{doctor.years_experience} years</TableCell>
                  <TableCell>R{(doctor.consultation_fee / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {doctor.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(doctor)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => setApproveId(doctor.id)}
                            className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve doctor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Approving will move this application to active doctors and update their role.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setApproveId(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { if (approveId) onApprove(approveId); setApproveId(null); }}>Approve</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isLoading}
                            onClick={() => setRejectId(doctor.id)}
                            className="h-8 w-8 p-0"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject application?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will mark the application as rejected. You can change it later if needed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setRejectId(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { if (rejectId) onReject(rejectId); setRejectId(null); }}>Reject</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
