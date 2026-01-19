"use client";

import { useState } from "react";
import { TrainingDocumentCard } from "@/components/training-document-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TrainingDocument {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  validityMonths: number;
  isRequired: boolean;
  requiredForRoles: string[];
  createdAt: Date;
  userSignoff: {
    signedAt: Date;
    expiresAt: Date;
  } | null;
  signoffStatus: "not_signed" | "signed" | "expired";
  isRequiredForUser: boolean;
  totalSignoffs: number;
}

interface TrainingDocumentsListProps {
  documents: TrainingDocument[];
  userStaffRole: string;
  isAdmin: boolean;
}

export function TrainingDocumentsList({
  documents,
  userStaffRole,
  isAdmin,
}: TrainingDocumentsListProps) {
  const [activeTab, setActiveTab] = useState("required");

  const requiredDocs = documents.filter((d) => d.isRequiredForUser);
  const optionalDocs = documents.filter((d) => !d.isRequiredForUser);
  const needsAttention = documents.filter(
    (d) => d.isRequiredForUser && (d.signoffStatus === "not_signed" || d.signoffStatus === "expired")
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="required" className="relative">
          Required
          {needsAttention.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
              {needsAttention.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="optional">Optional</TabsTrigger>
        <TabsTrigger value="all">All Documents</TabsTrigger>
      </TabsList>

      <TabsContent value="required" className="space-y-4">
        {requiredDocs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No required training documents for your role ({userStaffRole})
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requiredDocs.map((doc) => (
              <TrainingDocumentCard
                key={doc.id}
                document={doc}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="optional" className="space-y-4">
        {optionalDocs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No optional training documents available
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {optionalDocs.map((doc) => (
              <TrainingDocumentCard
                key={doc.id}
                document={doc}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="all" className="space-y-4">
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No training documents available
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <TrainingDocumentCard
                key={doc.id}
                document={doc}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
