"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface User {
  id: string;
  name: string;
  staffRole: string;
}

interface CertType {
  id: string;
  name: string;
  validityMonths: number;
}

interface AddUserCertificationFormProps {
  users: User[];
  certTypes: CertType[];
}

export function AddUserCertificationForm({ users, certTypes }: AddUserCertificationFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    userId: "",
    certificationTypeId: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    certificateNumber: "",
  });

  const handleCertTypeChange = (certTypeId: string) => {
    const certType = certTypes.find((c) => c.id === certTypeId);
    let expiryDate = "";
    if (certType && formData.issueDate) {
      const issue = new Date(formData.issueDate);
      issue.setMonth(issue.getMonth() + certType.validityMonths);
      expiryDate = issue.toISOString().split("T")[0];
    }
    setFormData({ ...formData, certificationTypeId: certTypeId, expiryDate });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/certifications/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: formData.userId,
          certificationTypeId: formData.certificationTypeId,
          issueDate: formData.issueDate,
          expiryDate: formData.expiryDate || null,
          certificateNumber: formData.certificateNumber || null,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setFormData({
          userId: "",
          certificationTypeId: "",
          issueDate: new Date().toISOString().split("T")[0],
          expiryDate: "",
          certificateNumber: "",
        });
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add certification");
      }
    } catch (err) {
      setError("Failed to add certification");
    } finally {
      setSaving(false);
    }
  };

  if (certTypes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Create certification types first before adding staff certifications.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
          Certification added successfully
        </div>
      )}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="user">Staff Member</Label>
        <Select
          id="user"
          options={[
            { value: "", label: "Select staff member..." },
            ...users.map((u) => ({ value: u.id, label: u.name })),
          ]}
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="certType">Certification Type</Label>
        <Select
          id="certType"
          options={[
            { value: "", label: "Select certification..." },
            ...certTypes.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={formData.certificationTypeId}
          onChange={(e) => handleCertTypeChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue Date</Label>
          <Input
            id="issueDate"
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry Date</Label>
          <Input
            id="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="certNumber">Certificate Number (optional)</Label>
        <Input
          id="certNumber"
          placeholder="e.g., FA-2024-12345"
          value={formData.certificateNumber}
          onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
        />
      </div>

      <Button type="submit" disabled={saving || !formData.userId || !formData.certificationTypeId}>
        {saving ? "Adding..." : "Add Certification"}
      </Button>
    </form>
  );
}
