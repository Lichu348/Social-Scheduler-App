"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, calculateHours } from "@/lib/utils";
import { Calendar, Clock, MapPin, Tag, DollarSign, AlertTriangle } from "lucide-react";

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface Location {
  id: string;
  name: string;
}

interface OpenShift {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  scheduledBreakMinutes: number;
  category: ShiftCategory | null;
  location: Location | null;
}

interface OpenShiftCardProps {
  shift: OpenShift;
}

export function OpenShiftCard({ shift }: OpenShiftCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hours = calculateHours(shift.startTime, shift.endTime);
  const paidHours = hours - (shift.scheduledBreakMinutes || 0) / 60;
  const estimatedPay = shift.category?.hourlyRate
    ? paidHours * shift.category.hourlyRate
    : null;

  const handleClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shifts/${shift.id}/pickup`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        router.refresh();
      } else {
        setError(data.certificationError || data.error || "Failed to claim shift");
      }
    } catch (err) {
      console.error("Failed to claim shift:", err);
      setError("Failed to claim shift");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{shift.title}</CardTitle>
          {shift.category && (
            <Badge
              variant="outline"
              className="flex items-center gap-1"
              style={{
                borderColor: shift.category.color,
                color: shift.category.color,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: shift.category.color }}
              />
              {shift.category.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{formatDate(shift.startTime)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
          </span>
          <Badge variant="secondary" className="ml-2">
            {paidHours.toFixed(1)}h paid
          </Badge>
        </div>
        {shift.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{shift.location.name}</span>
          </div>
        )}
        {estimatedPay !== null && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <DollarSign className="h-4 w-4" />
            <span>${estimatedPay.toFixed(2)} estimated</span>
          </div>
        )}
        {shift.description && (
          <p className="text-sm text-muted-foreground pt-2 border-t">
            {shift.description}
          </p>
        )}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleClaim} disabled={loading} className="w-full">
          {loading ? "Claiming..." : "Claim Shift"}
        </Button>
      </CardFooter>
    </Card>
  );
}
