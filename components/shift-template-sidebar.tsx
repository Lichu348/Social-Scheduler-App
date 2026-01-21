"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, LayoutTemplate, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { DraggableTemplate } from "./draggable-template";
import { CreateTemplateDialog } from "./create-template-dialog";

interface Location {
  id: string;
  name: string;
}

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  defaultTitle?: string | null;
  description?: string | null;
  categoryId?: string | null;
  category?: ShiftCategory | null;
  locationId?: string | null;
  location?: Location | null;
}

interface ShiftTemplateSidebarProps {
  className?: string;
  selectedLocationId?: string | null;
}

export function ShiftTemplateSidebar({ className, selectedLocationId }: ShiftTemplateSidebarProps) {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [filterLocationId, setFilterLocationId] = useState<string>("");

  // Sync filter with selected location from parent
  useEffect(() => {
    if (selectedLocationId) {
      setFilterLocationId(selectedLocationId);
    }
  }, [selectedLocationId]);

  const fetchTemplates = async () => {
    try {
      const url = filterLocationId
        ? `/api/shift-templates?activeOnly=true&locationId=${filterLocationId}`
        : "/api/shift-templates?activeOnly=true";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [filterLocationId]);

  const handleEdit = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingTemplate(null);
    }
  };

  const handleSuccess = () => {
    fetchTemplates();
    setEditingTemplate(null);
  };

  const locationOptions = [
    { value: "", label: "All Locations" },
    ...locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  if (collapsed) {
    return (
      <div className={cn("w-12 flex flex-col items-center pt-4", className)}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          title="Expand templates"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="mt-4 writing-mode-vertical">
          <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-64 border-r bg-muted/30 flex flex-col", className)}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Templates</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Location Filter */}
      {locations.length > 0 && (
        <div className="px-3 pt-3">
          <Select
            options={locationOptions}
            value={filterLocationId}
            onChange={(e) => setFilterLocationId(e.target.value)}
            className="text-xs"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Loading...
          </div>
        ) : templates.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            <p>No templates yet</p>
            <p className="text-xs mt-1">Create your first template to get started</p>
          </div>
        ) : (
          templates.map((template) => (
            <DraggableTemplate
              key={template.id}
              template={template}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setEditingTemplate(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Drag templates to calendar to create shifts
        </p>
      </div>

      <CreateTemplateDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        template={editingTemplate}
        onSuccess={handleSuccess}
        locations={locations}
        defaultLocationId={filterLocationId}
      />
    </div>
  );
}
