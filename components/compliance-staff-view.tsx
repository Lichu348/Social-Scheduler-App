"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Award,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  PenLine,
  ClipboardCheck,
  Star,
} from "lucide-react";

interface ComplianceItem {
  id: string;
  name: string;
  description: string | null;
  type: "POLICY" | "QUALIFICATION" | "REVIEW";
  validityMonths: number;
  isRequired: boolean;
  requiredForRoles: string[];
  fileUrl: string | null;
  fileName: string | null;
  requiresProof: boolean;
  userRecord: {
    id: string;
    issueDate: string;
    expiryDate: string;
    signature: string | null;
    signedAt: string | null;
    certificateNumber: string | null;
    status: string;
    // Review fields
    rating: number | null;
    managerNotes: string | null;
    employeeComments: string | null;
    goals: string | null;
    managerSignature: string | null;
    managerSignedAt: string | null;
  } | null;
  complianceStatus: "not_completed" | "completed" | "expired" | "pending_acknowledgment";
  isRequiredForUser: boolean;
}

interface ComplianceStaffViewProps {
  userId: string;
  staffRole: string;
}

export function ComplianceStaffView({ userId, staffRole }: ComplianceStaffViewProps) {
  const router = useRouter();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [signature, setSignature] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [employeeComments, setEmployeeComments] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/compliance");
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch compliance items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!selectedItem || !signature.trim()) return;

    setSigning(true);
    try {
      // Use different endpoint for reviews (employee acknowledgment)
      const isReview = selectedItem.type === "REVIEW";
      const url = isReview
        ? `/api/compliance/${selectedItem.id}/review`
        : `/api/compliance/${selectedItem.id}/sign`;
      const method = isReview ? "PATCH" : "POST";

      const body = isReview
        ? {
            signature: signature.trim(),
            employeeComments: employeeComments.trim() || null,
          }
        : {
            signature: signature.trim(),
            certificateNumber: certificateNumber.trim() || null,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSelectedItem(null);
        setSignature("");
        setCertificateNumber("");
        setEmployeeComments("");
        fetchItems();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to sign:", error);
    } finally {
      setSigning(false);
    }
  };

  const policies = items.filter((i) => i.type === "POLICY");
  const qualifications = items.filter((i) => i.type === "QUALIFICATION");
  const reviews = items.filter((i) => i.type === "REVIEW");
  const needsAttention = items.filter(
    (i) =>
      i.isRequiredForUser &&
      (i.complianceStatus === "not_completed" ||
        i.complianceStatus === "expired" ||
        i.complianceStatus === "pending_acknowledgment")
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (item: ComplianceItem) => {
    switch (item.complianceStatus) {
      case "completed":
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expired
          </Badge>
        );
      case "pending_acknowledgment":
        return (
          <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
            <Clock className="h-3 w-3" />
            Needs Your Acknowledgment
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading compliance items...</div>;
  }

  return (
    <>
      {/* Alert for items needing attention */}
      {needsAttention.length > 0 && (
        <div className="mb-6 p-4 bg-muted/50 border-l-4 border-l-amber-500 rounded-lg flex items-center gap-3">
          <PenLine className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-600">
              You have {needsAttention.length} item{needsAttention.length > 1 ? "s" : ""} requiring attention
            </p>
            <p className="text-sm text-muted-foreground">
              Please review and acknowledge the items below
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="policies">
        <TabsList className="mb-4">
          <TabsTrigger value="policies" className="relative">
            <FileText className="h-4 w-4 mr-2" />
            Policies
            {policies.filter((p) => p.isRequiredForUser && p.complianceStatus !== "completed").length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {policies.filter((p) => p.isRequiredForUser && p.complianceStatus !== "completed").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="qualifications" className="relative">
            <Award className="h-4 w-4 mr-2" />
            Qualifications
            {qualifications.filter((q) => q.isRequiredForUser && q.complianceStatus !== "completed").length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {qualifications.filter((q) => q.isRequiredForUser && q.complianceStatus !== "completed").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="relative">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Reviews
            {reviews.filter((r) => r.isRequiredForUser && r.complianceStatus === "pending_acknowledgment").length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                {reviews.filter((r) => r.isRequiredForUser && r.complianceStatus === "pending_acknowledgment").length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          {policies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No policies to acknowledge</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {policies.map((item) => (
                <Card
                  key={item.id}
                  className={
                    item.isRequiredForUser && item.complianceStatus !== "completed"
                      ? "border-amber-200"
                      : ""
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">{item.name}</CardTitle>
                      </div>
                      {item.isRequired && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <CardDescription className="text-sm mt-1">
                        {item.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pb-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {getStatusBadge(item)}
                      </div>
                      {item.userRecord?.signedAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Signed:</span>
                          <span>{formatDate(item.userRecord.signedAt)}</span>
                        </div>
                      )}
                      {item.userRecord?.expiryDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expires:</span>
                          <span>{formatDate(item.userRecord.expiryDate)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Valid for:</span>
                        <span>{item.validityMonths} months</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2 pt-2">
                    {item.fileUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(item.fileUrl!, "_blank")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    {item.complianceStatus !== "completed" ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedItem(item)}
                      >
                        Acknowledge
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedItem(item)}
                      >
                        Re-acknowledge
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="qualifications">
          {qualifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No qualifications to track</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {qualifications.map((item) => (
                <Card
                  key={item.id}
                  className={
                    item.isRequiredForUser && item.complianceStatus !== "completed"
                      ? "border-amber-200"
                      : ""
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">{item.name}</CardTitle>
                      </div>
                      {item.isRequired && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <CardDescription className="text-sm mt-1">
                        {item.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pb-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {getStatusBadge(item)}
                      </div>
                      {item.userRecord?.certificateNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Cert #:</span>
                          <span>{item.userRecord.certificateNumber}</span>
                        </div>
                      )}
                      {item.userRecord?.signedAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Confirmed:</span>
                          <span>{formatDate(item.userRecord.signedAt)}</span>
                        </div>
                      )}
                      {item.userRecord?.expiryDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expires:</span>
                          <span>{formatDate(item.userRecord.expiryDate)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2 pt-2">
                    {item.complianceStatus !== "completed" ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedItem(item)}
                      >
                        Confirm Qualification
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedItem(item)}
                      >
                        Update
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No performance reviews</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((item) => (
                <Card
                  key={item.id}
                  className={
                    item.complianceStatus === "pending_acknowledgment"
                      ? "border-blue-200"
                      : ""
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">{item.name}</CardTitle>
                      </div>
                    </div>
                    {item.description && (
                      <CardDescription className="text-sm mt-1">
                        {item.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pb-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {getStatusBadge(item)}
                      </div>
                      {item.userRecord?.rating && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Rating:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= item.userRecord!.rating!
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {item.userRecord?.managerSignedAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Review Date:</span>
                          <span>{formatDate(item.userRecord.managerSignedAt)}</span>
                        </div>
                      )}
                      {item.userRecord?.expiryDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Next Review:</span>
                          <span>{formatDate(item.userRecord.expiryDate)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2 pt-2">
                    {item.complianceStatus === "pending_acknowledgment" ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedItem(item)}
                      >
                        View & Acknowledge
                      </Button>
                    ) : item.complianceStatus === "completed" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedItem(item)}
                      >
                        View Review
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled
                      >
                        Pending Review
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sign/Acknowledge Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.type === "POLICY"
                ? "Acknowledge Policy"
                : selectedItem?.type === "REVIEW"
                ? "Performance Review"
                : "Confirm Qualification"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.type === "POLICY"
                ? `By signing below, you confirm that you have read and understood: "${selectedItem?.name}"`
                : selectedItem?.type === "REVIEW"
                ? selectedItem?.complianceStatus === "pending_acknowledgment"
                  ? "Review your performance feedback and acknowledge"
                  : "View your performance review details"
                : `Confirm that you hold the "${selectedItem?.name}" qualification`}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              {selectedItem.type === "POLICY" && selectedItem.fileUrl && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">{selectedItem.name}</p>
                  {selectedItem.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedItem.description}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedItem.fileUrl!, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Open Document
                  </Button>
                </div>
              )}

              {selectedItem.type === "QUALIFICATION" && (
                <div className="space-y-2">
                  <Label htmlFor="certNumber">Certificate Number (optional)</Label>
                  <Input
                    id="certNumber"
                    placeholder="e.g., FA-2024-12345"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                  />
                </div>
              )}

              {selectedItem.type === "REVIEW" && selectedItem.userRecord && (
                <div className="space-y-4">
                  {/* Rating */}
                  {selectedItem.userRecord.rating && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Performance Rating</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-6 w-6 ${
                              star <= selectedItem.userRecord!.rating!
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">
                          {selectedItem.userRecord.rating}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Manager Notes */}
                  {selectedItem.userRecord.managerNotes && (
                    <div className="space-y-2">
                      <Label>Manager Feedback</Label>
                      <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {selectedItem.userRecord.managerNotes}
                      </div>
                    </div>
                  )}

                  {/* Goals */}
                  {selectedItem.userRecord.goals && (
                    <div className="space-y-2">
                      <Label>Goals for Next Period</Label>
                      <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {selectedItem.userRecord.goals}
                      </div>
                    </div>
                  )}

                  {/* Manager Signature Info */}
                  {selectedItem.userRecord.managerSignature && (
                    <div className="text-sm text-muted-foreground">
                      <p>
                        Signed by manager: {selectedItem.userRecord.managerSignature}
                        {selectedItem.userRecord.managerSignedAt && (
                          <> on {formatDate(selectedItem.userRecord.managerSignedAt)}</>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Employee Comments - only for acknowledgment */}
                  {selectedItem.complianceStatus === "pending_acknowledgment" && (
                    <div className="space-y-2">
                      <Label htmlFor="employeeComments">Your Comments (optional)</Label>
                      <Textarea
                        id="employeeComments"
                        placeholder="Add any comments or feedback on this review..."
                        value={employeeComments}
                        onChange={(e) => setEmployeeComments(e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Show employee's previous comments if already acknowledged */}
                  {selectedItem.complianceStatus === "completed" &&
                    selectedItem.userRecord.employeeComments && (
                      <div className="space-y-2">
                        <Label>Your Comments</Label>
                        <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                          {selectedItem.userRecord.employeeComments}
                        </div>
                      </div>
                    )}

                  {/* Employee Signature Info */}
                  {selectedItem.complianceStatus === "completed" &&
                    selectedItem.userRecord.signature && (
                      <div className="text-sm text-muted-foreground">
                        <p>
                          Acknowledged by you: {selectedItem.userRecord.signature}
                          {selectedItem.userRecord.signedAt && (
                            <> on {formatDate(selectedItem.userRecord.signedAt)}</>
                          )}
                        </p>
                      </div>
                    )}
                </div>
              )}

              {/* Signature field - only for POLICY, QUALIFICATION, or REVIEW pending acknowledgment */}
              {(selectedItem.type !== "REVIEW" ||
                selectedItem.complianceStatus === "pending_acknowledgment") && (
                <div className="space-y-2">
                  <Label htmlFor="signature">Type your full name as signature</Label>
                  <Input
                    id="signature"
                    placeholder="Your full name"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This digital signature will be recorded with the current date and time.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              {selectedItem?.type === "REVIEW" &&
              selectedItem?.complianceStatus === "completed"
                ? "Close"
                : "Cancel"}
            </Button>
            {(selectedItem?.type !== "REVIEW" ||
              selectedItem?.complianceStatus === "pending_acknowledgment") && (
              <Button onClick={handleSign} disabled={signing || !signature.trim()}>
                {signing ? "Signing..." : "Confirm"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
