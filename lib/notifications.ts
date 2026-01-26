import { prisma } from "@/lib/db";
import { sendPushNotification, sendPushToUsers } from "@/lib/push";

interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(data: NotificationData) {
  const notification = await prisma.notification.create({ data });

  // Fire-and-forget push notification
  sendPushNotification(data.userId, {
    title: data.title,
    body: data.message,
    link: data.link,
    tag: data.type,
    icon: "/icons/icon-192.png",
  }).catch(() => {});

  return notification;
}

export async function createNotifications(dataArray: NotificationData[]) {
  if (dataArray.length === 0) return;

  await prisma.notification.createMany({ data: dataArray });

  // Fire-and-forget push notifications
  const userIds = [...new Set(dataArray.map((d) => d.userId))];
  const payload = {
    title: dataArray[0].title,
    body: dataArray[0].message,
    link: dataArray[0].link,
    tag: dataArray[0].type,
    icon: "/icons/icon-192.png",
  };

  sendPushToUsers(userIds, payload).catch(() => {});
}
