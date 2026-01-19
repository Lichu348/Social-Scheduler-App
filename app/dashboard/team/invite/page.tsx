"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft, UserPlus, Copy, Check } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

export default function InviteStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [success, setSuccess] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "EMPLOYEE",
    staffRole: "DESK",
    primaryLocationId: "",
  });

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLocations(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          primaryLocationId: formData.primaryLocationId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to invite staff member");
        return;
      }

      setSuccess({
        name: data.user.name,
        email: data.user.email,
        tempPassword: data.tempPassword,
      });
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (success) {
      const text = `Email: ${success.email}\nTemporary Password: ${success.tempPassword}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inviteAnother = () => {
    setSuccess(null);
    setFormData({
      name: "",
      email: "",
      role: "EMPLOYEE",
      staffRole: "DESK",
      primaryLocationId: "",
    });
  };

  const roleOptions = [
    { value: "EMPLOYEE", label: "Employee" },
    { value: "MANAGER", label: "Manager" },
    { value: "ADMIN", label: "Admin" },
  ];

  const staffRoleOptions = [
    { value: "DESK", label: "Front Desk" },
    { value: "COACH", label: "Coach" },
    { value: "SETTER", label: "Route Setter" },
    { value: "INSTRUCTOR", label: "Instructor" },
  ];

  const locationOptions = [
    { value: "", label: "No primary location" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  if (success) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Staff Member Invited!</CardTitle>
            <CardDescription>
              Share these login credentials with {success.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="font-mono">{success.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Temporary Password</p>
                <p className="font-mono text-lg">{success.tempPassword}</p>
              </div>
            </div>

            <Button onClick={copyCredentials} variant="outline" className="w-full">
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Credentials
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              The staff member should change their password after first login.
            </p>

            <div className="flex gap-3">
              <Button onClick={inviteAnother} variant="outline" className="flex-1">
                Invite Another
              </Button>
              <Link href="/dashboard/team" className="flex-1">
                <Button className="w-full">View Team</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard/team"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Team
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Staff Member
          </CardTitle>
          <CardDescription>
            Add a new team member to your organization. A temporary password will be generated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Permission Level</Label>
                <Select
                  id="role"
                  options={roleOptions}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Admins can manage everything. Managers can create shifts and manage staff.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staffRole">Job Role</Label>
                <Select
                  id="staffRole"
                  options={staffRoleOptions}
                  value={formData.staffRole}
                  onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Their primary function at the gym.
                </p>
              </div>
            </div>

            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location">Primary Location</Label>
                <Select
                  id="location"
                  options={locationOptions}
                  value={formData.primaryLocationId}
                  onChange={(e) => setFormData({ ...formData, primaryLocationId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  The staff member will be assigned to this location by default.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Link href="/dashboard/team" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Inviting..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
