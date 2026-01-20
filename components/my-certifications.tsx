"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle, PenLine, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserCertification {
  id: string;
  issueDate: string;
  expiryDate: string | null;
  certificateNumber: string | null;
  status: string;
  staffSignature: string | null;
  staffSignedAt: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isSigned: boolean;
  certificationType: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface MyCertificationsProps {
  userId: string;
}

export function MyCertifications({ userId }: MyCertificationsProps) {
  const router = useRouter();
  const [certifications, setCertifications] = useState<UserCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [selectedCert, setSelectedCert] = useState<UserCertification | null>(null);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCertifications();
  }, [userId]);

  const fetchCertifications = async () => {
    try {
      const res = await fetch(`/api/certifications/user?userId=${userId}`);
      if (res.ok) {
        setCertifications(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch certifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!selectedCert || !signature.trim()) return;

    setSigning(true);
    setError(null);

    try {
      const res = await fetch("/api/certifications/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificationId: selectedCert.id,
          signature: signature.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSelectedCert(null);
        setSignature("");
        fetchCertifications();
        router.refresh();
      } else {
        setError(data.error || "Failed to sign certification");
      }
    } catch (error) {
      console.error("Failed to sign certification:", error);
      setError("Failed to sign certification");
    } finally {
      setSigning(false);
    }
  };

  const unsignedCount = certifications.filter((c) => !c.isSigned).length;

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading certifications...</div>;
  }

  if (certifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>You don't have any certifications yet.</p>
        <p className="text-sm mt-1">Your manager will add certifications when applicable.</p>
      </div>
    );
  }

  return (
    <>
      {/* Summary alert */}
      {unsignedCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <PenLine className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">
            You have <strong>{unsignedCount}</strong> certification{unsignedCount > 1 ? "s" : ""} awaiting your signature
          </span>
        </div>
      )}

      <div className="space-y-3">
        {certifications.map((cert) => (
          <div
            key={cert.id}
            className={`p-4 border rounded-lg ${
              cert.isExpired
                ? "border-red-200 bg-red-50"
                : cert.isExpiringSoon
                ? "border-yellow-200 bg-yellow-50"
                : !cert.isSigned
                ? "border-blue-200 bg-blue-50"
                : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Award
                  className={`h-5 w-5 mt-0.5 ${
                    cert.isExpired
                      ? "text-red-500"
                      : cert.isExpiringSoon
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
                <div>
                  <p className="font-medium">{cert.certificationType.name}</p>
                  {cert.certificationType.description && (
                    <p className="text-sm text-muted-foreground">{cert.certificationType.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                    {cert.expiryDate && (
                      <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  {cert.certificateNumber && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Certificate #: {cert.certificateNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {cert.isExpired ? (
                  <Badge variant="destructive">Expired</Badge>
                ) : cert.isExpiringSoon ? (
                  <Badge className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>
                ) : (
                  <Badge variant="outline">Active</Badge>
                )}

                {cert.isSigned ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Signed</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedCert(cert)}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <PenLine className="h-3 w-3 mr-1" />
                    Sign
                  </Button>
                )}
              </div>
            </div>

            {cert.isSigned && cert.staffSignedAt && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Signed by you on {new Date(cert.staffSignedAt).toLocaleDateString()} as "{cert.staffSignature}"
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Signature Dialog */}
      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Certification</DialogTitle>
            <DialogDescription>
              By signing, you acknowledge that you have received and understand the requirements for this certification.
            </DialogDescription>
          </DialogHeader>

          {selectedCert && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedCert.certificationType.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Issued: {new Date(selectedCert.issueDate).toLocaleDateString()}
                  {selectedCert.expiryDate && (
                    <> | Expires: {new Date(selectedCert.expiryDate).toLocaleDateString()}</>
                  )}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="signature">Type your full name to sign</Label>
                <Input
                  id="signature"
                  placeholder="Enter your full name"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  This serves as your electronic signature
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCert(null)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={signing || !signature.trim()}>
              {signing ? "Signing..." : "Sign Certification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
