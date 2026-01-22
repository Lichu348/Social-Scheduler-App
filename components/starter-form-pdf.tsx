import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { StarterForm } from "@prisma/client";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #333",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    backgroundColor: "#f0f0f0",
    padding: 5,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "40%",
    color: "#666",
  },
  value: {
    width: "60%",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: "1px solid #ccc",
    paddingTop: 10,
    fontSize: 8,
    color: "#999",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: "1px solid #ccc",
  },
  signatureLine: {
    marginTop: 30,
    borderBottom: "1px solid #333",
    width: "60%",
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666",
  },
});

interface StarterFormPDFProps {
  form: StarterForm;
  employeeName: string;
  organizationName: string;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "Not provided";
  return new Date(date).toLocaleDateString("en-GB");
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "Not provided";
  return `£${amount.toFixed(2)}`;
}

function getRightToWorkLabel(status: string | null): string {
  const labels: Record<string, string> = {
    BRITISH_IRISH: "British/Irish Citizen",
    EU_SETTLED: "EU Settled Status",
    EU_PRE_SETTLED: "EU Pre-Settled Status",
    VISA: "Visa",
    OTHER: "Other",
  };
  return status ? labels[status] || status : "Not provided";
}

function getStudentLoanLabel(plan: string | null): string {
  const labels: Record<string, string> = {
    NONE: "None",
    PLAN_1: "Plan 1",
    PLAN_2: "Plan 2",
    PLAN_4: "Plan 4",
    POSTGRAD: "Postgraduate",
  };
  return plan ? labels[plan] || plan : "Not provided";
}

function getStarterDeclarationLabel(declaration: string | null): string {
  const labels: Record<string, string> = {
    A: "Statement A - First job since 6 April, not receiving state benefits or pension",
    B: "Statement B - Have another job, or receive state/occupational pension",
    C: "Statement C - Have left a job since 6 April",
  };
  return declaration ? labels[declaration] || declaration : "Not provided";
}

export function StarterFormPDF({ form, employeeName, organizationName }: StarterFormPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>New Starter Form</Text>
          <Text style={styles.subtitle}>{organizationName}</Text>
          <Text style={styles.subtitle}>Employee: {employeeName}</Text>
          <Text style={styles.subtitle}>
            Submitted: {form.submittedAt ? formatDate(form.submittedAt) : "Not submitted"}
          </Text>
        </View>

        {/* Personal Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Full Legal Name:</Text>
            <Text style={styles.value}>
              {[form.legalFirstName, form.legalMiddleName, form.legalLastName]
                .filter(Boolean)
                .join(" ") || "Not provided"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{formatDate(form.dateOfBirth)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {[form.addressLine1, form.addressLine2, form.city, form.county, form.postcode]
                .filter(Boolean)
                .join(", ") || "Not provided"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>National Insurance Number:</Text>
            <Text style={styles.value}>{form.nationalInsurance || "Not provided"}</Text>
          </View>
        </View>

        {/* Bank Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Bank Name:</Text>
            <Text style={styles.value}>{form.bankName || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Account Holder Name:</Text>
            <Text style={styles.value}>{form.accountHolderName || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sort Code:</Text>
            <Text style={styles.value}>{form.sortCode || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Account Number:</Text>
            <Text style={styles.value}>{form.accountNumber || "Not provided"}</Text>
          </View>
        </View>

        {/* Tax Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Has P45 from Previous Employer:</Text>
            <Text style={styles.value}>{form.hasP45 ? "Yes" : "No"}</Text>
          </View>
          {form.hasP45 ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Previous Employer:</Text>
                <Text style={styles.value}>{form.previousEmployer || "Not provided"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Leaving Date:</Text>
                <Text style={styles.value}>{formatDate(form.p45LeavingDate)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Tax Code:</Text>
                <Text style={styles.value}>{form.p45TaxCode || "Not provided"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Total Pay to Date:</Text>
                <Text style={styles.value}>{formatCurrency(form.p45TotalPay)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Total Tax to Date:</Text>
                <Text style={styles.value}>{formatCurrency(form.p45TotalTax)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>New Starter Declaration:</Text>
              <Text style={styles.value}>{getStarterDeclarationLabel(form.starterDeclaration)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Student Loan Plan:</Text>
            <Text style={styles.value}>{getStudentLoanLabel(form.studentLoanPlan)}</Text>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Contact Name:</Text>
            <Text style={styles.value}>{form.emergencyName || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Relationship:</Text>
            <Text style={styles.value}>{form.emergencyRelationship || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone Number:</Text>
            <Text style={styles.value}>{form.emergencyPhone || "Not provided"}</Text>
          </View>
          {form.emergencyPhoneAlt && (
            <View style={styles.row}>
              <Text style={styles.label}>Alternative Phone:</Text>
              <Text style={styles.value}>{form.emergencyPhoneAlt}</Text>
            </View>
          )}
        </View>

        {/* Right to Work */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Right to Work</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{getRightToWorkLabel(form.rightToWorkStatus)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Document Type:</Text>
            <Text style={styles.value}>{form.rightToWorkDocType || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Document Reference:</Text>
            <Text style={styles.value}>{form.rightToWorkDocRef || "Not provided"}</Text>
          </View>
          {form.rightToWorkExpiry && (
            <View style={styles.row}>
              <Text style={styles.label}>Expiry Date:</Text>
              <Text style={styles.value}>{formatDate(form.rightToWorkExpiry)}</Text>
            </View>
          )}
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text>
            I declare that the information I have given on this form is correct and complete to the
            best of my knowledge and belief.
          </Text>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Employee Signature</Text>
          <View style={[styles.signatureLine, { marginTop: 20 }]} />
          <Text style={styles.signatureLabel}>Date</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated on {new Date().toLocaleDateString("en-GB")}</Text>
          <Text>Confidential - Contains sensitive personal information</Text>
        </View>
      </Page>
    </Document>
  );
}
