"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, X, ImagePlus } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface SettingSignoffFormProps {
  locations: Location[];
}

export function SettingSignoffForm({ locations }: SettingSignoffFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [formData, setFormData] = useState({
    locationId: "",
    externalSetterName: "",
    inHouseSetterName: "",
    climbsTested: false,
    downClimbJugsOk: false,
    matsChecked: false,
    photos: [] as string[],
    notes: "",
    settingDate: new Date().toISOString().split("T")[0],
  });

  const handleAddPhoto = () => {
    if (photoUrl && formData.photos.length < 5) {
      setFormData({
        ...formData,
        photos: [...formData.photos, photoUrl],
      });
      setPhotoUrl("");
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.locationId) {
      setError("Please select a site");
      setLoading(false);
      return;
    }

    if (!formData.externalSetterName || !formData.inHouseSetterName) {
      setError("Please enter both setter names");
      setLoading(false);
      return;
    }

    if (!formData.climbsTested || !formData.downClimbJugsOk || !formData.matsChecked) {
      setError("Please confirm all safety checklist items");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/setting-signoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setOpen(false);
        setFormData({
          locationId: "",
          externalSetterName: "",
          inHouseSetterName: "",
          climbsTested: false,
          downClimbJugsOk: false,
          matsChecked: false,
          photos: [],
          notes: "",
          settingDate: new Date().toISOString().split("T")[0],
        });
        router.refresh();
      } else {
        setError(data.error || "Failed to create sign-off");
      }
    } catch {
      setError("Failed to create sign-off. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name,
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Sign-off
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Setting Day Sign-off</DialogTitle>
          <DialogDescription>
            Record the completion of a route setting day
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Site *</Label>
                <Select
                  id="location"
                  options={[{ value: "", label: "Select site..." }, ...locationOptions]}
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({ ...formData, locationId: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settingDate">Setting Date *</Label>
                <Input
                  id="settingDate"
                  type="date"
                  value={formData.settingDate}
                  onChange={(e) =>
                    setFormData({ ...formData, settingDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalSetter">External Setter Name *</Label>
              <Input
                id="externalSetter"
                placeholder="Name of external setter"
                value={formData.externalSetterName}
                onChange={(e) =>
                  setFormData({ ...formData, externalSetterName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inHouseSetter">In-house Setter Name *</Label>
              <Input
                id="inHouseSetter"
                placeholder="Name of in-house setter"
                value={formData.inHouseSetterName}
                onChange={(e) =>
                  setFormData({ ...formData, inHouseSetterName: e.target.value })
                }
                required
              />
            </div>

            {/* Safety Checklist */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label className="text-base font-semibold">Safety Checklist</Label>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="climbsTested"
                  checked={formData.climbsTested}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, climbsTested: Boolean(checked) })
                  }
                />
                <div className="space-y-1">
                  <label
                    htmlFor="climbsTested"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Climbs have been tested and changed where needed *
                  </label>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="downClimbJugsOk"
                  checked={formData.downClimbJugsOk}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, downClimbJugsOk: Boolean(checked) })
                  }
                />
                <div className="space-y-1">
                  <label
                    htmlFor="downClimbJugsOk"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Down climb jugs/climbs are in appropriate areas *
                  </label>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="matsChecked"
                  checked={formData.matsChecked}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, matsChecked: Boolean(checked) })
                  }
                />
                <div className="space-y-1">
                  <label
                    htmlFor="matsChecked"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Mats have been checked for objects and hoovered *
                  </label>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label>Photos of the area (up to 5)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste photo URL..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  disabled={formData.photos.length >= 5}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPhoto}
                  disabled={!photoUrl || formData.photos.length >= 5}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </div>
              {formData.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.photos.map((url, index) => (
                    <div
                      key={index}
                      className="relative group bg-muted rounded-md overflow-hidden"
                    >
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="h-16 w-16 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Paste URLs from photo hosting services (e.g., Google Photos, Imgur)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Anything to note from the setting day..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Sign-off"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
