"use client";

import { useState, useCallback } from "react";
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
import { ScheduleCalendarWithDrop } from "./schedule-calendar-with-drop";
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

interface ScheduleWithDndProps {
  shifts: Shift[];
  users: User[];
  currentUserId: string;
  isManager: boolean;
  locationId?: string | null;
}

export function ScheduleWithDnd({
  shifts,
  users,
  currentUserId,
  isManager,
  locationId,
}: ScheduleWithDndProps) {
  const [activeTemplate, setActiveTemplate] = useState<ShiftTemplate | null>(null);
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [dropTemplate, setDropTemplate] = useState<ShiftTemplate | null>(null);
  const [dropDate, setDropDate] = useState<Date | null>(null);

  // Configure sensors for better drag experience
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5, // 5px movement before drag starts
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

    // Check if we dropped on a day cell
    if (over.data.current?.type === "day" && active.data.current?.type === "template") {
      const template = active.data.current.template as ShiftTemplate;
      const date = over.data.current.date as Date;

      // Open the quick assign dialog
      setDropTemplate(template);
      setDropDate(date);
      setQuickAssignOpen(true);
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveTemplate(null);
  }, []);

  const handleQuickAssignSuccess = useCallback(() => {
    setDropTemplate(null);
    setDropDate(null);
  }, []);

  // Only show sidebar for managers
  if (!isManager) {
    return (
      <ScheduleCalendarWithDrop
        shifts={shifts}
        users={users}
        currentUserId={currentUserId}
        isManager={isManager}
        enableDroppable={false}
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
      <div className="flex gap-6">
        <ShiftTemplateSidebar />

        <div className="flex-1 min-w-0">
          <ScheduleCalendarWithDrop
            shifts={shifts}
            users={users}
            currentUserId={currentUserId}
            isManager={isManager}
            enableDroppable={true}
          />
        </div>
      </div>

      {/* Drag overlay for better visual feedback */}
      <DragOverlay>
        {activeTemplate ? (
          <DraggableTemplateOverlay template={activeTemplate} />
        ) : null}
      </DragOverlay>

      {/* Quick assign dialog after drop */}
      <QuickAssignDialog
        open={quickAssignOpen}
        onOpenChange={setQuickAssignOpen}
        template={dropTemplate}
        targetDate={dropDate}
        users={users}
        locationId={locationId}
        onSuccess={handleQuickAssignSuccess}
      />
    </DndContext>
  );
}
