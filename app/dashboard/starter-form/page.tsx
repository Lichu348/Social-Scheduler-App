import { auth } from "@/lib/auth";
import { StarterForm } from "@/components/starter-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function StarterFormPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">New Starter Form</h1>
        <p className="text-muted-foreground mt-1">
          Please complete this form with your payroll and onboarding information.
          Your manager will be able to download this as a PDF.
        </p>
      </div>

      <StarterForm />
    </div>
  );
}
