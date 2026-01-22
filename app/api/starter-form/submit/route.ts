import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST: Marks form as SUBMITTED
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's starter form
    const starterForm = await prisma.starterForm.findUnique({
      where: { userId: session.user.id },
    });

    if (!starterForm) {
      return NextResponse.json(
        { error: "Starter form not found" },
        { status: 404 }
      );
    }

    // Validate required fields are complete
    const requiredFields = [
      "legalFirstName",
      "legalLastName",
      "dateOfBirth",
      "addressLine1",
      "city",
      "postcode",
      "nationalInsurance",
      "bankName",
      "accountHolderName",
      "sortCode",
      "accountNumber",
      "emergencyName",
      "emergencyRelationship",
      "emergencyPhone",
      "rightToWorkStatus",
      "rightToWorkDocType",
    ];

    const missingFields: string[] = [];
    for (const field of requiredFields) {
      if (!starterForm[field as keyof typeof starterForm]) {
        missingFields.push(field);
      }
    }

    // If no P45, require starter declaration
    if (!starterForm.hasP45 && !starterForm.starterDeclaration) {
      missingFields.push("starterDeclaration");
    }

    // If has P45, require P45 fields
    if (starterForm.hasP45) {
      if (!starterForm.previousEmployer) missingFields.push("previousEmployer");
      if (!starterForm.p45LeavingDate) missingFields.push("p45LeavingDate");
      if (!starterForm.p45TaxCode) missingFields.push("p45TaxCode");
      if (starterForm.p45TotalPay === null) missingFields.push("p45TotalPay");
      if (starterForm.p45TotalTax === null) missingFields.push("p45TotalTax");
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "Please complete all required fields", missingFields },
        { status: 400 }
      );
    }

    // Validate NI number format
    const niRegex = /^[A-Z]{2}[0-9]{6}[A-Z]$/;
    if (starterForm.nationalInsurance && !niRegex.test(starterForm.nationalInsurance.toUpperCase().replace(/\s/g, ""))) {
      return NextResponse.json(
        { error: "Invalid National Insurance number format" },
        { status: 400 }
      );
    }

    // Validate sort code format
    const sortCodeRegex = /^[0-9]{2}-[0-9]{2}-[0-9]{2}$/;
    if (starterForm.sortCode && !sortCodeRegex.test(starterForm.sortCode)) {
      return NextResponse.json(
        { error: "Invalid sort code format (use XX-XX-XX)" },
        { status: 400 }
      );
    }

    // Validate account number (8 digits)
    const accountRegex = /^[0-9]{8}$/;
    if (starterForm.accountNumber && !accountRegex.test(starterForm.accountNumber)) {
      return NextResponse.json(
        { error: "Invalid account number (must be 8 digits)" },
        { status: 400 }
      );
    }

    // Update the form status
    const updatedForm = await prisma.starterForm.update({
      where: { userId: session.user.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(updatedForm);
  } catch (error) {
    console.error("Submit starter form error:", error);
    return NextResponse.json(
      { error: "Failed to submit starter form" },
      { status: 500 }
    );
  }
}
