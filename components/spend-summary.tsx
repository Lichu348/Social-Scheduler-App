import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface SpendSummaryProps {
  summary: {
    pending: { total: number; count: number };
    approved: { total: number; count: number };
    rejected: { total: number; count: number };
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export function SpendSummary({ summary }: SpendSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(summary.pending.total)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.pending.count} request{summary.pending.count !== 1 ? "s" : ""} awaiting review
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.approved.total)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.approved.count} request{summary.approved.count !== 1 ? "s" : ""} approved
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rejected This Month</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.rejected.total)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.rejected.count} request{summary.rejected.count !== 1 ? "s" : ""} rejected
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
