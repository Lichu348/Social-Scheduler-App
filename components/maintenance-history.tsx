"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Filter, X, ChevronDown } from "lucide-react";

interface MaintenanceLog {
  id: string;
  status: string;
  notes: string | null;
  issues: string | null;
  signature: string;
  signedAt: string;
  checkDate: string;
  checkType: {
    id: string;
    name: string;
    frequencyDays: number;
  };
  location: {
    id: string;
    name: string;
  };
  signedBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface CheckType {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface MaintenanceHistoryProps {
  selectedLocationId?: string;
}

export function MaintenanceHistory({ selectedLocationId = "" }: MaintenanceHistoryProps) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkTypes, setCheckTypes] = useState<CheckType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Filters
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [checkTypeFilter, setCheckTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const limit = 20;

  // Effective location filter - use prop if set, otherwise use internal filter
  const effectiveLocationFilter = selectedLocationId || locationFilter;

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [effectiveLocationFilter, checkTypeFilter, statusFilter, startDate, endDate, page, selectedLocationId]);

  const fetchFilters = async () => {
    try {
      const res = await fetch("/api/maintenance/overview");
      if (res.ok) {
        const data = await res.json();
        setCheckTypes(data.checkTypes);
        setLocations(data.locations);
      }
    } catch (error) {
      console.error("Failed to fetch filters:", error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (effectiveLocationFilter) params.append("locationId", effectiveLocationFilter);
      if (checkTypeFilter) params.append("checkTypeId", checkTypeFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("limit", String(limit));
      params.append("offset", String(page * limit));

      const res = await fetch(`/api/maintenance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    if (!selectedLocationId) {
      setLocationFilter("");
    }
    setCheckTypeFilter("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  // Don't count the location filter if it's being controlled externally
  const hasFilters = (!selectedLocationId && locationFilter) || checkTypeFilter || statusFilter || startDate || endDate;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASS":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Pass
          </Badge>
        );
      case "FAIL":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Fail
          </Badge>
        );
      case "NEEDS_ATTENTION":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Needs Attention
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        {/* Only show location filter if not controlled externally */}
        {!selectedLocationId && (
          <div className="flex-1 min-w-[150px]">
            <Label className="text-xs text-muted-foreground">Location</Label>
            <div className="relative">
              <select
                value={locationFilter}
                onChange={(e) => { setLocationFilter(e.target.value); setPage(0); }}
                className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-[150px]">
          <Label className="text-xs text-muted-foreground">Check Type</Label>
          <div className="relative">
            <select
              value={checkTypeFilter}
              onChange={(e) => { setCheckTypeFilter(e.target.value); setPage(0); }}
              className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All types</option>
              {checkTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[120px]">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All statuses</option>
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
              <option value="NEEDS_ATTENTION">Needs Attention</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[130px]">
          <Label className="text-xs text-muted-foreground">Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
          />
        </div>

        <div className="flex-1 min-w-[130px]">
          <Label className="text-xs text-muted-foreground">End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No maintenance logs found
          {hasFilters && " matching your filters"}
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Check Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className={cn(
                      log.status === "FAIL" && "bg-red-50/50",
                      log.status === "NEEDS_ATTENTION" && "bg-amber-50/50"
                    )}
                  >
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.checkDate).toLocaleDateString()}
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.signedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </TableCell>
                    <TableCell>{log.location.name}</TableCell>
                    <TableCell>{log.checkType.name}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      {log.signedBy.name}
                      <div className="text-xs text-muted-foreground">
                        {log.signature}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {log.notes && (
                        <p className="text-sm truncate">{log.notes}</p>
                      )}
                      {log.issues && (
                        <p className="text-sm text-red-600 truncate">
                          Issue: {JSON.parse(log.issues).join(", ")}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
