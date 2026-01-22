"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Minus,
  FileText,
  Award,
  Users,
  Clock,
  ClipboardCheck,
  Star,
  Plus,
  MapPin,
} from "lucide-react";

interface ComplianceItem {
  id: string;
  name: string;
  type: string;
  validityMonths: number;
  isRequired: boolean;
}

interface ComplianceRecord {
  id: string;
  expiryDate: string;
  signedAt: string | null;
  signature: string | null;
  rating: number | null;
  managerNotes: string | null;
  employeeComments: string | null;
  goals: string | null;
  managerSignature: string | null;
  managerSignedAt: string | null;
}

interface UserCompliance {
  id: string;
  name: string;
  email: string;
  staffRole: string;
  compliance: Record<
    string,
    {
      status: "completed" | "expired" | "pending" | "pending_ack" | "not_required";
      record: ComplianceRecord | null;
    }
  >;
}

interface OverviewStats {
  totalItems: number;
  totalUsers: number;
  policies: number;
  qualifications: number;
  reviews: number;
  expiringSoon: number;
  expired: number;
  pending: number;
  pendingAck: number;
}

interface Location {
  id: string;
  name: string;
}

const staffRoleLabels: Record<string, string> = {
  DESK: "Front Desk",
  COACH: "Coach",
  SETTER: "Setter",
  INSTRUCTOR: "Instructor",
};

