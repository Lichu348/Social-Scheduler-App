import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { LogCashDialog } from "@/components/log-cash-dialog";
import { EditCashDialog } from "@/components/edit-cash-dialog";
import { CashFilters } from "@/components/cash-filters";
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Building2,
  ShoppingCart,
  RefreshCw,
} from "lucide-react";

const typeIcons: Record<string, React.ReactNode> = {
  TAKING: <TrendingUp className="h-4 w-4 text-green-500" />,
  BANKING: <Building2 className="h-4 w-4 text-blue-500" />,
  PURCHASE: <ShoppingCart className="h-4 w-4 text-orange-500" />,
  ADJUSTMENT: <RefreshCw className="h-4 w-4 text-purple-500" />,
};

const typeLabels: Record<string, string> = {
  TAKING: "Cash Received",
  BANKING: "Banked",
  PURCHASE: "Purchase",
  ADJUSTMENT: "Adjustment",
};

const typeBadgeVariants: Record<string, "default" | "success" | "secondary" | "destructive" | "warning" | "outline"> = {
  TAKING: "success",
  BANKING: "secondary",
  PURCHASE: "warning",
  ADJUSTMENT: "outline",
};

interface CashTransaction {
  id: string;
  type: string;
  amount: number;
  notes: string | null;
  createdAt: Date;
  loggedBy: { id: string; name: string };
  location: { id: string; name: string } | null;
}

async function getCashData(
  organizationId: string,
  locationId?: string,
  startDate?: string,
  endDate?: string
) {
  // Build where clause
  const where: {
    organizationId: string;
    locationId?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {
    organizationId,
  };

  if (locationId) {
    where.locationId = locationId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [transactions, locations] = await Promise.all([
    prisma.cashTransaction.findMany({
      where,
      include: {
        loggedBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.location.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Calculate running total (all transactions, not filtered by date)
  const allTransactions = await prisma.cashTransaction.findMany({
    where: {
      organizationId,
      ...(locationId ? { locationId } : {}),
    },
    select: { amount: true },
  });

  const runningTotal = allTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Calculate today's totals
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTransactions = await prisma.cashTransaction.findMany({
    where: {
      organizationId,
      ...(locationId ? { locationId } : {}),
      createdAt: { gte: today },
    },
    select: { amount: true, type: true },
  });

  const todayIn = todayTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const todayOut = todayTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    transactions,
    locations,
    runningTotal,
    todayIn,
    todayOut,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const isAdmin = session.user.role === "ADMIN";

  const { transactions, locations, runningTotal, todayIn, todayOut } = await getCashData(
    session.user.organizationId,
    params.locationId,
    params.startDate,
    params.endDate
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Cash Management</h1>
          <p className="text-muted-foreground mt-1">
            Track cash in the building with a running total
          </p>
        </div>
        <LogCashDialog locations={locations} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash in Building</CardTitle>
            <Banknote className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${runningTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(runningTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current running total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Takings</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(todayIn)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cash received today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Outgoings</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(todayOut)}
            </div>
            <p className="text-xs text-muted-foreground">
              Banked or spent today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <CashFilters
        locations={locations}
        currentLocationId={params.locationId}
        currentStartDate={params.startDate}
        currentEndDate={params.endDate}
      />

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All cash transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-muted">
                      {typeIcons[transaction.type]}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={typeBadgeVariants[transaction.type]}>
                          {typeLabels[transaction.type]}
                        </Badge>
                        {transaction.location && (
                          <Badge variant="outline">{transaction.location.name}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.createdAt)} by {transaction.loggedBy.name}
                      </p>
                      {transaction.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          {transaction.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xl font-bold ${
                        transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.amount >= 0 ? "+" : ""}
                      {formatCurrency(transaction.amount)}
                    </span>
                    {isManager && (
                      <EditCashDialog
                        transaction={transaction as CashTransaction}
                        locations={locations}
                        isAdmin={isAdmin}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No transactions found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
