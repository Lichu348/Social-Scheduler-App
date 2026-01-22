"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface StaffCost {
  userId: string;
  name: string;
  paymentType: string;
  hours: number;
  grossPay: number;
  holidayAccrual: number;
  employerNI: number;
  totalCost: number;
}

interface StaffCostTableProps {
  staff: StaffCost[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function StaffCostTable({ staff }: StaffCostTableProps) {
  const totals = staff.reduce(
    (acc, s) => ({
      hours: acc.hours + s.hours,
      grossPay: acc.grossPay + s.grossPay,
      holidayAccrual: acc.holidayAccrual + s.holidayAccrual,
      employerNI: acc.employerNI + s.employerNI,
      totalCost: acc.totalCost + s.totalCost,
    }),
    { hours: 0, grossPay: 0, holidayAccrual: 0, employerNI: 0, totalCost: 0 }
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Pay Type</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-right">Gross Pay</TableHead>
          <TableHead className="text-right">Holiday Accrual</TableHead>
          <TableHead className="text-right">Employer NI</TableHead>
          <TableHead className="text-right">Total Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((s) => (
          <TableRow key={s.userId}>
            <TableCell className="font-medium">{s.name}</TableCell>
            <TableCell>
              <Badge variant={s.paymentType === "HOURLY" ? "outline" : "secondary"}>
                {s.paymentType === "HOURLY" ? "Hourly" : "Monthly"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{s.hours.toFixed(1)}</TableCell>
            <TableCell className="text-right">{formatCurrency(s.grossPay)}</TableCell>
            <TableCell className="text-right">
              {s.holidayAccrual > 0 ? formatCurrency(s.holidayAccrual) : "-"}
            </TableCell>
            <TableCell className="text-right">{formatCurrency(s.employerNI)}</TableCell>
            <TableCell className="text-right font-bold">{formatCurrency(s.totalCost)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2} className="font-bold">Total</TableCell>
          <TableCell className="text-right font-bold">{totals.hours.toFixed(1)}</TableCell>
          <TableCell className="text-right font-bold">{formatCurrency(totals.grossPay)}</TableCell>
          <TableCell className="text-right font-bold">{formatCurrency(totals.holidayAccrual)}</TableCell>
          <TableCell className="text-right font-bold">{formatCurrency(totals.employerNI)}</TableCell>
          <TableCell className="text-right font-bold">{formatCurrency(totals.totalCost)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