export function ComplianceAdminView() {
  const router = useRouter();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [users, setUsers] = useState<UserCompliance[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Review dialog state
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showAddReviewDialog, setShowAddReviewDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCompliance | null>(null);
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [reviewData, setReviewData] = useState({
    rating: 3,
    managerNotes: "",
    goals: "",
    managerSignature: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, [selectedLocation]);

  const fetchOverview = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("locationId", selectedLocation);
      }
      const res = await fetch(`/api/compliance/overview?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setUsers(data.users);
        setStats(data.stats);
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Failed to fetch overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConductReview = (user: UserCompliance, item: ComplianceItem) => {
    setSelectedUser(user);
    setSelectedItem(item);
    const existingRecord = user.compliance[item.id]?.record;
    setReviewData({
      rating: existingRecord?.rating || 3,
      managerNotes: existingRecord?.managerNotes || "",
      goals: existingRecord?.goals || "",
      managerSignature: "",
    });
    setShowReviewDialog(true);
  };

  const handleSaveReview = async () => {
    if (!selectedUser || !selectedItem || !reviewData.managerSignature.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/compliance/${selectedItem.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          rating: reviewData.rating,
          managerNotes: reviewData.managerNotes || null,
          goals: reviewData.goals || null,
          managerSignature: reviewData.managerSignature.trim(),
        }),
      });

      if (res.ok) {
        setShowReviewDialog(false);
        setSelectedUser(null);
        setSelectedItem(null);
        fetchOverview();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save review:", error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string, itemType: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "expired":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <XCircle className="h-4 w-4 text-amber-600" />;
      case "pending_ack":
        return <Clock className="h-4 w-4 text-blue-600" />; // Awaiting employee acknowledgment
      default:
        return <Minus className="h-4 w-4 text-gray-300" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading compliance data...</div>;
  }

  // Get review items for the Add Review dialog
  const reviewItems = items.filter((i) => i.type === "REVIEW");

  const handleOpenAddReview = () => {
    setReviewData({
      rating: 3,
      managerNotes: "",
      goals: "",
      managerSignature: "",
    });
    setShowAddReviewDialog(true);
  };

  const locationOptions = [
    { value: "all", label: "All Locations" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Select
            options={locationOptions}
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-[200px]"
          />
        </div>
        {reviewItems.length > 0 && (
          <Button onClick={handleOpenAddReview}>
            <Plus className="h-4 w-4 mr-2" />
            Add Review
          </Button>
        )}
      </div>

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
                          ) : item.type === "REVIEW" ? (
                            <ClipboardCheck className="h-4 w-4" />
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
                        const isReview = item.type === "REVIEW";
                        const canConduct = isReview && compliance?.status !== "not_required";
                        return (
                          <TableCell
                            key={item.id}
                            className={`text-center ${canConduct ? "cursor-pointer hover:bg-muted/50" : ""}`}
                            onClick={() => canConduct && handleConductReview(user, item)}
                            title={canConduct ? "Click to conduct review" : undefined}
                          >
                            <div className="flex justify-center">
                              {getStatusIcon(compliance?.status || "not_required", item.type)}
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
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Awaiting Acknowledgment</span>
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

      {/* Conduct Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conduct Performance Review</DialogTitle>
            <DialogDescription>
              Complete the performance review for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{selectedItem?.name}</p>
              <p className="text-sm text-muted-foreground">
                Employee: {selectedUser?.name}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Performance Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setReviewData({ ...reviewData, rating })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        rating <= reviewData.rating
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {reviewData.rating}/5
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerNotes">Manager Notes / Feedback</Label>
              <Textarea
                id="managerNotes"
                value={reviewData.managerNotes}
                onChange={(e) =>
                  setReviewData({ ...reviewData, managerNotes: e.target.value })
                }
                placeholder="Performance feedback, areas of strength, areas for improvement..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Goals for Next Review Period</Label>
              <Textarea
                id="goals"
                value={reviewData.goals}
                onChange={(e) =>
                  setReviewData({ ...reviewData, goals: e.target.value })
                }
                placeholder="Specific, measurable goals for the employee..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerSignature">Manager Signature</Label>
              <Input
                id="managerSignature"
                value={reviewData.managerSignature}
                onChange={(e) =>
                  setReviewData({ ...reviewData, managerSignature: e.target.value })
                }
                placeholder="Type your full name"
              />
              <p className="text-xs text-muted-foreground">
                This digital signature will be recorded with the current date and time.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveReview}
              disabled={saving || !reviewData.managerSignature.trim()}
            >
              {saving ? "Saving..." : "Complete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Review Dialog - Select User and Review Type */}
      <Dialog open={showAddReviewDialog} onOpenChange={setShowAddReviewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Performance Review</DialogTitle>
            <DialogDescription>
              Select an employee and review type to conduct a performance review
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reviewUser">Employee</Label>
              <Select
                id="reviewUser"
                options={[
                  { value: "", label: "Select employee..." },
                  ...users.map((u) => ({ value: u.id, label: u.name })),
                ]}
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const user = users.find((u) => u.id === e.target.value);
                  setSelectedUser(user || null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewType">Review Type</Label>
              <Select
                id="reviewType"
                options={[
                  { value: "", label: "Select review type..." },
                  ...reviewItems.map((i) => ({ value: i.id, label: i.name })),
                ]}
                value={selectedItem?.id || ""}
                onChange={(e) => {
                  const item = reviewItems.find((i) => i.id === e.target.value);
                  setSelectedItem(item || null);
                }}
              />
            </div>

            {selectedUser && selectedItem && (
              <>
                <div className="space-y-2">
                  <Label>Performance Rating</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, rating })}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            rating <= reviewData.rating
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {reviewData.rating}/5
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addManagerNotes">Manager Notes / Feedback</Label>
                  <Textarea
                    id="addManagerNotes"
                    value={reviewData.managerNotes}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, managerNotes: e.target.value })
                    }
                    placeholder="Performance feedback, areas of strength, areas for improvement..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addGoals">Goals for Next Review Period</Label>
                  <Textarea
                    id="addGoals"
                    value={reviewData.goals}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, goals: e.target.value })
                    }
                    placeholder="Specific, measurable goals for the employee..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addManagerSignature">Manager Signature</Label>
                  <Input
                    id="addManagerSignature"
                    value={reviewData.managerSignature}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, managerSignature: e.target.value })
                    }
                    placeholder="Type your full name"
                  />
                  <p className="text-xs text-muted-foreground">
                    This digital signature will be recorded with the current date and time.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddReviewDialog(false);
              setSelectedUser(null);
              setSelectedItem(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedUser || !selectedItem) return;
                await handleSaveReview();
                setShowAddReviewDialog(false);
                setSelectedUser(null);
                setSelectedItem(null);
              }}
              disabled={saving || !selectedUser || !selectedItem || !reviewData.managerSignature.trim()}
            >
              {saving ? "Saving..." : "Complete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
