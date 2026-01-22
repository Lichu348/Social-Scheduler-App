"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";

interface LocationSettingsFormProps {
  locationLatitude: number | null;
  locationLongitude: number | null;
  clockInRadiusMetres: number;
  requireGeolocation: boolean;
}

export function LocationSettingsForm({
  locationLatitude,
  locationLongitude,
  clockInRadiusMetres,
  requireGeolocation,
}: LocationSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    locationLatitude: locationLatitude ?? "",
    locationLongitude: locationLongitude ?? "",
    clockInRadiusMetres,
    requireGeolocation,
  });

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    setGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          locationLatitude: position.coords.latitude,
          locationLongitude: position.coords.longitude,
        });
        setGettingLocation(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Failed to get current location. Please enter coordinates manually.");
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationLatitude: formData.locationLatitude === "" ? null : Number(formData.locationLatitude),
          locationLongitude: formData.locationLongitude === "" ? null : Number(formData.locationLongitude),
          clockInRadiusMetres: formData.clockInRadiusMetres,
          requireGeolocation: formData.requireGeolocation,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        setError("Failed to update location settings");
      }
    } catch (err) {
      console.error("Failed to update location settings:", err);
      setError("Failed to update location settings");
    } finally {
      setLoading(false);
    }
  };

  const hasLocation = formData.locationLatitude !== "" && formData.locationLongitude !== "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
          Location settings updated successfully
        </div>
      )}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Gym Location</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Use Current Location
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Click the button above while at the gym, or enter coordinates manually below
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="-33.8688"
              value={formData.locationLatitude}
              onChange={(e) =>
                setFormData({ ...formData, locationLatitude: e.target.value === "" ? "" : parseFloat(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              placeholder="151.2093"
              value={formData.locationLongitude}
              onChange={(e) =>
                setFormData({ ...formData, locationLongitude: e.target.value === "" ? "" : parseFloat(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="radius">Clock-In Radius</Label>
          <div className="flex items-center gap-2">
            <Input
              id="radius"
              type="number"
              min="10"
              max="1000"
              value={formData.clockInRadiusMetres}
              onChange={(e) =>
                setFormData({ ...formData, clockInRadiusMetres: parseInt(e.target.value) || 100 })
              }
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">metres</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Staff must be within this distance of the gym to clock in
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requireGeolocation"
              checked={formData.requireGeolocation}
              onChange={(e) =>
                setFormData({ ...formData, requireGeolocation: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="requireGeolocation" className="font-normal">
              Require location verification for clock-in
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            When disabled, staff can clock in from any location
          </p>
        </div>

        {hasLocation && (
          <div className="p-3 bg-muted rounded-md text-sm">
            <p className="font-medium">Current Configuration</p>
            <p className="text-muted-foreground">
              Staff must be within {formData.clockInRadiusMetres}m of ({Number(formData.locationLatitude).toFixed(4)}, {Number(formData.locationLongitude).toFixed(4)}) to clock in.
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Location Settings"}
      </Button>
    </form>
  );
}
