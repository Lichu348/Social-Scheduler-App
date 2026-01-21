/**
 * UK Payroll Calculations for 2025/26 Tax Year (April 2025 - April 2026)
 *
 * NI Thresholds (monthly):
 * - Employee Primary Threshold (PT): £1,048/month - NI starts
 * - Upper Earnings Limit (UEL): £4,189/month - 8% rate stops
 * - Employee NI: 8% on earnings £1,048-£4,189/month, 2% above £4,189/month
 * - Employer Secondary Threshold (ST): £417/month
 * - Employer NI: 15% on earnings above £417/month
 *
 * Holiday Accrual: 12.07% for HOURLY staff only
 */

// Monthly thresholds for 2025/26 tax year
const EMPLOYEE_NI_LOWER_THRESHOLD_MONTHLY = 1048; // Primary Threshold (PT)
const EMPLOYEE_NI_UPPER_THRESHOLD_MONTHLY = 4189; // Upper Earnings Limit (UEL)
const EMPLOYER_NI_THRESHOLD_MONTHLY = 417; // Secondary Threshold (ST)

// NI Rates for 2025/26
const EMPLOYEE_NI_MAIN_RATE = 0.08; // 8%
const EMPLOYEE_NI_ADDITIONAL_RATE = 0.02; // 2%
const EMPLOYER_NI_RATE = 0.15; // 15%

// Holiday Accrual
const HOLIDAY_ACCRUAL_RATE = 0.1207; // 12.07%

export interface NICalculation {
  employeeNI: number;
  employerNI: number;
}

/**
 * Calculate monthly National Insurance contributions
 * @param monthlyGross - Gross monthly pay
 * @returns Employee and employer NI amounts
 */
export function calculateMonthlyNI(monthlyGross: number): NICalculation {
  // Employee NI calculation
  let employeeNI = 0;

  if (monthlyGross > EMPLOYEE_NI_LOWER_THRESHOLD_MONTHLY) {
    if (monthlyGross <= EMPLOYEE_NI_UPPER_THRESHOLD_MONTHLY) {
      // 8% on amount between lower and upper threshold
      employeeNI = (monthlyGross - EMPLOYEE_NI_LOWER_THRESHOLD_MONTHLY) * EMPLOYEE_NI_MAIN_RATE;
    } else {
      // 8% on amount between thresholds + 2% on amount above upper threshold
      const mainBandNI = (EMPLOYEE_NI_UPPER_THRESHOLD_MONTHLY - EMPLOYEE_NI_LOWER_THRESHOLD_MONTHLY) * EMPLOYEE_NI_MAIN_RATE;
      const additionalBandNI = (monthlyGross - EMPLOYEE_NI_UPPER_THRESHOLD_MONTHLY) * EMPLOYEE_NI_ADDITIONAL_RATE;
      employeeNI = mainBandNI + additionalBandNI;
    }
  }

  // Employer NI calculation
  let employerNI = 0;

  if (monthlyGross > EMPLOYER_NI_THRESHOLD_MONTHLY) {
    employerNI = (monthlyGross - EMPLOYER_NI_THRESHOLD_MONTHLY) * EMPLOYER_NI_RATE;
  }

  return {
    employeeNI: Math.round(employeeNI * 100) / 100,
    employerNI: Math.round(employerNI * 100) / 100,
  };
}

/**
 * Calculate holiday accrual amount
 * Only applicable for HOURLY staff - monthly salaried staff have holiday included
 * @param grossPay - Gross pay amount
 * @param paymentType - "HOURLY" or "MONTHLY"
 * @returns Holiday accrual amount (12.07% for hourly, 0 for monthly)
 */
export function calculateHolidayAccrual(grossPay: number, paymentType: string): number {
  if (paymentType === "MONTHLY") {
    return 0;
  }
  return Math.round(grossPay * HOLIDAY_ACCRUAL_RATE * 100) / 100;
}

/**
 * Get the effective hourly rate for a user and category
 * User-specific rates override category defaults
 * @param categoryRate - Default hourly rate for the category
 * @param userRates - Array of user-specific rates
 * @param categoryId - The category ID to look up
 * @returns Effective hourly rate
 */
export function getEffectiveHourlyRate(
  categoryRate: number,
  userRates: Array<{ categoryId: string; hourlyRate: number }>,
  categoryId: string
): number {
  const userRate = userRates.find((r) => r.categoryId === categoryId);
  return userRate ? userRate.hourlyRate : categoryRate;
}

export interface StaffCostCalculation {
  grossPay: number;
  holidayAccrual: number;
  employeeNI: number;
  employerNI: number;
  totalCost: number; // grossPay + holidayAccrual + employerNI
}

/**
 * Calculate full staff cost breakdown
 * @param grossPay - Gross pay amount
 * @param paymentType - "HOURLY" or "MONTHLY"
 * @returns Full cost breakdown including NI and holiday accrual
 */
export function calculateStaffCost(grossPay: number, paymentType: string): StaffCostCalculation {
  const holidayAccrual = calculateHolidayAccrual(grossPay, paymentType);
  const { employeeNI, employerNI } = calculateMonthlyNI(grossPay);

  return {
    grossPay: Math.round(grossPay * 100) / 100,
    holidayAccrual,
    employeeNI,
    employerNI,
    totalCost: Math.round((grossPay + holidayAccrual + employerNI) * 100) / 100,
  };
}
