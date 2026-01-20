"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PoundSterling } from "lucide-react";

interface MonthlySalaryEditorProps {
  userId: string;
  userName: string;
  currentSalary: number | null;
}

export function MonthlySalaryEditor({ userId, userName, currentSalary }: MonthlySalaryEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [salary, setSalary] = useState(currentSalary?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const salaryValue = salary ? parseFloat(salary) : null;

      if (salary && (isNaN(salaryValue!) || salaryValue! < 0)) {
        setError("Please enter a valid salary amount");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlySalary: salaryValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to update salary");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated costs for display
  const salaryNum = parseFloat(salary) || 0;
  const holidayAccrual = 0; // Monthly staff don't get holiday accrual
  const employerNI = salaryNum > 758.33 ? (salaryNum - 758.33) * 0.138 : 0;
  const totalCost = salaryNum + employerNI;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PoundSterling className="h-4 w-4 mr-1" />
          Salary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Monthly Salary - {userName}</DialogTitle>
          <DialogDescription>
            Set gross monthly salary (before tax)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="salary">Monthly Salary (Gross)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                £
              </span>
              <Input
                id="salary"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          {salaryNum > 0 && (
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <h4 className="font-medium">Estimated Monthly Costs</h4>
              <div className="flex justify-between text-muted-foreground">
                <span>Gross Salary</span>
                <span>£{salaryNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Holiday Accrual</span>
                <span>£0.00 (included)</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Employer NI (13.8%)</span>
                <span>£{employerNI.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total Employer Cost</span>
                <span>£{totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
