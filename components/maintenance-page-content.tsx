"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MaintenanceOverview } from "@/components/maintenance-overview";
import { MaintenanceHistory } from "@/components/maintenance-history";
import { MaintenanceCheckTypesManager } from "@/components/maintenance-check-types-manager";
import { MapPin, ChevronDown } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface MaintenancePageContentProps {
  userName: string;
  userRole: string;
  isAdmin: boolean;
  isManager: boolean;
}

export function MaintenancePageContent({
  userName,
  userRole,
  isAdmin,
  isManager,
}: MaintenancePageContentProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/maintenance/overview");
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
        setCanEdit(data.canEdit || false);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Location Filter - Above Tabs */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground">Filter by Location</Label>
              <div className="relative mt-1">
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  disabled={loading}
                  className="flex h-9 w-full max-w-xs appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">All Locations {locations.length > 0 && `(${locations.length})`}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>
            {!canEdit && !loading && (
              <Badge variant="outline" className="text-muted-foreground">
                View Only
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="today">
        <TabsList className="mb-6">
          <TabsTrigger value="today">Today&apos;s Checks</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          {isAdmin && <TabsTrigger value="check-types">Check Types</TabsTrigger>}
        </TabsList>

        <TabsContent value="today">
          <MaintenanceOverview
            userName={userName}
            selectedLocationId={selectedLocationId}
            showLocationFilter={false}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>
                View past maintenance logs and filter by location, date, or status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceHistory selectedLocationId={selectedLocationId} />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="check-types">
            <Card>
              <CardHeader>
                <CardTitle>Check Types</CardTitle>
                <CardDescription>
                  Configure maintenance check types and their frequencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceCheckTypesManager />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
