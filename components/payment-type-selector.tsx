"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

interface PaymentTypeSelectorProps {
  userId: string;
  currentPaymentType: string;
}

const paymentTypeOptions = [
  { value: "HOURLY", label: "Hourly" },
  { value: "MONTHLY", label: "Monthly" },
];

export function PaymentTypeSelector({ userId, currentPaymentType }: PaymentTypeSelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePaymentTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPaymentType = e.target.value;
    if (newPaymentType === currentPaymentType) return;
    setLoading(true);
    try {
      await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType: newPaymentType }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update payment type:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select
      value={currentPaymentType}
      onChange={handlePaymentTypeChange}
      options={paymentTypeOptions}
      disabled={loading}
      className="w-[100px] h-8 text-xs"
    />
  );
}
