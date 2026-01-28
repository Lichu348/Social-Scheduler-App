"use client";

import { useState, useCallback, useEffect } from "react";
import { ScheduleGridWithDnd } from "./schedule-grid-with-dnd";
import { CreateShiftDialog } from "./create-shift-dialog";
import { CreateEventDialog } from "./create-event-dialog";
import { LocationScheduleFilter } from "./location-schedule-filter";
import { WeeklyForecastCard } from "./weekly-forecast-card";

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface Shift {
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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  staffRole?: string;
  contractedHours?: number | null;
  sortOrder?: number;
}

interface Availability {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface Holiday {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  hours: number;
  reason: string | null;
}

interface Event {
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

interface SchedulePageContentProps {
  initialShifts: Shift[];
  users: User[];
  currentUserId: string;
  isManager: boolean;
  isAdmin: boolean;
  availability: Availability[];
  currentLocationId: string | null;
  userLocationIds: string[];
  allOrgLocations: Location[];
  userLocations: Location[];
  showLocationDropdown: boolean;
  dropdownLocations: Location[];
  showAllOption: boolean;
  categories: ShiftCategory[];
  holidays: Holiday[];
  events: Event[];
  breakRules: string;
  breakCalculationMode: string;
}

export function SchedulePageContent({
  initialShifts,
  users,
  currentUserId,
  isManager,
  isAdmin,
  availability,
  currentLocationId,
  userLocationIds,
  allOrgLocations,
  userLocations,
  showLocationDropdown,
  dropdownLocations,
  showAllOption,
  categories,
  holidays,
  events,
  breakRules,
  breakCalculationMode,
}: SchedulePageContentProps) {
  // Local state for shifts - enables optimistic updates
  const [localShifts, setLocalShifts] = useState<Shift[]>(initialShifts);

  // Sync with server data when it changes (e.g., after navigation)
  useEffect(() => {
    setLocalShifts(initialShifts);
  }, [initialShifts]);

  // Callback for optimistic shift creation
  const handleShiftCreated = useCallback((newShift: Shift) => {
    setLocalShifts((prev) => [...prev, newShift]);
  }, []);

  // Callback to update a shift (e.g., replace temp ID with server ID)
  const handleShiftConfirmed = useCallback((tempId: string, serverShift: Shift) => {
    setLocalShifts((prev) =>
      prev.map((shift) => (shift.id === tempId ? serverShift : shift))
    );
  }, []);

  // Callback to rollback a failed optimistic update
  const handleShiftRollback = useCallback((tempId: string) => {
    setLocalShifts((prev) => prev.filter((shift) => shift.id !== tempId));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            {isManager
              ? "Manage and assign shifts for your team"
              : "View your upcoming shifts"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showLocationDropdown && (isAdmin || isManager || userLocations.length > 0) && (
            <LocationScheduleFilter
              locations={dropdownLocations}
              currentLocationId={currentLocationId || (showAllOption ? "all" : dropdownLocations[0]?.id || "")}
              showAllOption={showAllOption}
            />
          )}
          {isManager && (
            <>
              <CreateEventDialog
                locations={isAdmin ? allOrgLocations : userLocations}
                defaultLocationId={currentLocationId}
              />
              <CreateShiftDialog
                users={users}
                breakRules={breakRules}
                locations={isAdmin ? allOrgLocations : userLocations}
                defaultLocationId={currentLocationId}
                onShiftCreated={handleShiftCreated}
                onShiftConfirmed={handleShiftConfirmed}
                onShiftRollback={handleShiftRollback}
              />
            </>
          )}
        </div>
      </div>

      {!isAdmin && !isManager && userLocationIds.length === 0 && allOrgLocations.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          You haven't been assigned to any locations yet. Contact your admin to be assigned.
        </div>
      )}

      {/* Forecast Card for Managers */}
      {isManager && (
        <div className="mb-4 max-w-sm">
          <WeeklyForecastCard locationId={currentLocationId} />
        </div>
      )}

      <ScheduleGridWithDnd
        shifts={localShifts}
        users={users}
        currentUserId={currentUserId}
        isManager={isManager}
        availability={availability}
        locationId={currentLocationId}
        showSidebar={isManager}
        categories={categories}
        locations={isAdmin ? allOrgLocations : userLocations}
        holidays={holidays}
        events={events}
        breakRules={breakRules}
        breakCalculationMode={breakCalculationMode}
      />
    </div>
  );
}
