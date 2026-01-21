"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Eye, Trash2, CheckCircle, XCircle, MapPin, User, Calendar } from "lucide-react";

interface SettingSignoff {
  id: string;
  externalSetterName: string;
  inHouseSetterName: string;
  climbsTested: boolean;
  downClimbJugsOk: boolean;
  matsChecked: boolean;
  photos: string;
  notes: string | null;
  settingDate: Date;
  createdAt: Date;
  signedOffBy: { id: string; name: string; email: string };
  location: { id: string; name: string };
}

interface SettingSignoffDetailProps {
  signoff: SettingSignoff;
  isAdmin: boolean;
}

export function SettingSignoffDetail({ signoff, isAdmin }: SettingSignoffDetailProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const photos = JSON.parse(signoff.photos || "[]");

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this sign-off? This cannot be undone.")) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/setting-signoffs/${signoff.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete sign-off");
      }
    } catch {
      alert("Failed to delete sign-off. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setting Day Sign-off</DialogTitle>
          <DialogDescription>
            {signoff.location.name} - {formatDate(signoff.settingDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Location & Date */}
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              {signoff.location.name}
            </Badge>
            <Badge variant="outline" className="text-sm">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(signoff.settingDate)}
            </Badge>
          </div>

          {/* Setters */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">External Setter</p>
              <p className="font-medium">{signoff.externalSetterName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In-house Setter</p>
              <p className="font-medium">{signoff.inHouseSetterName}</p>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <p className="font-semibold">Safety Checklist</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {signoff.climbsTested ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm">Climbs tested and changed where needed</span>
              </div>
              <div className="flex items-center gap-2">
                {signoff.downClimbJugsOk ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm">Down climb jugs in appropriate areas</span>
              </div>
              <div className="flex items-center gap-2">
                {signoff.matsChecked ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm">Mats checked for objects and hoovered</span>
              </div>
            </div>
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold">Photos ({photos.length})</p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((url: string, index: number) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={url}
                      alt={`Setting photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E";
                      }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {signoff.notes && (
            <div className="space-y-2">
              <p className="font-semibold">Notes</p>
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                {signoff.notes}
              </p>
            </div>
          )}

          {/* Signed off by */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-4 w-4" />
              Signed off by <span className="font-medium">{signoff.signedOffBy.name}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted on {formatDate(signoff.createdAt)}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isAdmin && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
