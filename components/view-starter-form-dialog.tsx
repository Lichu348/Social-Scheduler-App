"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StarterFormStatusBadge } from "@/components/starter-form-status-badge";
import { Eye, Download, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface StarterFormData {
  id: string;
  userId: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  userName: string;
  // Personal Details
  legalFirstName: string | null;
  legalMiddleName: string | null;
  legalLastName: string | null;
  dateOfBirth: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  nationalInsurance: string | null;
  // Bank Details
  bankName: string | null;
  accountHolderName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  // Tax Information
  hasP45: boolean;
  previousEmployer: string | null;
  p45LeavingDate: string | null;
  p45TaxCode: string | null;
  p45TotalPay: number | null;
  p45TotalTax: number | null;
  starterDeclaration: string | null;
  studentLoanPlan: string | null;
  // Emergency Contact
  emergencyName: string | null;
  emergencyRelationship: string | null;
  emergencyPhone: string | null;
  emergencyPhoneAlt: string | null;
  // Right to Work
  rightToWorkStatus: string | null;
  rightToWorkDocType: string | null;
  rightToWorkDocRef: string | null;
  rightToWorkExpiry: string | null;
}

interface ViewStarterFormDialogProps {
  userId: string;
  userName: string;
  formStatus: string | null;
}

export function ViewStarterFormDialog({ userId, userName, formStatus }: ViewStarterFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<StarterFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [marking, setMarking] = useState(false);

  const loadForm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/${userId}/starter-form`);
      if (!res.ok) {
        throw new Error("Failed to load form");
      }
      const data = await res.json();
      setForm(data);
    } catch {
      setError("Failed to load starter form");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !form) {
      loadForm();
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/team/${userId}/starter-form/pdf`);
      if (!res.ok) {
        throw new Error("Failed to generate PDF");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `starter-form-${userName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch {
      setError("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleMarkReviewed = async () => {
    setMarking(true);
    try {
      const res = await fetch(`/api/team/${userId}/starter-form/review`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to mark as reviewed");
      }
      const data = await res.json();
      setForm((prev) => prev ? { ...prev, ...data } : null);
      router.refresh();
    } catch {
      setError("Failed to mark as reviewed");
    } finally {
      setMarking(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return `£${amount.toFixed(2)}`;
  };

  const getRightToWorkLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      BRITISH_IRISH: "British/Irish Citizen",
      EU_SETTLED: "EU Settled Status",
      EU_PRE_SETTLED: "EU Pre-Settled Status",
      VISA: "Visa",
      OTHER: "Other",
    };
    return status ? labels[status] || status : "-";
  };

  const getStudentLoanLabel = (plan: string | null) => {
    const labels: Record<string, string> = {
      NONE: "None",
      PLAN_1: "Plan 1",
      PLAN_2: "Plan 2",
      PLAN_4: "Plan 4",
      POSTGRAD: "Postgraduate",
    };
    return plan ? labels[plan] || plan : "-";
  };

  // Don't show if no form submitted
  if (!formStatus || formStatus === "INCOMPLETE") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          View Form
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Starter Form - {userName}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <StarterFormStatusBadge status={formStatus} />
            {form?.submittedAt && (
              <span className="text-sm">
                Submitted {formatDate(form.submittedAt)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {form && !loading && (
          <div className="space-y-6">
            {/* Personal Details */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Personal Details</h4>
              <dl className="grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Full Name</dt>
                  <dd className="font-medium">
                    {[form.legalFirstName, form.legalMiddleName, form.legalLastName]
                      .filter(Boolean)
                      .join(" ") || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Date of Birth</dt>
                  <dd className="font-medium">{formatDate(form.dateOfBirth)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">NI Number</dt>
                  <dd className="font-medium font-mono">{form.nationalInsurance || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="font-medium">
                    {[form.addressLine1, form.addressLine2, form.city, form.county, form.postcode]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Bank Details */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Bank Details</h4>
              <dl className="grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Bank</dt>
                  <dd className="font-medium">{form.bankName || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Account Holder</dt>
                  <dd className="font-medium">{form.accountHolderName || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sort Code</dt>
                  <dd className="font-medium font-mono">{form.sortCode || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Account Number</dt>
                  <dd className="font-medium font-mono">{form.accountNumber || "-"}</dd>
                </div>
              </dl>
            </div>

            {/* Tax Information */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Tax Information</h4>
              <dl className="grid gap-2 text-sm md:grid-cols-2">
                {form.hasP45 ? (
                  <>
                    <div>
                      <dt className="text-muted-foreground">P45 Status</dt>
                      <dd className="font-medium">Has P45</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Previous Employer</dt>
                      <dd className="font-medium">{form.previousEmployer || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Leaving Date</dt>
                      <dd className="font-medium">{formatDate(form.p45LeavingDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Tax Code</dt>
                      <dd className="font-medium font-mono">{form.p45TaxCode || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Total Pay</dt>
                      <dd className="font-medium">{formatCurrency(form.p45TotalPay)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Total Tax</dt>
                      <dd className="font-medium">{formatCurrency(form.p45TotalTax)}</dd>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <dt className="text-muted-foreground">Starter Declaration</dt>
                    <dd className="font-medium">Statement {form.starterDeclaration || "-"}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Student Loan</dt>
                  <dd className="font-medium">{getStudentLoanLabel(form.studentLoanPlan)}</dd>
                </div>
              </dl>
            </div>

            {/* Emergency Contact */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Emergency Contact</h4>
              <dl className="grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Contact Name</dt>
                  <dd className="font-medium">{form.emergencyName || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Relationship</dt>
                  <dd className="font-medium">{form.emergencyRelationship || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{form.emergencyPhone || "-"}</dd>
                </div>
                {form.emergencyPhoneAlt && (
                  <div>
                    <dt className="text-muted-foreground">Alternative Phone</dt>
                    <dd className="font-medium">{form.emergencyPhoneAlt}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Right to Work */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Right to Work</h4>
              <dl className="grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">{getRightToWorkLabel(form.rightToWorkStatus)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Document Type</dt>
                  <dd className="font-medium">{form.rightToWorkDocType || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Document Reference</dt>
                  <dd className="font-medium font-mono">{form.rightToWorkDocRef || "-"}</dd>
                </div>
                {form.rightToWorkExpiry && (
                  <div>
                    <dt className="text-muted-foreground">Expiry Date</dt>
                    <dd className="font-medium">{formatDate(form.rightToWorkExpiry)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleDownloadPDF} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              {form.status === "SUBMITTED" && (
                <Button
                  variant="outline"
                  onClick={handleMarkReviewed}
                  disabled={marking}
                >
                  {marking ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark as Reviewed
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
