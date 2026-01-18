import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const recipientId = searchParams.get("recipientId");
    const shiftId = searchParams.get("shiftId");

    let whereClause;
    if (recipientId) {
      // Direct messages between two users
      whereClause = {
        OR: [
          { senderId: session.user.id, receiverId: recipientId },
          { senderId: recipientId, receiverId: session.user.id },
        ],
        shiftId: null,
      };
    } else if (shiftId) {
      // Shift chat messages
      whereClause = { shiftId };
    } else {
      return NextResponse.json({ error: "Missing recipientId or shiftId" }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        reads: {
          select: { userId: true, readAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to get messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, receiverId, shiftId } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!receiverId && !shiftId) {
      return NextResponse.json(
        { error: "Recipient or shift ID is required" },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: session.user.id,
        receiverId: receiverId || null,
        shiftId: shiftId || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create notification for recipient (for direct messages)
    if (receiverId) {
      await prisma.notification.create({
        data: {
          userId: receiverId,
          type: "NEW_MESSAGE",
          title: "New Message",
          message: `${session.user.name} sent you a message`,
          link: `/dashboard/messages?user=${session.user.id}`,
        },
      });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
