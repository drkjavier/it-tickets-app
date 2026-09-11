import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/auth/middleware";
import type { ApiResponse, TicketStatus } from "@/types";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const userTickets = await prisma.ticket.findMany({
      where: { createdById: user.id },
      select: { status: true },
    });

    const ticketsByStatus: Record<TicketStatus, number> = {
      CREATED: 0,
      EN_COURSE: 0,
      IN_REVIEW: 0,
      REJECTED: 0,
      TERMINATED: 0,
    };

    userTickets.forEach((ticket) => {
      ticketsByStatus[ticket.status]++;
    });

    const baseStats: {
      totalMyTickets: number;
      ticketsByStatus: Record<TicketStatus, number>;
      assignedTickets?: {
        total: number;
        byStatus: Record<TicketStatus, number>;
      };
      adminStats?: {
        rejectedByUser: { name: string; count: number }[];
        avgRating: number;
        totalRatings: number;
      };
    } = {
      totalMyTickets: userTickets.length,
      ticketsByStatus,
    };

    if (user.role === "ADMIN" || user.role === "IT") {
      const assignedTickets = await prisma.ticket.findMany({
        where: { assignedToId: user.id },
        select: { status: true },
      });

      const assignedByStatus: Record<TicketStatus, number> = {
        CREATED: 0,
        EN_COURSE: 0,
        IN_REVIEW: 0,
        REJECTED: 0,
        TERMINATED: 0,
      };

      assignedTickets.forEach((ticket) => {
        assignedByStatus[ticket.status]++;
      });

      baseStats.assignedTickets = {
        total: assignedTickets.length,
        byStatus: assignedByStatus,
      };
    }

    if (user.role === "ADMIN") {
      const allTickets = await prisma.ticket.findMany({
        select: {
          status: true,
          assignedToId: true,
          assignedTo: { select: { name: true } },
          rating: true,
        },
      });

      const rejectedByUser: Record<string, { name: string; count: number }> = {};
      const ratings: number[] = [];

      allTickets.forEach((ticket) => {
        if (ticket.status === "REJECTED" && ticket.assignedTo) {
          const name = ticket.assignedTo.name;
          if (!rejectedByUser[name]) {
            rejectedByUser[name] = { name, count: 0 };
          }
          rejectedByUser[name].count++;
        }

        if (ticket.rating) {
          ratings.push(ticket.rating);
        }
      });

      const avgRating =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;

      baseStats.adminStats = {
        rejectedByUser: Object.values(rejectedByUser),
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.length,
      };
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: baseStats,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
