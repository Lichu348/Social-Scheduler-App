import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CertificationsManager } from "@/components/certifications-manager";
import { AddUserCertificationForm } from "@/components/add-user-certification-form";
import { MyCertifications } from "@/components/my-certifications";
import { Award, AlertTriangle, CheckCircle, PenLine } from "lucide-react";

async function getCertificationsData(organizationId: string) {
  const [certTypes, userCerts, users] = await Promise.all([
    prisma.certificationType.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.userCertification.findMany({
      where: { user: { organizationId } },
      include: {
        certificationType: true,
        user: { select: { id: true, name: true, staffRole: true } },
      },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true, staffRole: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const now = new Date();
  const certsWithStatus = userCerts.map((cert) => ({
    ...cert,
    isExpired: cert.expiryDate ? cert.expiryDate < now : false,
    isExpiringSoon: cert.expiryDate
      ? cert.expiryDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && cert.expiryDate >= now
      : false,
    isSigned: !!cert.staffSignedAt,
  }));

  return { certTypes, userCerts: certsWithStatus, users };
}

export default async function CertificationsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const isAdmin = session.user.role === "ADMIN";
  const isManager = session.user.role === "MANAGER" || isAdmin;

  const { certTypes, userCerts, users } = await getCertificationsData(session.user.organizationId);

  const expiredCount = userCerts.filter((c) => c.isExpired).length;
  const expiringSoonCount = userCerts.filter((c) => c.isExpiringSoon).length;
  const unsignedCount = userCerts.filter((c) => !c.isSigned).length;

  // Staff view - show only their certifications
  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Certifications</h1>
          <p className="text-muted-foreground mt-1">
            View and sign your certifications
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Certifications</CardTitle>
            <CardDescription>
              Review your certifications and sign to acknowledge receipt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MyCertifications userId={session.user.id} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin view - full management
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Certifications</h1>
        <p className="text-muted-foreground mt-1">
          Manage certification types and track staff qualifications
        </p>
      </div>

      {/* Alerts */}
      {(expiredCount > 0 || expiringSoonCount > 0 || unsignedCount > 0) && (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {expiredCount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 pt-6">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">{expiredCount} Expired</p>
                  <p className="text-sm text-red-600">Need renewal</p>
                </div>
              </CardContent>
            </Card>
          )}
          {expiringSoonCount > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="flex items-center gap-3 pt-6">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">{expiringSoonCount} Expiring Soon</p>
                  <p className="text-sm text-yellow-600">Within 30 days</p>
                </div>
              </CardContent>
            </Card>
          )}
          {unsignedCount > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="flex items-center gap-3 pt-6">
                <PenLine className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">{unsignedCount} Unsigned</p>
                  <p className="text-sm text-blue-600">Awaiting staff signature</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Certification Types */}
        <Card>
          <CardHeader>
            <CardTitle>Certification Types</CardTitle>
            <CardDescription>
              Define the certifications your organization tracks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CertificationsManager />
          </CardContent>
        </Card>

        {/* Add Certification */}
        <Card>
          <CardHeader>
            <CardTitle>Add Staff Certification</CardTitle>
            <CardDescription>
              Record a new certification for a team member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddUserCertificationForm users={users} certTypes={certTypes} />
          </CardContent>
        </Card>
      </div>

      {/* All Certifications Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All Staff Certifications</CardTitle>
          <CardDescription>
            View and manage all certifications across your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userCerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No certifications recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {userCerts.map((cert) => (
                <div
                  key={cert.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    cert.isExpired
                      ? "border-red-200 bg-red-50"
                      : cert.isExpiringSoon
                      ? "border-yellow-200 bg-yellow-50"
                      : !cert.isSigned
                      ? "border-blue-200 bg-blue-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Award className={`h-5 w-5 ${cert.isExpired ? "text-red-500" : cert.isExpiringSoon ? "text-yellow-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium">{cert.user.name}</p>
                      <p className="text-sm text-muted-foreground">{cert.certificationType.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {cert.isSigned ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Signed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-blue-600 text-sm">
                        <PenLine className="h-4 w-4" />
                        <span>Pending</span>
                      </div>
                    )}
                    <div className="text-right">
                      {cert.isExpired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : cert.isExpiringSoon ? (
                        <Badge className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                      {cert.expiryDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {cert.isExpired ? "Expired" : "Expires"}: {new Date(cert.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
