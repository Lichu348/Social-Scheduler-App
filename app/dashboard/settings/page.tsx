import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile-form";
import { PasswordForm } from "@/components/password-form";
import { OrganizationForm } from "@/components/organization-form";
import { ShiftCategoriesManager } from "@/components/shift-categories-manager";
import { BreakRulesForm } from "@/components/break-rules-form";
import { ClockSettingsForm } from "@/components/clock-settings-form";
import { LocationSettingsForm } from "@/components/location-settings-form";
import { LocationsManager } from "@/components/locations-manager";
import { StaffRolesManager } from "@/components/staff-roles-manager";
import { AvailabilityForm } from "@/components/availability-form";

async function getSettingsData(userId: string, organizationId: string) {
  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        timezone: true,
        breakRules: true,
        clockInWindowMinutes: true,
        clockOutGraceMinutes: true,
        shiftReminderHours: true,
        locationLatitude: true,
        locationLongitude: true,
        clockInRadiusMetres: true,
        requireGeolocation: true,
      },
    }),
  ]);

  return { user, organization };
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { user, organization } = await getSettingsData(
    session.user.id,
    session.user.organizationId
  );

  if (!user || !organization) return null;

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} />
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>

        {/* Organization Settings (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>
                Manage your organization settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationForm organization={organization} />
            </CardContent>
          </Card>
        )}

        {/* Staff Roles (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Staff Roles</CardTitle>
              <CardDescription>
                Configure job roles for your team (e.g., Front Desk, Coach, Setter)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StaffRolesManager />
            </CardContent>
          </Card>
        )}

        {/* Shift Categories (Manager/Admin only) */}
        {(session.user.role === "MANAGER" || session.user.role === "ADMIN") && (
          <Card>
            <CardHeader>
              <CardTitle>Shift Categories</CardTitle>
              <CardDescription>
                Manage shift types and their hourly pay rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShiftCategoriesManager />
            </CardContent>
          </Card>
        )}

        {/* Break Rules (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Automatic Breaks</CardTitle>
              <CardDescription>
                Configure automatic break times based on shift duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BreakRulesForm breakRules={organization.breakRules} />
            </CardContent>
          </Card>
        )}

        {/* Clock & Reminder Settings (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Time Clock Settings</CardTitle>
              <CardDescription>
                Configure clock-in windows and shift reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClockSettingsForm
                clockInWindowMinutes={organization.clockInWindowMinutes}
                clockOutGraceMinutes={organization.clockOutGraceMinutes}
                shiftReminderHours={organization.shiftReminderHours}
              />
            </CardContent>
          </Card>
        )}

        {/* Location Settings (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Location Settings</CardTitle>
              <CardDescription>
                Configure geolocation requirements for clock-in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationSettingsForm
                locationLatitude={organization.locationLatitude}
                locationLongitude={organization.locationLongitude}
                clockInRadiusMetres={organization.clockInRadiusMetres}
                requireGeolocation={organization.requireGeolocation}
              />
            </CardContent>
          </Card>
        )}

        {/* Multiple Locations (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Gym Locations</CardTitle>
              <CardDescription>
                Manage multiple gym sites and their clock-in zones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationsManager />
            </CardContent>
          </Card>
        )}

        {/* Staff Availability (All users) */}
        <Card>
          <CardHeader>
            <CardTitle>My Availability</CardTitle>
            <CardDescription>
              Set your regular weekly availability for scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilityForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
