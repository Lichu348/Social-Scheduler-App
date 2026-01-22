"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";

interface StarterFormData {
  id?: string;
  status?: string;
  submittedAt?: string;
  // Personal Details
  legalFirstName: string;
  legalMiddleName: string;
  legalLastName: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postcode: string;
  nationalInsurance: string;
  // Bank Details
  bankName: string;
  accountHolderName: string;
  sortCode: string;
  accountNumber: string;
  // Tax Information
  hasP45: boolean;
  previousEmployer: string;
  p45LeavingDate: string;
  p45TaxCode: string;
  p45TotalPay: string;
  p45TotalTax: string;
  starterDeclaration: string;
  studentLoanPlan: string;
  // Emergency Contact
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyPhoneAlt: string;
  // Right to Work
  rightToWorkStatus: string;
  rightToWorkDocType: string;
  rightToWorkDocRef: string;
  rightToWorkExpiry: string;
}

const STEPS = [
  { id: 1, title: "Personal Details", description: "Your basic information" },
  { id: 2, title: "Bank Details", description: "Payment information" },
  { id: 3, title: "Tax Information", description: "P45 or new starter declaration" },
  { id: 4, title: "Emergency Contact", description: "Who to contact in emergency" },
  { id: 5, title: "Right to Work", description: "Work authorization" },
  { id: 6, title: "Review & Submit", description: "Check your details" },
];

const emptyFormData: StarterFormData = {
  legalFirstName: "",
  legalMiddleName: "",
  legalLastName: "",
  dateOfBirth: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  county: "",
  postcode: "",
  nationalInsurance: "",
  bankName: "",
  accountHolderName: "",
  sortCode: "",
  accountNumber: "",
  hasP45: false,
  previousEmployer: "",
  p45LeavingDate: "",
  p45TaxCode: "",
  p45TotalPay: "",
  p45TotalTax: "",
  starterDeclaration: "",
  studentLoanPlan: "NONE",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  emergencyPhoneAlt: "",
  rightToWorkStatus: "",
  rightToWorkDocType: "",
  rightToWorkDocRef: "",
  rightToWorkExpiry: "",
};

