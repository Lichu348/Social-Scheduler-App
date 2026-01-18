import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MessagesClient } from "@/components/messages-client";

async function getMessagesData(userId: string, organizationId: string) {
  const [users, conversations] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId,
        id: { not: userId },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        shiftId: null,
      },
      select: {
        senderId: true,
        receiverId: true,
        content: true,
        createdAt: true,
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build conversations map
  const conversationsMap = new Map<string, {
    user: { id: string; name: string; email: string };
    lastMessage: string;
    lastMessageAt: Date;
  }>();

  for (const msg of conversations) {
    const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
    if (!otherUser) continue;

    if (!conversationsMap.has(otherUser.id)) {
      conversationsMap.set(otherUser.id, {
        user: otherUser,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
      });
    }
  }

  return {
    users,
    conversations: Array.from(conversationsMap.values()),
  };
}

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { users, conversations } = await getMessagesData(
    session.user.id,
    session.user.organizationId
  );

  return (
    <div className="h-full">
      <MessagesClient
        users={users}
        conversations={conversations}
        currentUserId={session.user.id}
      />
    </div>
  );
}
