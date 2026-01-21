import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.shiftTemplate.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
            color: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Get shift template error:", error);
    return NextResponse.json(
      { error: "Failed to get shift template" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can update templates
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify template belongs to organization
    const existingTemplate = await prisma.shiftTemplate.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const { name, startTime, endTime, categoryId, defaultTitle, description, isActive, locationId } =
      await req.json();

    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      return NextResponse.json(
        { error: "Invalid start time format. Use HH:mm format" },
        { status: 400 }
      );
    }
    if (endTime && !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "Invalid end time format. Use HH:mm format" },
        { status: 400 }
      );
    }

    // If categoryId provided, verify it belongs to the organization
    if (categoryId) {
      const category = await prisma.shiftCategory.findFirst({
        where: {
          id: categoryId,
          organizationId: session.user.organizationId,
        },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }

    // If locationId provided (not empty string), verify it belongs to the organization
    if (locationId) {
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          organizationId: session.user.organizationId,
        },
      });
      if (!location) {
        return NextResponse.json(
          { error: "Invalid location" },
          { status: 400 }
        );
      }
    }

    const template = await prisma.shiftTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(defaultTitle !== undefined && { defaultTitle: defaultTitle || null }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive !== undefined && { isActive }),
        ...(locationId !== undefined && { locationId: locationId || null }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
            color: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Update shift template error:", error);
    return NextResponse.json(
      { error: "Failed to update shift template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can delete templates
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify template belongs to organization
    const template = await prisma.shiftTemplate.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false (preserves shift history)
    // Or hard delete if no shifts reference this template
    const shiftsUsingTemplate = await prisma.shift.count({
      where: { templateId: id },
    });

    if (shiftsUsingTemplate > 0) {
      // Soft delete - just deactivate
      await prisma.shiftTemplate.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete - no shifts reference this template
      await prisma.shiftTemplate.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete shift template error:", error);
    return NextResponse.json(
      { error: "Failed to delete shift template" },
      { status: 500 }
    );
  }
}
