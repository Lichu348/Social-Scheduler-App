import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TrainingDocumentsList } from "@/components/training-documents-list";
import { UploadTrainingDialog } from "@/components/upload-training-dialog";

export default async function TrainingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  // Get user's staff role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { staffRole: true },
  });

  // Get all active training documents with signoff status
  const documents = await prisma.trainingDocument.findMany({
    where: {
      organizationId: session.user.organizationId,
      isActive: true,
    },
    include: {
      signoffs: {
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
          signedAt: true,
          expiresAt: true,
        },
      },
      _count: {
        select: {
          signoffs: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Process documents with status
  const now = new Date();
  const processedDocuments = documents.map((doc) => {
    const userSignoff = doc.signoffs[0];
    const requiredRoles: string[] = JSON.parse(doc.requiredForRoles || "[]");
    const isRequiredForUser = requiredRoles.length === 0 || requiredRoles.includes(user?.staffRole || "");

    let signoffStatus: "not_signed" | "signed" | "expired" = "not_signed";
    if (userSignoff) {
      signoffStatus = userSignoff.expiresAt < now ? "expired" : "signed";
    }

    return {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      validityMonths: doc.validityMonths,
      isRequired: doc.isRequired,
      requiredForRoles: requiredRoles,
      createdAt: doc.createdAt,
      userSignoff: userSignoff ? {
        signedAt: userSignoff.signedAt,
        expiresAt: userSignoff.expiresAt,
      } : null,
      signoffStatus,
      isRequiredForUser,
      totalSignoffs: doc._count.signoffs,
    };
  });

  // Calculate summary stats
  const requiredDocs = processedDocuments.filter((d) => d.isRequiredForUser);
  const needsAttention = requiredDocs.filter(
    (d) => d.signoffStatus === "not_signed" || d.signoffStatus === "expired"
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Training Documents</h1>
          <p className="text-muted-foreground">
            View and sign off on required training documents
          </p>
        </div>
        {isAdmin && <UploadTrainingDialog />}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="p-4 border rounded-lg bg-card">
          <p className="text-sm text-muted-foreground">Total Documents</p>
          <p className="text-2xl font-bold">{processedDocuments.length}</p>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <p className="text-sm text-muted-foreground">Required for You</p>
          <p className="text-2xl font-bold">{requiredDocs.length}</p>
        </div>
        <div className={`p-4 border rounded-lg ${needsAttention.length > 0 ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"}`}>
          <p className="text-sm text-muted-foreground">Needs Attention</p>
          <p className="text-2xl font-bold">{needsAttention.length}</p>
        </div>
      </div>

      <TrainingDocumentsList
        documents={processedDocuments}
        userStaffRole={user?.staffRole || "DESK"}
        isAdmin={isAdmin}
      />
    </div>
  );
}
