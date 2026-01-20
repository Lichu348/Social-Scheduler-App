"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Minus,
  FileText,
  Award,
  Users,
  Clock,
} from "lucide-react";

interface ComplianceItem {
  id: string;
  name: string;
  type: string;
  validityMonths: number;
  isRequired: boolean;
}

interface UserCompliance {
  id: string;
  name: string;
  email: string;
  staffRole: string;
  compliance: Record<
    string,
    {
      status: "completed" | "expired" | "pending" | "not_required";
      record: {
        expiryDate: string;
        signedAt: string;
      } | null;
    }
  >;
}

interface OverviewStats {
  totalItems: number;
  totalUsers: number;
  policies: number;
  qualifications: number;
  expiringSoon: number;
  expired: number;
  pending: number;
}

const staffRoleLabels: Record<string, string> = {
  DESK: "Front Desk",
  COACH: "Coach",
  SETTER: "Setter",
  INSTRUCTOR: "Instructor",
};

export function ComplianceAdminView() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [users, setUsers] = useState<UserCompliance[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/compliance/overview");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setUsers(data.users);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "expired":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <XCircle className="h-4 w-4 text-amber-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-300" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading compliance data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">items need attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{stats.expired}</p>
              <p className="text-xs text-muted-foreground">need renewal</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{stats.expiringSoon}</p>
              <p className="text-xs text-muted-foreground">within 30 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Matrix</CardTitle>
          <CardDescription>
            Overview of all team members' compliance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No compliance items configured. Add items in the "Manage Items" tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    {items.map((item) => (
                      <TableHead key={item.id} className="text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          {item.type === "POLICY" ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <Award className="h-4 w-4" />
                          )}
                          <span className="text-xs whitespace-nowrap">{item.name}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {user.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {staffRoleLabels[user.staffRole] || user.staffRole}
                        </Badge>
                      </TableCell>
                      {items.map((item) => {
                        const compliance = user.compliance[item.id];
                        return (
                          <TableCell key={item.id} className="text-center">
                            <div className="flex justify-center">
                              {getStatusIcon(compliance?.status || "not_required")}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-amber-600" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Expired</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="h-4 w-4 text-gray-300" />
              <span>Not Required</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
