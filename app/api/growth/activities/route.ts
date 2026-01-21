import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Default activities to seed for new organizations
const DEFAULT_ACTIVITIES = [
  // Membership activities
  { name: "Follow up trial visitor", description: "Call or email someone who had a trial session within 48 hours", category: "MEMBERSHIP", activityType: "LEAD_GEN", points: 10, suggestedFreq: "DAILY" },
  { name: "Contact lapsed member", description: "Reach out to a member who hasn't visited in 30+ days", category: "MEMBERSHIP", activityType: "RETENTION", points: 8, suggestedFreq: "WEEKLY" },
  { name: "Give facility tour", description: "Show a prospective member around the centre", category: "MEMBERSHIP", activityType: "CONVERSION", points: 10, suggestedFreq: "DAILY" },
  { name: "Post social media content", description: "Share engaging content about the centre/community", category: "MEMBERSHIP", activityType: "LEAD_GEN", points: 5, suggestedFreq: "DAILY" },
  { name: "Ask for member referral", description: "Ask a happy member to refer friends/family", category: "MEMBERSHIP", activityType: "LEAD_GEN", points: 5, suggestedFreq: "DAILY" },
  { name: "New member check-in", description: "Personal check-in with member in their first month", category: "MEMBERSHIP", activityType: "RETENTION", points: 8, suggestedFreq: "WEEKLY" },
  { name: "Convert day pass to membership", description: "Discuss membership benefits with day pass visitors", category: "MEMBERSHIP", activityType: "CONVERSION", points: 10, suggestedFreq: "DAILY" },
  { name: "Local business partnership outreach", description: "Contact local businesses about corporate rates", category: "MEMBERSHIP", activityType: "OUTREACH", points: 10, suggestedFreq: "WEEKLY" },

  // Kids Club activities
  { name: "School outreach contact", description: "Call/email a school about climbing sessions or trips", category: "KIDS_CLUB", activityType: "OUTREACH", points: 10, suggestedFreq: "WEEKLY" },
  { name: "Promote holiday camp", description: "Share holiday camp info with parents/on social", category: "KIDS_CLUB", activityType: "LEAD_GEN", points: 5, suggestedFreq: "WEEKLY" },
  { name: "Parent progress update", description: "Update a parent on their child's climbing progress", category: "KIDS_CLUB", activityType: "RETENTION", points: 5, suggestedFreq: "WEEKLY" },
  { name: "Birthday party upsell", description: "Mention kids club to birthday party parents", category: "KIDS_CLUB", activityType: "CONVERSION", points: 8, suggestedFreq: "WEEKLY" },
  { name: "Kids taster session follow-up", description: "Follow up with family after kids taster session", category: "KIDS_CLUB", activityType: "CONVERSION", points: 10, suggestedFreq: "DAILY" },
  { name: "Scout/Guide group contact", description: "Reach out to local scout or guide groups", category: "KIDS_CLUB", activityType: "OUTREACH", points: 10, suggestedFreq: "MONTHLY" },

  // External Groups activities
  { name: "Corporate enquiry follow-up", description: "Follow up on a corporate/team building enquiry", category: "EXTERNAL_GROUPS", activityType: "CONVERSION", points: 10, suggestedFreq: "DAILY" },
  { name: "Corporate outreach call", description: "Proactively contact businesses about team events", category: "EXTERNAL_GROUPS", activityType: "OUTREACH", points: 10, suggestedFreq: "WEEKLY" },
  { name: "School trip follow-up", description: "Follow up with school after their visit about rebooking", category: "EXTERNAL_GROUPS", activityType: "RETENTION", points: 8, suggestedFreq: "WEEKLY" },
  { name: "Send group booking proposal", description: "Send formal proposal/quote to potential group", category: "EXTERNAL_GROUPS", activityType: "CONVERSION", points: 10, suggestedFreq: "WEEKLY" },
  { name: "Attend networking event", description: "Attend local business networking to promote centre", category: "EXTERNAL_GROUPS", activityType: "OUTREACH", points: 15, suggestedFreq: "MONTHLY" },
  { name: "Annual rebooking contact", description: "Contact previous group about booking again", category: "EXTERNAL_GROUPS", activityType: "RETENTION", points: 8, suggestedFreq: "MONTHLY" },
];

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const activities = await prisma.growthActivity.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(category && { category }),
        ...(activeOnly && { isActive: true }),
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Get growth activities error:", error);
    return NextResponse.json({ error: "Failed to get activities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Check if this is a seed request
    if (body.seed === true) {
      // Check if activities already exist
      const existing = await prisma.growthActivity.count({
        where: { organizationId: session.user.organizationId },
      });

      if (existing > 0) {
        return NextResponse.json({ message: "Activities already seeded", count: existing });
      }

      // Seed default activities
      const activities = await prisma.growthActivity.createMany({
        data: DEFAULT_ACTIVITIES.map((a, i) => ({
          ...a,
          sortOrder: i,
          organizationId: session.user.organizationId,
        })),
      });

      return NextResponse.json({ message: "Activities seeded", count: activities.count });
    }

    // Create single activity
    const { name, description, category, activityType, points, suggestedFreq } = body;

    if (!name || !category || !activityType) {
      return NextResponse.json({ error: "Name, category, and activity type are required" }, { status: 400 });
    }

    const activity = await prisma.growthActivity.create({
      data: {
        name,
        description,
        category,
        activityType,
        points: points || 5,
        suggestedFreq: suggestedFreq || "WEEKLY",
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Create growth activity error:", error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
