"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Plus, Trash2, AlertTriangle } from "lucide-react";

interface CertificationType {
  id: string;
  name: string;
  description: string | null;
  validityMonths: number;
  isRequired: boolean;
  _count: {
    certifications: number;
  };
}

interface UserCertification {
  id: string;
  issueDate: string;
  expiryDate: string | null;
  status: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  certificationType: {
    name: string;
  };
  user: {
    id: string;
    name: string;
    staffRole: string;
  };
}

export function CertificationsManager() {
  const router = useRouter();
  const [certTypes, setCertTypes] = useState<CertificationType[]>([]);
  const [userCerts, setUserCerts] = useState<UserCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    validityMonths: 12,
    isRequired: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [typesRes, certsRes] = await Promise.all([
        fetch("/api/certifications"),
        fetch("/api/certifications/user"),
      ]);
      if (typesRes.ok) setCertTypes(await typesRes.json());
      if (certsRes.ok) setUserCerts(await certsRes.json());
    } catch (error) {
      console.error("Failed to fetch certifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setFormData({ name: "", description: "", validityMonths: 12, isRequired: false });
        setShowForm(false);
        fetchData();
        router.refresh();
      } else {
        setError(data.error || "Failed to create certification type");
      }
    } catch (error) {
      console.error("Failed to create certification type:", error);
      setError("Failed to create certification type");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this certification type?")) return;
    try {
      const res = await fetch(`/api/certifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete certification type:", error);
    }
  };

  const expiredCount = userCerts.filter((c) => c.isExpired).length;
  const expiringSoonCount = userCerts.filter((c) => c.isExpiringSoon).length;

  if (loading) {
    return <div className="text-center py-4">Loading certifications...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <div className="flex gap-4">
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {expiredCount} expired
            </div>
          )}
          {expiringSoonCount > 0 && (
            <div className="flex items-center gap-2 text-yellow-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {expiringSoonCount} expiring soon
            </div>
          )}
        </div>
      )}

      {/* Certification Types */}
      <div>
        <h4 className="font-medium mb-3">Certification Types</h4>
        {certTypes.length === 0 && !showForm ? (
          <p className="text-muted-foreground text-sm">No certification types configured yet.</p>
        ) : (
          <div className="space-y-2">
            {certTypes.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{type.name}</span>
                    {type.isRequired && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Required</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Valid for {type.validityMonths} months • {type._count.certifications} issued
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(type.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg mt-3">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="certName">Certification Name</Label>
              <Input
                id="certName"
                placeholder="First Aid Level 2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certDesc">Description (optional)</Label>
              <Input
                id="certDesc"
                placeholder="St John's Ambulance certification"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validity">Validity Period (months)</Label>
              <Input
                id="validity"
                type="number"
                min="1"
                max="120"
                value={formData.validityMonths}
                onChange={(e) => setFormData({ ...formData, validityMonths: parseInt(e.target.value) || 12 })}
                className="w-24"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRequired"
                checked={formData.isRequired}
                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isRequired" className="font-normal">Required for employment</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Add Certification Type"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Certification Type
          </Button>
        )}
      </div>

      {/* Recent/Expiring Certifications */}
      {userCerts.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Staff Certifications</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {userCerts.slice(0, 10).map((cert) => (
              <div
                key={cert.id}
                className={`p-3 border rounded-lg ${
                  cert.isExpired ? "border-red-200 bg-red-50" : cert.isExpiringSoon ? "border-yellow-200 bg-yellow-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{cert.user.name}</span>
                    <span className="text-muted-foreground"> - {cert.certificationType.name}</span>
                  </div>
                  {cert.isExpired && <span className="text-xs text-red-600 font-medium">Expired</span>}
                  {cert.isExpiringSoon && <span className="text-xs text-yellow-600 font-medium">Expiring soon</span>}
                </div>
                {cert.expiryDate && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
