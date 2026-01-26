import webpush from "web-push";
import { prisma } from "@/lib/db";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  link?: string;
  tag?: string;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : undefined;
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        throw err;
      }
    })
  );

  return results;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
) {
  await Promise.allSettled(
    userIds.map((userId) => sendPushNotification(userId, payload))
  );
}
