"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { ShiftTemplateSidebar } from "./shift-template-sidebar";
import { ScheduleGrid } from "./schedule-grid";
import { QuickAssignDialog } from "./quick-assign-dialog";
import { DraggableTemplateOverlay } from "./draggable-template";

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

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  defaultTitle?: string | null;
  categoryId?: string | null;
  category?: ShiftCategory | null;
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

interface ScheduleGridWithDndProps {
  shifts: Shift[];
  users: User[];
  currentUserId: string;
  isManager: boolean;
  availability?: Availability[];
  locationId?: string | null;
  showSidebar?: boolean;
  categories?: ShiftCategory[];
  locations?: Location[];
  holidays?: Holiday[];
  events?: Event[];
}

export function ScheduleGridWithDnd({
  shifts,
  users,
  currentUserId,
  isManager,
  availability = [],
  locationId,
  showSidebar = true,
  categories = [],
  locations = [],
  holidays = [],
  events = [],
}: ScheduleGridWithDndProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ShiftTemplate | null>(null);
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [dropTemplate, setDropTemplate] = useState<ShiftTemplate | null>(null);
  const [dropDate, setDropDate] = useState<Date | null>(null);
  const [dropUserId, setDropUserId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "template") {
      setActiveTemplate(active.data.current.template);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTemplate(null);

    if (!over) return;

    if (over.data.current?.type === "grid-cell" && active.data.current?.type === "template") {
      const template = active.data.current.template as ShiftTemplate;
      const date = over.data.current.date as Date;
      const userId = over.data.current.userId as string | null;

      setDropTemplate(template);
      setDropDate(date);
      setDropUserId(userId);
      setQuickAssignOpen(true);
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveTemplate(null);
  }, []);

  const handleQuickAssignSuccess = useCallback(() => {
    setDropTemplate(null);
    setDropDate(null);
    setDropUserId(null);
  }, []);

  // Show regular grid for non-managers or while not mounted
  if (!isManager || !mounted) {
    return (
      <ScheduleGrid
        shifts={shifts}
        users={users}
        currentUserId={currentUserId}
        isManager={isManager}
        availability={availability}
        locationId={locationId}
        categories={categories}
        locations={locations}
        holidays={holidays}
        events={events}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4">
        {showSidebar && <ShiftTemplateSidebar className="flex-shrink-0 rounded-lg border shadow-sm" />}
        <div className="flex-1 min-w-0">
          <ScheduleGrid
            shifts={shifts}
            users={users}
            currentUserId={currentUserId}
            isManager={isManager}
            availability={availability}
            locationId={locationId}
            enableDroppable={true}
            categories={categories}
            locations={locations}
            holidays={holidays}
            events={events}
          />
        </div>
      </div>

      <DragOverlay>
        {activeTemplate ? (
          <DraggableTemplateOverlay template={activeTemplate} />
        ) : null}
      </DragOverlay>

      <QuickAssignDialog
        open={quickAssignOpen}
        onOpenChange={setQuickAssignOpen}
        template={dropTemplate}
        targetDate={dropDate}
        users={users}
        locationId={locationId}
        defaultUserId={dropUserId}
        onSuccess={handleQuickAssignSuccess}
      />
    </DndContext>
  );
}
