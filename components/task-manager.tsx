"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ListTodo,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  dayOfWeek: number | null;
  category: string;
  priority: number;
  sortOrder: number;
  isActive: boolean;
  locationId: string | null;
  location: Location | null;
}

interface WeeklyTask {
  id: string;
  name: string;
  description: string | null;
  weekStart: string;
  dueDate: string;
  category: string;
  priority: number;
  isCompleted: boolean;
  completedAt: string | null;
  completedById: string | null;
  completedBy: { id: string; name: string } | null;
  completionNotes: string | null;
  isAdhoc: boolean;
  locationId: string | null;
  location: Location | null;
  templateId: string | null;
  template: { id: string; name: string } | null;
}

interface DailyNote {
  id: string;
  date: string;
  content: string;
  priority: string;
  createdById: string;
  createdBy: { id: string; name: string };
  locationId: string | null;
  location: Location | null;
  createdAt: string;
}

interface TaskManagerProps {
  isManager: boolean;
  locations: Location[];
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "ADMIN", label: "Admin" },
  { value: "SAFETY", label: "Safety" },
  { value: "INVENTORY", label: "Inventory" },
];

const CATEGORY_COLORS: Record<string, string> = {
  GENERAL: "bg-gray-500",
  CLEANING: "bg-blue-500",
  MAINTENANCE: "bg-orange-500",
  ADMIN: "bg-purple-500",
  SAFETY: "bg-red-500",
  INVENTORY: "bg-green-500",
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function TaskManager({ isManager, locations }: TaskManagerProps) {
  const [selectedWeek, setSelectedWeek] = useState<Date>(getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState<number>(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");

  // Dialog states
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WeeklyTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");

  // Form states
  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    category: "GENERAL",
    priority: 1,
    locationId: "",
  });

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    dayOfWeek: "",
    category: "GENERAL",
    priority: 1,
    sortOrder: 0,
    locationId: "",
  });

  const [newNote, setNewNote] = useState({
    content: "",
    isImportant: false,
    locationId: "",
  });

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        weekStart: formatDate(selectedWeek),
      });
      if (selectedLocation !== "all") {
        params.append("locationId", selectedLocation);
      }

      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  }, [selectedWeek, selectedLocation]);

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLocation !== "all") {
        params.append("locationId", selectedLocation);
      }

      const res = await fetch(`/api/tasks/templates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  }, [selectedLocation]);

  const fetchNotes = useCallback(async () => {
    const currentDate = new Date(selectedWeek);
    currentDate.setDate(currentDate.getDate() + selectedDay);

    try {
      const params = new URLSearchParams({
        date: formatDate(currentDate),
      });
      if (selectedLocation !== "all") {
        params.append("locationId", selectedLocation);
      }

      const res = await fetch(`/api/tasks/notes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    }
  }, [selectedWeek, selectedDay, selectedLocation]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchTemplates(), fetchNotes()]).finally(() =>
      setLoading(false)
    );
  }, [fetchTasks, fetchTemplates, fetchNotes]);

  const handleGenerateTasks = async () => {
    try {
      const res = await fetch("/api/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: formatDate(selectedWeek),
          locationId: selectedLocation !== "all" ? selectedLocation : null,
        }),
      });

      if (res.ok) {
        fetchTasks();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to generate tasks");
      }
    } catch (error) {
      console.error("Failed to generate tasks:", error);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCompleted: true,
          completionNotes: completionNotes || null,
        }),
      });

      if (res.ok) {
        fetchTasks();
        setCompleteDialogOpen(false);
        setSelectedTask(null);
        setCompletionNotes("");
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleUncompleteTask = async (task: WeeklyTask) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: false }),
      });

      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to uncomplete task:", error);
    }
  };

  const handleDeleteTask = async (task: WeeklyTask) => {
    if (!confirm("Delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleAddTask = async () => {
    const currentDate = new Date(selectedWeek);
    currentDate.setDate(currentDate.getDate() + selectedDay);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTask,
          dueDate: formatDate(currentDate),
          locationId: newTask.locationId || null,
        }),
      });

      if (res.ok) {
        fetchTasks();
        setAddTaskOpen(false);
        setNewTask({
          name: "",
          description: "",
          category: "GENERAL",
          priority: 1,
          locationId: "",
        });
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const handleAddTemplate = async () => {
    try {
      const res = await fetch("/api/tasks/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTemplate,
          dayOfWeek: newTemplate.dayOfWeek ? parseInt(newTemplate.dayOfWeek) : null,
          locationId: newTemplate.locationId || null,
        }),
      });

      if (res.ok) {
        fetchTemplates();
        setAddTemplateOpen(false);
        setNewTemplate({
          name: "",
          description: "",
          dayOfWeek: "",
          category: "GENERAL",
          priority: 1,
          sortOrder: 0,
          locationId: "",
        });
      }
    } catch (error) {
      console.error("Failed to add template:", error);
    }
  };

  const handleDeleteTemplate = async (template: TaskTemplate) => {
    if (!confirm("Delete this template? Existing tasks won't be affected.")) return;

    try {
      const res = await fetch(`/api/tasks/templates/${template.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleAddNote = async () => {
    const currentDate = new Date(selectedWeek);
    currentDate.setDate(currentDate.getDate() + selectedDay);

    try {
      const res = await fetch("/api/tasks/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newNote,
          date: formatDate(currentDate),
          locationId: newNote.locationId || null,
        }),
      });

      if (res.ok) {
        fetchNotes();
        setAddNoteOpen(false);
        setNewNote({
          content: "",
          isImportant: false,
          locationId: "",
        });
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const currentDayDate = new Date(selectedWeek);
  currentDayDate.setDate(currentDayDate.getDate() + selectedDay);

  const dayTasks = tasks.filter((task) => {
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);
    const compareDate = new Date(currentDayDate);
    compareDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === compareDate.getTime();
  });

  const completedCount = dayTasks.filter((t) => t.isCompleted).length;
  const totalCount = dayTasks.length;

  const weekHasTasks = tasks.length > 0;

  // Location options for native selects
  const locationOptions = [
    { value: "all", label: "All Locations" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  const locationOptionsWithEmpty = [
    { value: "", label: "All Locations" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  const dayOfWeekOptions = [
    { value: "", label: "Every day (daily task)" },
    ...DAYS_OF_WEEK.map((day, index) => ({ value: String(index), label: day })),
  ];

  const priorityOptions = [
    { value: "1", label: "Normal" },
    { value: "2", label: "High" },
  ];

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newWeek = new Date(selectedWeek);
              newWeek.setDate(newWeek.getDate() - 7);
              setSelectedWeek(newWeek);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-medium">
            Week of {selectedWeek.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newWeek = new Date(selectedWeek);
              newWeek.setDate(newWeek.getDate() + 7);
              setSelectedWeek(newWeek);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedWeek(getMonday(new Date()))}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {locations.length > 0 && (
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {locationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {isManager && !weekHasTasks && (
            <Button onClick={handleGenerateTasks}>
              <Calendar className="mr-2 h-4 w-4" />
              Generate Week&apos;s Tasks
            </Button>
          )}
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {DAYS_OF_WEEK.map((day, index) => {
          const dayDate = new Date(selectedWeek);
          dayDate.setDate(dayDate.getDate() + index);
          const isToday = formatDate(dayDate) === formatDate(new Date());
          const dayTaskCount = tasks.filter((task) => {
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            dayDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === dayDate.getTime();
          }).length;
          const dayCompletedCount = tasks.filter((task) => {
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            dayDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === dayDate.getTime() && task.isCompleted;
          }).length;

          return (
            <Button
              key={day}
              variant={selectedDay === index ? "default" : "outline"}
              className={`flex-col h-auto py-2 px-4 min-w-[80px] ${
                isToday ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedDay(index)}
            >
              <span className="text-xs">{day.slice(0, 3)}</span>
              <span className="text-lg font-bold">{dayDate.getDate()}</span>
              {dayTaskCount > 0 && (
                <span className="text-xs">
                  {dayCompletedCount}/{dayTaskCount}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Tasks
            {totalCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {completedCount}/{totalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Handover Notes
            {notes.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {notes.length}
              </Badge>
            )}
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="templates" className="gap-2">
              <Settings className="h-4 w-4" />
              Templates
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading tasks...
              </CardContent>
            </Card>
          ) : dayTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No tasks for this day</p>
                {isManager && (
                  <p className="text-sm mt-2">
                    {weekHasTasks
                      ? "Add an ad-hoc task or manage templates"
                      : "Generate tasks from templates to get started"}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {dayTasks
                .sort((a, b) => {
                  // Sort: incomplete first, then by priority (high to low)
                  if (a.isCompleted !== b.isCompleted) {
                    return a.isCompleted ? 1 : -1;
                  }
                  return b.priority - a.priority;
                })
                .map((task) => (
                  <Card
                    key={task.id}
                    className={task.isCompleted ? "opacity-60" : ""}
                  >
                    <CardContent className="py-3 flex items-start gap-3">
                      <Checkbox
                        checked={task.isCompleted}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTask(task);
                            setCompleteDialogOpen(true);
                          } else if (isManager) {
                            handleUncompleteTask(task);
                          }
                        }}
                        disabled={task.isCompleted && !isManager}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-medium ${
                              task.isCompleted ? "line-through" : ""
                            }`}
                          >
                            {task.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`${CATEGORY_COLORS[task.category]} text-white text-xs`}
                          >
                            {task.category}
                          </Badge>
                          {task.priority > 1 && (
                            <Badge variant="destructive" className="text-xs">
                              Priority
                            </Badge>
                          )}
                          {task.isAdhoc && (
                            <Badge variant="outline" className="text-xs">
                              Ad-hoc
                            </Badge>
                          )}
                          {task.location && (
                            <Badge variant="outline" className="text-xs">
                              {task.location.name}
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                        {task.isCompleted && task.completedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed by {task.completedBy.name}
                            {task.completionNotes && ` - "${task.completionNotes}"`}
                          </p>
                        )}
                      </div>
                      {isManager && task.isAdhoc && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTask(task)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {isManager && (
            <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Ad-hoc Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Task for {DAYS_OF_WEEK[selectedDay]}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Task Name</label>
                    <Input
                      value={newTask.name}
                      onChange={(e) =>
                        setNewTask({ ...newTask, name: e.target.value })
                      }
                      placeholder="Enter task name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask({ ...newTask, description: e.target.value })
                      }
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <select
                        value={newTask.category}
                        onChange={(e) =>
                          setNewTask({ ...newTask, category: e.target.value })
                        }
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <select
                        value={String(newTask.priority)}
                        onChange={(e) =>
                          setNewTask({ ...newTask, priority: parseInt(e.target.value) })
                        }
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {priorityOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {locations.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <select
                        value={newTask.locationId}
                        onChange={(e) =>
                          setNewTask({ ...newTask, locationId: e.target.value })
                        }
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {locationOptionsWithEmpty.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button
                    onClick={handleAddTask}
                    disabled={!newTask.name}
                    className="w-full"
                  >
                    Add Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No handover notes for this day</p>
                {isManager && (
                  <p className="text-sm mt-2">
                    Add notes to communicate with the next shift
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <Card
                  key={note.id}
                  className={note.priority === "HIGH" ? "border-red-500" : ""}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start gap-2">
                      {note.priority === "HIGH" && (
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>— {note.createdBy.name}</span>
                          {note.location && <span>at {note.location.name}</span>}
                          <span>
                            {new Date(note.createdAt).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {isManager && (
            <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Handover Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Add Note for {DAYS_OF_WEEK[selectedDay]}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Note</label>
                    <Textarea
                      value={newNote.content}
                      onChange={(e) =>
                        setNewNote({ ...newNote, content: e.target.value })
                      }
                      placeholder="Write your handover note..."
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="important"
                      checked={newNote.isImportant}
                      onCheckedChange={(checked) =>
                        setNewNote({ ...newNote, isImportant: !!checked })
                      }
                    />
                    <label htmlFor="important" className="text-sm">
                      Mark as important
                    </label>
                  </div>
                  {locations.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <select
                        value={newNote.locationId}
                        onChange={(e) =>
                          setNewNote({ ...newNote, locationId: e.target.value })
                        }
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {locationOptionsWithEmpty.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.content}
                    className="w-full"
                  >
                    Add Note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {isManager && (
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Templates</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Templates define recurring tasks that are generated each week.
                  Tasks with no day set will appear every day.
                </p>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No templates configured</p>
                    <p className="text-sm mt-2">
                      Create templates to automatically generate weekly tasks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            <Badge
                              variant="secondary"
                              className={`${CATEGORY_COLORS[template.category]} text-white text-xs`}
                            >
                              {template.category}
                            </Badge>
                            {template.dayOfWeek !== null && (
                              <Badge variant="outline" className="text-xs">
                                {DAYS_OF_WEEK[template.dayOfWeek]}
                              </Badge>
                            )}
                            {template.dayOfWeek === null && (
                              <Badge variant="outline" className="text-xs">
                                Daily
                              </Badge>
                            )}
                            {template.location && (
                              <Badge variant="outline" className="text-xs">
                                {template.location.name}
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={addTemplateOpen} onOpenChange={setAddTemplateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Task Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Task Name</label>
                    <Input
                      value={newTemplate.name}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, name: e.target.value })
                      }
                      placeholder="e.g., Clean bathrooms"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newTemplate.description}
                      onChange={(e) =>
                        setNewTemplate({
                          ...newTemplate,
                          description: e.target.value,
                        })
                      }
                      placeholder="Optional instructions"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Day of Week</label>
                    <select
                      value={newTemplate.dayOfWeek}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, dayOfWeek: e.target.value })
                      }
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      {dayOfWeekOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <select
                        value={newTemplate.category}
                        onChange={(e) =>
                          setNewTemplate({ ...newTemplate, category: e.target.value })
                        }
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <select
                        value={String(newTemplate.priority)}
                        onChange={(e) =>
                          setNewTemplate({
                            ...newTemplate,
                            priority: parseInt(e.target.value),
                          })
                        }
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {priorityOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {locations.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <select
                        value={newTemplate.locationId}
                        onChange={(e) =>
                          setNewTemplate({ ...newTemplate, locationId: e.target.value })
                        }
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {locationOptionsWithEmpty.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button
                    onClick={handleAddTemplate}
                    disabled={!newTemplate.name}
                    className="w-full"
                  >
                    Add Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
      </Tabs>

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">{selectedTask?.name}</span>
            </div>
            <div>
              <label className="text-sm font-medium">
                Notes (optional)
              </label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any notes about completing this task..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCompleteDialogOpen(false);
                  setSelectedTask(null);
                  setCompletionNotes("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleCompleteTask} className="flex-1">
                Mark Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
