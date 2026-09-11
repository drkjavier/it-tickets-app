import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import {
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/auth/middleware";
import { scheduleStatusChangeNotification } from "@/lib/inngest/scheduler";
import { sendTicketAssignedEmail, sendNotificationEmail } from "@/lib/email";
import type { ApiResponse, TicketStatus } from "@/types";

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  CREATED: ["EN_COURSE"],
  EN_COURSE: ["IN_REVIEW"],
  IN_REVIEW: ["TERMINATED", "REJECTED", "EN_COURSE"],
  REJECTED: ["EN_COURSE"],
  TERMINATED: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    if (!user) {
      return unauthorizedResponse();
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: true,
        assignedTo: true,
        taggedUsers: { include: { user: true } },
      },
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    const { status, assignedToId } = await request.json();

    if (status) {
      console.log("[Status Change] Attempting transition:", {
        ticketId: id,
        currentStatus: ticket.status,
        requestedStatus: status,
        userId: user.id,
        userRole: user.role,
        isCreator: ticket.createdById === user.id,
      });

      const validTransitions = VALID_TRANSITIONS[ticket.status];
      console.log(
        "[Status Change] Valid transitions from current status:",
        validTransitions,
      );

      if (!validTransitions.includes(status)) {
        console.log("[Status Change] Invalid transition rejected");
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `Transición de ${ticket.status} a ${status} no es válida`,
          },
          { status: 400 },
        );
      }

      if (
        (status === "TERMINATED" || status === "REJECTED") &&
        ticket.createdById !== user.id &&
        user.role !== "ADMIN"
      ) {
        console.log(
          "[Status Change] Permission denied for TERMINATED/REJECTED:",
          {
            createdById: ticket.createdById,
            userId: user.id,
            userRole: user.role,
          },
        );
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error:
              "Solo el creador o un administrador pueden aprobar o rechazar",
          },
          { status: 403 },
        );
      }

      if (
        (status === "CREATED" ||
          status === "EN_COURSE" ||
          status === "IN_REVIEW") &&
        user.role === "USER"
      ) {
        return forbiddenResponse();
      }

      const lastHistory = await prisma.ticketStatusHistory.findFirst({
        where: { ticketId: id },
        orderBy: { createdAt: "desc" },
      });

      const now = new Date();
      let durationSeconds: number | null = null;

      if (lastHistory) {
        durationSeconds = Math.floor(
          (now.getTime() - lastHistory.createdAt.getTime()) / 1000,
        );
        await prisma.ticketStatusHistory.update({
          where: { id: lastHistory.id },
          data: { durationSeconds },
        });
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: { status },
        include: {
          project: true,
          createdBy: true,
          assignedTo: true,
        },
      });

      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: status,
        },
      });

      if (status === "TERMINATED") {
        const totalDuration = await prisma.ticketStatusHistory.aggregate({
          where: { ticketId: id },
          _sum: { durationSeconds: true },
        });

        await prisma.ticket.update({
          where: { id },
          data: { durationSeconds: totalDuration._sum.durationSeconds },
        });
      }

      await scheduleStatusChangeNotification({
        ticketId: id,
        fromStatus: ticket.status,
        toStatus: status,
        userId: user.id,
        sentById: user.id,
      });

      // Enviar correos solo para cambios específicos:
      // - Ticket creado (ya se envía en la creación)
      // - EN_COURSE -> IN_REVIEW
      // - IN_REVIEW -> TERMINATED
      // - IN_REVIEW -> REJECTED
      if (
        (ticket.status === "IN_REVIEW" && status === "TERMINATED") ||
        (ticket.status === "IN_REVIEW" && status === "REJECTED") ||
        (ticket.status === "CREATED" && status === "EN_COURSE") ||
        (ticket.status === "EN_COURSE" && status === "IN_REVIEW")
      ) {
        const recipients = [
          ticket.createdBy.email,
          ...ticket.taggedUsers.map((t) => t.user.email),
        ];
        if (ticket.assignedTo) {
          recipients.push(ticket.assignedTo.email);
        }

        await sendNotificationEmail(
          ticket.code,
          ticket.id,
          ticket.title,
          ticket.status,
          status,
          recipients,
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: updatedTicket,
      });
    }

    if (assignedToId !== undefined) {
      const isSelfAssign = assignedToId === user.id;
      const isTaggedUser = ticket.taggedUsers.some((t) => t.userId === user.id);

      // ADMIN puede asignar a cualquiera, IT solo puede asignarse a sí mismo si está tagueado
      const canAssign =
        user.role === "ADMIN" ||
        (user.role === "IT" && isSelfAssign && isTaggedUser);

      if (!canAssign) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "No tienes permisos para esta asignación" },
          { status: 403 },
        );
      }

      if (isSelfAssign && ticket.assignedToId === user.id) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Ya estás asignado a este ticket" },
          { status: 400 },
        );
      }

      let assignee = null;
      if (assignedToId) {
        assignee = await prisma.user.findUnique({
          where: { id: assignedToId },
        });

        if (!assignee) {
          return notFoundResponse("Usuario");
        }

        if (assignee.role !== "IT" && assignee.role !== "ADMIN") {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: "Solo se puede asignar a usuarios IT o Admin",
            },
            { status: 400 },
          );
        }
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: { assignedToId },
        include: {
          project: true,
          createdBy: true,
          assignedTo: true,
        },
      });

      if (assignee && ticket.status === "CREATED") {
        await prisma.ticket.update({
          where: { id },
          data: { status: "EN_COURSE" },
        });

        await prisma.ticketStatusHistory.create({
          data: {
            ticketId: id,
            fromStatus: "CREATED",
            toStatus: "EN_COURSE",
          },
        });
      }

      const recipients = [
        ticket.createdBy.email,
        ...ticket.taggedUsers.map((t) => t.user.email),
      ];
      if (assignee) {
        recipients.push(assignee.email);
      }

      await sendTicketAssignedEmail(
        ticket.code,
        ticket.id,
        ticket.title,
        assignee?.name || "Sin asignar",
        recipients,
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: updatedTicket,
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "Se requiere estado o asignación" },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
