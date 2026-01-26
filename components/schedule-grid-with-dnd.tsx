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
  closestCenter,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ShiftTemplateSidebar } from "./shift-template-sidebar";
import { ScheduleGrid } from "./schedule-grid";
import { QuickAssignDialog } from "./quick-assign-dialog";
import { DraggableTemplateOverlay } from "./draggable-template";
import { StaffRowDragOverlay } from "./schedule-grid/staff-row-drag-overlay";

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
  breakRules?: string;
  breakCalculationMode?: string;
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
  breakRules = "[]",
  breakCalculationMode = "PER_SHIFT",
}: ScheduleGridWithDndProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ShiftTemplate | null>(null);
  const [activeStaffUser, setActiveStaffUser] = useState<User | null>(null);
  const [sortedUsers, setSortedUsers] = useState(users);
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [dropTemplate, setDropTemplate] = useState<ShiftTemplate | null>(null);
  const [dropDate, setDropDate] = useState<Date | null>(null);
  const [dropUserId, setDropUserId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSortedUsers(users);
  }, [users]);

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

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const activeType = args.active.data.current?.type;

    if (activeType === "staff-row") {
      const staffContainers = args.droppableContainers.filter(
        (container) => container.data.current?.type === "staff-row"
      );
      return closestCenter({ ...args, droppableContainers: staffContainers });
    }

    // For template drags, only collide with grid-cell droppables
    const gridContainers = args.droppableContainers.filter(
      (container) => container.data.current?.type === "grid-cell"
    );
    return rectIntersection({ ...args, droppableContainers: gridContainers });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "template") {
      setActiveTemplate(active.data.current.template);
    } else if (active.data.current?.type === "staff-row") {
      setActiveStaffUser(active.data.current.user as User);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTemplate(null);
    setActiveStaffUser(null);

    if (!over) return;

    // Staff row reordering
    if (
      active.data.current?.type === "staff-row" &&
      over.data.current?.type === "staff-row" &&
      active.id !== over.id
    ) {
      setSortedUsers((prev) => {
        const oldIndex = prev.findIndex((u) => u.id === active.id);
        const newIndex = prev.findIndex((u) => u.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const reordered = arrayMove(prev, oldIndex, newIndex);
        // Fire-and-forget API call for persistence
        const order = reordered.map((u, i) => ({ id: u.id, sortOrder: i }));
        fetch("/api/team/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order }),
        });
        return reordered;
      });
      return;
    }

    // Template drop onto grid cell
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
    setActiveStaffUser(null);
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
        breakRules={breakRules}
        breakCalculationMode={breakCalculationMode}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4">
        {showSidebar && <ShiftTemplateSidebar className="flex-shrink-0 rounded-lg border shadow-sm" />}
        <div className="flex-1 min-w-0">
          <SortableContext
            items={sortedUsers.map((u) => u.id)}
            strategy={verticalListSortingStrategy}
          >
            <ScheduleGrid
              shifts={shifts}
              users={sortedUsers}
              currentUserId={currentUserId}
              isManager={isManager}
              availability={availability}
              locationId={locationId}
              enableDroppable={true}
              enableSortableRows={true}
              categories={categories}
              locations={locations}
              holidays={holidays}
              events={events}
              breakRules={breakRules}
              breakCalculationMode={breakCalculationMode}
            />
          </SortableContext>
        </div>
      </div>

      <DragOverlay>
        {activeTemplate ? (
          <DraggableTemplateOverlay template={activeTemplate} />
        ) : activeStaffUser ? (
          <StaffRowDragOverlay user={activeStaffUser} />
        ) : null}
      </DragOverlay>

      <QuickAssignDialog
        open={quickAssignOpen}
        onOpenChange={setQuickAssignOpen}
        template={dropTemplate}
        targetDate={dropDate}
        users={sortedUsers}
        locationId={locationId}
        defaultUserId={dropUserId}
        onSuccess={handleQuickAssignSuccess}
      />
    </DndContext>
  );
}
