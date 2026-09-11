import { inngest } from "./client";

export async function scheduleStatusChangeNotification(data: {
  ticketId: string;
  fromStatus: string;
  toStatus: string;
  userId: string;
  sentById?: string;
}) {
  await inngest.send({
    name: "ticket/status-change",
    data: {
      ...data,
      timestamp: Date.now(),
    },
  });
}

export async function cancelPendingNotifications(ticketId: string) {
  // Inngest handles deduplication by event ID
  // New events with the same idempotency key cancel previous ones
  await inngest.send({
    name: "ticket/status-change",
    data: {
      ticketId,
      cancelled: true,
      timestamp: Date.now(),
    },
  });
}
