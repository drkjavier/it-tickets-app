import { inngest } from "./client";

export { inngest };

export async function sendNotification(data: {
  ticketId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
}) {
  const { ticketId, userId, title, message, type } = data;

  const { default: prisma } = await import("@/lib/prisma");
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      payload: { ticketId },
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.email) {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: [user.email],
      subject: title,
      html: `<p>${message}</p>`,
    });
  }

}

export async function processStatusChange(data: {
  ticketId: string;
  fromStatus: string;
  toStatus: string;
}) {
  const { ticketId, fromStatus, toStatus } = data;

  const { default: prisma } = await import("@/lib/prisma");
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: true,
      assignedTo: true,
      taggedUsers: { include: { user: true } },
    },
  });

  if (!ticket) return;

  if (ticket.status !== toStatus) {
    return;
  }

  // Solo enviar correos para cambios específicos:
  // - EN_COURSE -> IN_REVIEW
  // - IN_REVIEW -> TERMINATED
  // - IN_REVIEW -> REJECTED
  if (
    (fromStatus === "EN_COURSE" && toStatus === "IN_REVIEW") ||
    (fromStatus === "IN_REVIEW" && toStatus === "TERMINATED") ||
    (fromStatus === "IN_REVIEW" && toStatus === "REJECTED")
  ) {
    const { sendNotificationEmail } = await import("@/lib/email");
    const recipients = [
      ticket.createdBy.email,
      ...ticket.taggedUsers.map((t) => t.user.email),
    ];
    if (ticket.assignedTo) {
      recipients.push(ticket.assignedTo.email);
    }

    await sendNotificationEmail(ticket.code, ticket.id, ticket.title, fromStatus, toStatus, recipients);
  }
}

export async function scheduleStatusChange(data: {
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
