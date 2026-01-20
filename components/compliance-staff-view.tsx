"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";

interface ComplianceItem {
  id: string;
  name: string;
  description: string | null;
  type: "POLICY" | "QUALIFICATION";
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
  } | null;
  complianceStatus: "not_completed" | "completed" | "expired";
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
      const res = await fetch(`/api/compliance/${selectedItem.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: signature.trim(),
          certificateNumber: certificateNumber.trim() || null,
        }),
      });

      if (res.ok) {
        setSelectedItem(null);
        setSignature("");
        setCertificateNumber("");
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
  const needsAttention = items.filter(
    (i) =>
      i.isRequiredForUser &&
      (i.complianceStatus === "not_completed" || i.complianceStatus === "expired")
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
          <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
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
      default:
        return (
          <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
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
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <PenLine className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">
              You have {needsAttention.length} item{needsAttention.length > 1 ? "s" : ""} requiring attention
            </p>
            <p className="text-sm text-amber-700">
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
      </Tabs>

      {/* Sign/Acknowledge Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.type === "POLICY" ? "Acknowledge Policy" : "Confirm Qualification"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.type === "POLICY"
                ? `By signing below, you confirm that you have read and understood: "${selectedItem?.name}"`
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={signing || !signature.trim()}>
              {signing ? "Signing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