export function StarterForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StarterFormData>(emptyFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load existing form data
  useEffect(() => {
    async function loadForm() {
      try {
        const res = await fetch("/api/starter-form");
        if (res.ok) {
          const data = await res.json();
          setFormData({
            ...emptyFormData,
            ...data,
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "",
            p45LeavingDate: data.p45LeavingDate ? data.p45LeavingDate.split("T")[0] : "",
            rightToWorkExpiry: data.rightToWorkExpiry ? data.rightToWorkExpiry.split("T")[0] : "",
            p45TotalPay: data.p45TotalPay?.toString() || "",
            p45TotalTax: data.p45TotalTax?.toString() || "",
          });
        }
      } catch {
        setError("Failed to load form data");
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, []);

  // Auto-save on form data changes (debounced)
  const saveForm = useCallback(async (data: StarterFormData) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        p45TotalPay: data.p45TotalPay ? parseFloat(data.p45TotalPay) : null,
        p45TotalTax: data.p45TotalTax ? parseFloat(data.p45TotalTax) : null,
      };
      await fetch("/api/starter-form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Silent fail for auto-save
    } finally {
      setSaving(false);
    }
  }, []);

  // Debounce auto-save
  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      saveForm(formData);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [formData, loading, saveForm]);

  const updateField = (field: keyof StarterFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.legalFirstName) errors.legalFirstName = "First name is required";
      if (!formData.legalLastName) errors.legalLastName = "Last name is required";
      if (!formData.dateOfBirth) errors.dateOfBirth = "Date of birth is required";
      if (!formData.addressLine1) errors.addressLine1 = "Address is required";
      if (!formData.city) errors.city = "City is required";
      if (!formData.postcode) errors.postcode = "Postcode is required";
      if (!formData.nationalInsurance) {
        errors.nationalInsurance = "National Insurance number is required";
      } else {
        const niRegex = /^[A-Z]{2}[0-9]{6}[A-Z]$/;
        const cleanNI = formData.nationalInsurance.toUpperCase().replace(/[\s-]/g, "");
        if (!niRegex.test(cleanNI)) {
          errors.nationalInsurance = "Invalid format (e.g., AB123456C)";
        }
      }
    }

    if (step === 2) {
      if (!formData.bankName) errors.bankName = "Bank name is required";
      if (!formData.accountHolderName) errors.accountHolderName = "Account holder name is required";
      if (!formData.sortCode) {
        errors.sortCode = "Sort code is required";
      } else {
        const sortCodeRegex = /^[0-9]{2}-[0-9]{2}-[0-9]{2}$/;
        if (!sortCodeRegex.test(formData.sortCode)) {
          errors.sortCode = "Invalid format (use XX-XX-XX)";
        }
      }
      if (!formData.accountNumber) {
        errors.accountNumber = "Account number is required";
      } else {
        const accountRegex = /^[0-9]{8}$/;
        if (!accountRegex.test(formData.accountNumber)) {
          errors.accountNumber = "Must be 8 digits";
        }
      }
    }

    if (step === 3) {
      if (formData.hasP45) {
        if (!formData.previousEmployer) errors.previousEmployer = "Previous employer is required";
        if (!formData.p45LeavingDate) errors.p45LeavingDate = "Leaving date is required";
        if (!formData.p45TaxCode) errors.p45TaxCode = "Tax code is required";
        if (!formData.p45TotalPay) errors.p45TotalPay = "Total pay is required";
        if (!formData.p45TotalTax) errors.p45TotalTax = "Total tax is required";
      } else {
        if (!formData.starterDeclaration) errors.starterDeclaration = "Please select a statement";
      }
    }

    if (step === 4) {
      if (!formData.emergencyName) errors.emergencyName = "Contact name is required";
      if (!formData.emergencyRelationship) errors.emergencyRelationship = "Relationship is required";
      if (!formData.emergencyPhone) errors.emergencyPhone = "Phone number is required";
    }

    if (step === 5) {
      if (!formData.rightToWorkStatus) errors.rightToWorkStatus = "Status is required";
      if (!formData.rightToWorkDocType) errors.rightToWorkDocType = "Document type is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Save final data first
      await saveForm(formData);

      const res = await fetch("/api/starter-form/submit", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit form");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const formatSortCode = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  };

  const getCompletionPercentage = (): number => {
    const requiredFields = [
      formData.legalFirstName,
      formData.legalLastName,
      formData.dateOfBirth,
      formData.addressLine1,
      formData.city,
      formData.postcode,
      formData.nationalInsurance,
      formData.bankName,
      formData.accountHolderName,
      formData.sortCode,
      formData.accountNumber,
      formData.emergencyName,
      formData.emergencyRelationship,
      formData.emergencyPhone,
      formData.rightToWorkStatus,
      formData.rightToWorkDocType,
    ];

    // Add P45 or starter declaration
    if (formData.hasP45) {
      requiredFields.push(
        formData.previousEmployer,
        formData.p45LeavingDate,
        formData.p45TaxCode,
        formData.p45TotalPay,
        formData.p45TotalTax
      );
    } else {
      requiredFields.push(formData.starterDeclaration);
    }

    const completed = requiredFields.filter(Boolean).length;
    return Math.round((completed / requiredFields.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (formData.status === "SUBMITTED" || formData.status === "REVIEWED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Form Submitted
          </CardTitle>
          <CardDescription>
            Your starter form was submitted on{" "}
            {formData.submittedAt
              ? new Date(formData.submittedAt).toLocaleDateString("en-GB")
              : "unknown date"}
            {formData.status === "REVIEWED" && " and has been reviewed by your manager"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            If you need to make changes, please contact your manager.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{getCompletionPercentage()}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "flex flex-col items-center gap-1 text-xs transition-colors",
                  currentStep === step.id
                    ? "text-primary"
                    : currentStep > step.id
                    ? "text-green-600"
                    : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                    currentStep === step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep > step.id
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span className="hidden md:block">{step.title}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Auto-save indicator */}
      {saving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Personal Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="legalFirstName">First Name *</Label>
                  <Input
                    id="legalFirstName"
                    value={formData.legalFirstName}
                    onChange={(e) => updateField("legalFirstName", e.target.value)}
                    className={validationErrors.legalFirstName ? "border-destructive" : ""}
                  />
                  {validationErrors.legalFirstName && (
                    <p className="text-xs text-destructive">{validationErrors.legalFirstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalMiddleName">Middle Name</Label>
                  <Input
                    id="legalMiddleName"
                    value={formData.legalMiddleName}
                    onChange={(e) => updateField("legalMiddleName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalLastName">Last Name *</Label>
                  <Input
                    id="legalLastName"
                    value={formData.legalLastName}
                    onChange={(e) => updateField("legalLastName", e.target.value)}
                    className={validationErrors.legalLastName ? "border-destructive" : ""}
                  />
                  {validationErrors.legalLastName && (
                    <p className="text-xs text-destructive">{validationErrors.legalLastName}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                    className={validationErrors.dateOfBirth ? "border-destructive" : ""}
                  />
                  {validationErrors.dateOfBirth && (
                    <p className="text-xs text-destructive">{validationErrors.dateOfBirth}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationalInsurance">National Insurance Number *</Label>
                  <Input
                    id="nationalInsurance"
                    value={formData.nationalInsurance}
                    onChange={(e) => updateField("nationalInsurance", e.target.value.toUpperCase())}
                    placeholder="AB123456C"
                    className={validationErrors.nationalInsurance ? "border-destructive" : ""}
                  />
                  {validationErrors.nationalInsurance && (
                    <p className="text-xs text-destructive">{validationErrors.nationalInsurance}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => updateField("addressLine1", e.target.value)}
                  className={validationErrors.addressLine1 ? "border-destructive" : ""}
                />
                {validationErrors.addressLine1 && (
                  <p className="text-xs text-destructive">{validationErrors.addressLine1}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className={validationErrors.city ? "border-destructive" : ""}
                  />
                  {validationErrors.city && (
                    <p className="text-xs text-destructive">{validationErrors.city}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={formData.county}
                    onChange={(e) => updateField("county", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input
                    id="postcode"
                    value={formData.postcode}
                    onChange={(e) => updateField("postcode", e.target.value.toUpperCase())}
                    className={validationErrors.postcode ? "border-destructive" : ""}
                  />
                  {validationErrors.postcode && (
                    <p className="text-xs text-destructive">{validationErrors.postcode}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Bank Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => updateField("bankName", e.target.value)}
                  placeholder="e.g., Barclays, HSBC, Lloyds"
                  className={validationErrors.bankName ? "border-destructive" : ""}
                />
                {validationErrors.bankName && (
                  <p className="text-xs text-destructive">{validationErrors.bankName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                <Input
                  id="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={(e) => updateField("accountHolderName", e.target.value)}
                  placeholder="Name as shown on your bank account"
                  className={validationErrors.accountHolderName ? "border-destructive" : ""}
                />
                {validationErrors.accountHolderName && (
                  <p className="text-xs text-destructive">{validationErrors.accountHolderName}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sortCode">Sort Code *</Label>
                  <Input
                    id="sortCode"
                    value={formData.sortCode}
                    onChange={(e) => updateField("sortCode", formatSortCode(e.target.value))}
                    placeholder="XX-XX-XX"
                    maxLength={8}
                    className={validationErrors.sortCode ? "border-destructive" : ""}
                  />
                  {validationErrors.sortCode && (
                    <p className="text-xs text-destructive">{validationErrors.sortCode}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => updateField("accountNumber", e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="8 digits"
                    maxLength={8}
                    className={validationErrors.accountNumber ? "border-destructive" : ""}
                  />
                  {validationErrors.accountNumber && (
                    <p className="text-xs text-destructive">{validationErrors.accountNumber}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Tax Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasP45"
                  checked={formData.hasP45}
                  onCheckedChange={(checked) => updateField("hasP45", checked === true)}
                />
                <Label htmlFor="hasP45" className="font-normal">
                  I have a P45 from my previous employer
                </Label>
              </div>

              {formData.hasP45 ? (
                <div className="space-y-4 border-l-2 border-muted pl-4">
                  <h4 className="font-medium">P45 Details</h4>
                  <div className="space-y-2">
                    <Label htmlFor="previousEmployer">Previous Employer Name *</Label>
                    <Input
                      id="previousEmployer"
                      value={formData.previousEmployer}
                      onChange={(e) => updateField("previousEmployer", e.target.value)}
                      className={validationErrors.previousEmployer ? "border-destructive" : ""}
                    />
                    {validationErrors.previousEmployer && (
                      <p className="text-xs text-destructive">{validationErrors.previousEmployer}</p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="p45LeavingDate">Leaving Date *</Label>
                      <Input
                        id="p45LeavingDate"
                        type="date"
                        value={formData.p45LeavingDate}
                        onChange={(e) => updateField("p45LeavingDate", e.target.value)}
                        className={validationErrors.p45LeavingDate ? "border-destructive" : ""}
                      />
                      {validationErrors.p45LeavingDate && (
                        <p className="text-xs text-destructive">{validationErrors.p45LeavingDate}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p45TaxCode">Tax Code *</Label>
                      <Input
                        id="p45TaxCode"
                        value={formData.p45TaxCode}
                        onChange={(e) => updateField("p45TaxCode", e.target.value.toUpperCase())}
                        placeholder="e.g., 1257L"
                        className={validationErrors.p45TaxCode ? "border-destructive" : ""}
                      />
                      {validationErrors.p45TaxCode && (
                        <p className="text-xs text-destructive">{validationErrors.p45TaxCode}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="p45TotalPay">Total Pay to Date (£) *</Label>
                      <Input
                        id="p45TotalPay"
                        type="number"
                        step="0.01"
                        value={formData.p45TotalPay}
                        onChange={(e) => updateField("p45TotalPay", e.target.value)}
                        className={validationErrors.p45TotalPay ? "border-destructive" : ""}
                      />
                      {validationErrors.p45TotalPay && (
                        <p className="text-xs text-destructive">{validationErrors.p45TotalPay}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p45TotalTax">Total Tax to Date (£) *</Label>
                      <Input
                        id="p45TotalTax"
                        type="number"
                        step="0.01"
                        value={formData.p45TotalTax}
                        onChange={(e) => updateField("p45TotalTax", e.target.value)}
                        className={validationErrors.p45TotalTax ? "border-destructive" : ""}
                      />
                      {validationErrors.p45TotalTax && (
                        <p className="text-xs text-destructive">{validationErrors.p45TotalTax}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 border-l-2 border-muted pl-4">
                  <h4 className="font-medium">New Starter Declaration</h4>
                  <p className="text-sm text-muted-foreground">
                    As you don&apos;t have a P45, please select the statement that applies to you:
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                      <input
                        type="radio"
                        name="starterDeclaration"
                        value="A"
                        checked={formData.starterDeclaration === "A"}
                        onChange={(e) => updateField("starterDeclaration", e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium">Statement A</p>
                        <p className="text-sm text-muted-foreground">
                          This is my first job since 6 April and I have not been receiving taxable
                          Jobseeker&apos;s Allowance, Employment and Support Allowance, taxable Incapacity
                          Benefit, State or Occupational Pension.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                      <input
                        type="radio"
                        name="starterDeclaration"
                        value="B"
                        checked={formData.starterDeclaration === "B"}
                        onChange={(e) => updateField("starterDeclaration", e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium">Statement B</p>
                        <p className="text-sm text-muted-foreground">
                          This is now my only job, but since 6 April I have had another job, or received
                          taxable Jobseeker&apos;s Allowance, Employment and Support Allowance or taxable
                          Incapacity Benefit. I do not receive a State or Occupational Pension.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                      <input
                        type="radio"
                        name="starterDeclaration"
                        value="C"
                        checked={formData.starterDeclaration === "C"}
                        onChange={(e) => updateField("starterDeclaration", e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium">Statement C</p>
                        <p className="text-sm text-muted-foreground">
                          I have another job or receive a State or Occupational Pension.
                        </p>
                      </div>
                    </label>
                  </div>
                  {validationErrors.starterDeclaration && (
                    <p className="text-xs text-destructive">{validationErrors.starterDeclaration}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="studentLoanPlan">Student Loan Plan</Label>
                <Select
                  id="studentLoanPlan"
                  value={formData.studentLoanPlan}
                  onChange={(e) => updateField("studentLoanPlan", e.target.value)}
                  options={[
                    { value: "NONE", label: "None" },
                    { value: "PLAN_1", label: "Plan 1 (started before Sept 2012)" },
                    { value: "PLAN_2", label: "Plan 2 (started Sept 2012 or later)" },
                    { value: "PLAN_4", label: "Plan 4 (Scotland)" },
                    { value: "POSTGRAD", label: "Postgraduate Loan" },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Step 4: Emergency Contact */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Contact Name *</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyName}
                  onChange={(e) => updateField("emergencyName", e.target.value)}
                  className={validationErrors.emergencyName ? "border-destructive" : ""}
                />
                {validationErrors.emergencyName && (
                  <p className="text-xs text-destructive">{validationErrors.emergencyName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Relationship *</Label>
                <Input
                  id="emergencyRelationship"
                  value={formData.emergencyRelationship}
                  onChange={(e) => updateField("emergencyRelationship", e.target.value)}
                  placeholder="e.g., Parent, Spouse, Partner"
                  className={validationErrors.emergencyRelationship ? "border-destructive" : ""}
                />
                {validationErrors.emergencyRelationship && (
                  <p className="text-xs text-destructive">{validationErrors.emergencyRelationship}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Phone Number *</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) => updateField("emergencyPhone", e.target.value)}
                    className={validationErrors.emergencyPhone ? "border-destructive" : ""}
                  />
                  {validationErrors.emergencyPhone && (
                    <p className="text-xs text-destructive">{validationErrors.emergencyPhone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhoneAlt">Alternative Phone</Label>
                  <Input
                    id="emergencyPhoneAlt"
                    type="tel"
                    value={formData.emergencyPhoneAlt}
                    onChange={(e) => updateField("emergencyPhoneAlt", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Right to Work */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rightToWorkStatus">Right to Work Status *</Label>
                <Select
                  id="rightToWorkStatus"
                  value={formData.rightToWorkStatus}
                  onChange={(e) => updateField("rightToWorkStatus", e.target.value)}
                  className={validationErrors.rightToWorkStatus ? "border-destructive" : ""}
                  placeholder="Select your status"
                  options={[
                    { value: "BRITISH_IRISH", label: "British/Irish Citizen" },
                    { value: "EU_SETTLED", label: "EU Settled Status" },
                    { value: "EU_PRE_SETTLED", label: "EU Pre-Settled Status" },
                    { value: "VISA", label: "Visa" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
                {validationErrors.rightToWorkStatus && (
                  <p className="text-xs text-destructive">{validationErrors.rightToWorkStatus}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rightToWorkDocType">Document Type Provided *</Label>
                <Input
                  id="rightToWorkDocType"
                  value={formData.rightToWorkDocType}
                  onChange={(e) => updateField("rightToWorkDocType", e.target.value)}
                  placeholder="e.g., Passport, Share Code, BRP"
                  className={validationErrors.rightToWorkDocType ? "border-destructive" : ""}
                />
                {validationErrors.rightToWorkDocType && (
                  <p className="text-xs text-destructive">{validationErrors.rightToWorkDocType}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rightToWorkDocRef">Document Reference/Number</Label>
                <Input
                  id="rightToWorkDocRef"
                  value={formData.rightToWorkDocRef}
                  onChange={(e) => updateField("rightToWorkDocRef", e.target.value)}
                  placeholder="e.g., Passport number, Share code"
                />
              </div>

              {formData.rightToWorkStatus &&
                formData.rightToWorkStatus !== "BRITISH_IRISH" && (
                  <div className="space-y-2">
                    <Label htmlFor="rightToWorkExpiry">Expiry Date</Label>
                    <Input
                      id="rightToWorkExpiry"
                      type="date"
                      value={formData.rightToWorkExpiry}
                      onChange={(e) => updateField("rightToWorkExpiry", e.target.value)}
                    />
                  </div>
                )}
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Please review your information before submitting. Once submitted, you will not be
                able to make changes without contacting your manager.
              </p>

              {/* Personal Details Summary */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Personal Details</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd>
                      {[formData.legalFirstName, formData.legalMiddleName, formData.legalLastName]
                        .filter(Boolean)
                        .join(" ")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Date of Birth:</dt>
                    <dd>{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-GB") : "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">NI Number:</dt>
                    <dd>{formData.nationalInsurance || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Address:</dt>
                    <dd className="text-right">
                      {[formData.addressLine1, formData.city, formData.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Bank Details Summary */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Bank Details</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Bank:</dt>
                    <dd>{formData.bankName || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Account Holder:</dt>
                    <dd>{formData.accountHolderName || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Sort Code:</dt>
                    <dd>{formData.sortCode || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Account Number:</dt>
                    <dd>{formData.accountNumber || "-"}</dd>
                  </div>
                </dl>
              </div>

              {/* Tax Information Summary */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Tax Information</h4>
                <dl className="grid gap-2 text-sm">
                  {formData.hasP45 ? (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">P45:</dt>
                        <dd>Yes</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Previous Employer:</dt>
                        <dd>{formData.previousEmployer || "-"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Tax Code:</dt>
                        <dd>{formData.p45TaxCode || "-"}</dd>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Starter Declaration:</dt>
                      <dd>Statement {formData.starterDeclaration || "-"}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Student Loan:</dt>
                    <dd>
                      {formData.studentLoanPlan === "NONE"
                        ? "None"
                        : formData.studentLoanPlan?.replace("_", " ")}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Emergency Contact Summary */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Emergency Contact</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd>{formData.emergencyName || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Relationship:</dt>
                    <dd>{formData.emergencyRelationship || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Phone:</dt>
                    <dd>{formData.emergencyPhone || "-"}</dd>
                  </div>
                </dl>
              </div>

              {/* Right to Work Summary */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Right to Work</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd>
                      {formData.rightToWorkStatus
                        ?.replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase()) || "-"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Document Type:</dt>
                    <dd>{formData.rightToWorkDocType || "-"}</dd>
                  </div>
                  {formData.rightToWorkExpiry && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Expiry Date:</dt>
                      <dd>{new Date(formData.rightToWorkExpiry).toLocaleDateString("en-GB")}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || getCompletionPercentage() < 100}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Submit Form
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
