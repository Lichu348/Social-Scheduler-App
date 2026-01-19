"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileUp, X } from "lucide-react";

const STAFF_ROLES = ["DESK", "COACH", "SETTER", "INSTRUCTOR"];

export function UploadTrainingDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    validityMonths: "12",
    isRequired: false,
    requiredForRoles: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Please upload a PDF, DOC, DOCX, JPG, or PNG file.");
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File too large. Maximum size is 10MB.");
        return;
      }

      setFile(selectedFile);
      setError(null);

      // Auto-fill title if empty
      if (!formData.title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setFormData((prev) => ({ ...prev, title: fileName }));
      }
    }
  };

  const handleRoleToggle = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      requiredForRoles: prev.requiredForRoles.includes(role)
        ? prev.requiredForRoles.filter((r) => r !== role)
        : [...prev.requiredForRoles, role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Upload file
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadRes = await fetch("/api/training/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || "Failed to upload file");
      }

      const { fileUrl, fileName } = await uploadRes.json();

      // 2. Create training document record
      const createRes = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          fileUrl,
          fileName,
          validityMonths: parseInt(formData.validityMonths) || 12,
          isRequired: formData.isRequired,
          requiredForRoles: formData.requiredForRoles,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "Failed to create training document");
      }

      // Success - reset and close
      setOpen(false);
      setFile(null);
      setFormData({
        title: "",
        description: "",
        validityMonths: "12",
        isRequired: false,
        requiredForRoles: [],
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Training Document</DialogTitle>
          <DialogDescription>
            Upload a new training document for staff to review and sign off on.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>Document File</Label>
              {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload PDF, DOC, DOCX, JPG, or PNG
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Max file size: 10MB
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Fire Safety Training"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the training content..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Validity Period */}
            <div className="space-y-2">
              <Label htmlFor="validityMonths">Validity Period (months)</Label>
              <Input
                id="validityMonths"
                type="number"
                min="1"
                max="120"
                value={formData.validityMonths}
                onChange={(e) => setFormData((prev) => ({ ...prev, validityMonths: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Staff must re-sign after this period expires
              </p>
            </div>

            {/* Is Required */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isRequired: checked === true }))
                }
              />
              <Label htmlFor="isRequired" className="font-normal">
                Mark as required training
              </Label>
            </div>

            {/* Required For Roles */}
            <div className="space-y-2">
              <Label>Required for specific roles (optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Leave unchecked to require for all staff
              </p>
              <div className="flex flex-wrap gap-2">
                {STAFF_ROLES.map((role) => (
                  <label
                    key={role}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors ${
                      formData.requiredForRoles.includes(role)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.requiredForRoles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                    />
                    <span className="text-sm">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
