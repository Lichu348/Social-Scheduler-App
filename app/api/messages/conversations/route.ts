import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users the current user has exchanged messages with
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
        ],
        shiftId: null, // Only direct messages
      },
      select: {
        senderId: true,
        receiverId: true,
        content: true,
        createdAt: true,
        sender: {
          select: { id: true, name: true, email: true },
        },
        receiver: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build conversations map
    const conversationsMap = new Map<string, {
      user: { id: string; name: string; email: string };
      lastMessage: string;
      lastMessageAt: Date;
    }>();

    for (const msg of messages) {
      const otherUser = msg.senderId === session.user.id ? msg.receiver : msg.sender;
      if (!otherUser) continue;

      if (!conversationsMap.has(otherUser.id)) {
        conversationsMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: "Failed to get conversations" },
      { status: 500 }
    );
  }
}
