import { prisma } from "@/lib/db";

export interface CertificationCheckResult {
  isValid: boolean;
  missingCertifications: {
    id: string;
    name: string;
    description: string | null;
  }[];
  expiredCertifications: {
    id: string;
    name: string;
    expiryDate: Date;
  }[];
  userStaffRole: string;
}

/**
 * Check if a user has all required certifications for their staff role
 * @param userId - The user ID to check
 * @param organizationId - The organization ID for certification requirements
 * @returns Object containing validity status and any missing/expired certifications
 */
export async function checkUserCertifications(
  userId: string,
  organizationId: string
): Promise<CertificationCheckResult> {
  // 1. Get user's staffRole
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { staffRole: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const userStaffRole = user.staffRole;

  // 2. Find CertificationTypes where requiredForRoles includes staffRole
  const allCertTypes = await prisma.certificationType.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      requiredForRoles: true,
    },
  });

  // Filter to those required for this user's staff role
  const requiredCertTypes = allCertTypes.filter((certType) => {
    try {
      const roles: string[] = JSON.parse(certType.requiredForRoles || "[]");
      return roles.includes(userStaffRole);
    } catch {
      return false;
    }
  });

  if (requiredCertTypes.length === 0) {
    // No certifications required for this role
    return {
      isValid: true,
      missingCertifications: [],
      expiredCertifications: [],
      userStaffRole,
    };
  }

  // 3. Check user has ACTIVE, non-expired UserCertification for each required type
  const userCertifications = await prisma.userCertification.findMany({
    where: {
      userId,
      certificationTypeId: {
        in: requiredCertTypes.map((ct) => ct.id),
      },
    },
    select: {
      certificationTypeId: true,
      expiryDate: true,
      status: true,
      certificationType: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const now = new Date();
  const missingCertifications: CertificationCheckResult["missingCertifications"] = [];
  const expiredCertifications: CertificationCheckResult["expiredCertifications"] = [];

  for (const requiredCert of requiredCertTypes) {
    const userCert = userCertifications.find(
      (uc) => uc.certificationTypeId === requiredCert.id
    );

    if (!userCert) {
      // User doesn't have this certification at all
      missingCertifications.push({
        id: requiredCert.id,
        name: requiredCert.name,
        description: requiredCert.description,
      });
    } else if (userCert.status !== "ACTIVE") {
      // Certification exists but is not active (revoked, etc.)
      missingCertifications.push({
        id: requiredCert.id,
        name: requiredCert.name,
        description: requiredCert.description,
      });
    } else if (userCert.expiryDate && userCert.expiryDate < now) {
      // Certification is expired
      expiredCertifications.push({
        id: requiredCert.id,
        name: userCert.certificationType.name,
        expiryDate: userCert.expiryDate,
      });
    }
  }

  return {
    isValid: missingCertifications.length === 0 && expiredCertifications.length === 0,
    missingCertifications,
    expiredCertifications,
    userStaffRole,
  };
}

/**
 * Format certification issues into a human-readable error message
 */
export function formatCertificationError(result: CertificationCheckResult): string {
  const issues: string[] = [];

  if (result.missingCertifications.length > 0) {
    const names = result.missingCertifications.map((c) => c.name).join(", ");
    issues.push(`Missing required certifications: ${names}`);
  }

  if (result.expiredCertifications.length > 0) {
    const names = result.expiredCertifications.map((c) => c.name).join(", ");
    issues.push(`Expired certifications: ${names}`);
  }

  return issues.join(". ");
}
