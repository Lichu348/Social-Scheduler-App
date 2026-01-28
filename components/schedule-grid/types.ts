export interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

export interface Shift {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  isOpen: boolean;
  scheduledBreakMinutes?: number;
  assignedTo: { id: string; name: string; email: string } | null;
  category?: ShiftCategory | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  staffRole?: string;
  contractedHours?: number | null;
  sortOrder?: number;
}

export interface Availability {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: string | null;
}

export interface Location {
  id: string;
  name: string;
}

export interface Holiday {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  hours: number;
  reason: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startTime: string;
  endTime: string;
  expectedGuests: number | null;
  staffRequired: number | null;
  color: string;
  location: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
}

export interface BreakRule {
  minHours: number;
  breakMinutes: number;
}

export interface ScheduleGridProps {
  shifts: Shift[];
  users: User[];
  currentUserId: string;
  isManager: boolean;
  availability?: Availability[];
  locationId?: string | null;
  enableDroppable?: boolean;
  enableSortableRows?: boolean;
  onUsersReordered?: (users: User[]) => void;
  categories?: ShiftCategory[];
  locations?: Location[];
  holidays?: Holiday[];
  events?: Event[];
  breakRules?: string;
  breakCalculationMode?: string;
  onShiftCreated?: (shift: Shift) => void;
  onShiftConfirmed?: (tempId: string, serverShift: Shift) => void;
  onShiftRollback?: (tempId: string) => void;
}

// Calculate break minutes based on break rules and hours worked
export function calculateBreakMinutes(hoursWorked: number, breakRulesJson: string): number {
  try {
    const rules: BreakRule[] = JSON.parse(breakRulesJson);
    const applicableRule = rules
      .filter((r) => hoursWorked >= r.minHours)
      .sort((a, b) => b.minHours - a.minHours)[0];
    return applicableRule?.breakMinutes || 0;
  } catch {
    return 0;
  }
}
