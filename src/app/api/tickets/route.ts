import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/auth/middleware";
import { sanitizeHtml } from "@/lib/sanitize";
import { sendTicketCreatedEmail } from "@/lib/email";
import { scheduleStatusChangeNotification } from "@/lib/inngest/scheduler";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter");
    const status = searchParams.get("status");
    const unassigned = searchParams.get("unassigned");

    const whereClause: Record<string, unknown> = {};

    if (filter === "my-tickets") {
      whereClause.createdById = user.id;
    } else if (filter === "my-assignments") {
      whereClause.assignedToId = user.id;
    } else if (user.role === "USER") {
      whereClause.createdById = user.id;
    } else if (filter === "all" && user.role === "ADMIN") {
      // Admin sees all
    }

    if (status) {
      whereClause.status = status;
    }

    if (unassigned === "true") {
      whereClause.assignedToId = null;
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, name: true, abbreviation: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { comments: true, subtasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: tickets,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const { title, description, priority, projectId, taggedUserIds } = await request.json();

    if (!title || !description || !priority || !projectId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (title.length > 125) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El título debe tener máximo 125 caracteres" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    const code = `${project.abbreviation}-${Date.now().toString(36).toUpperCase()}`;

    const sanitizedDescription = sanitizeHtml(description);

    const ticket = await prisma.ticket.create({
      data: {
        code,
        title,
        description: sanitizedDescription,
        priority,
        projectId,
        createdById: user.id,
        statusHistory: {
          create: {
            toStatus: "CREATED",
          },
        },
        taggedUsers: taggedUserIds?.length
          ? {
              create: taggedUserIds.map((taggedUserId: string) => ({
                userId: taggedUserId,
              })),
            }
          : undefined,
      },
      include: {
        project: true,
        createdBy: true,
        taggedUsers: { include: { user: true } },
      },
    });

    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });

    const recipients = [
      user.email,
      ...adminUsers.map((a) => a.email),
      ...ticket.taggedUsers.map((t) => t.user.email),
    ];

    await sendTicketCreatedEmail(code, ticket.id, ticket.title, recipients);

    await scheduleStatusChangeNotification({
      ticketId: ticket.id,
      fromStatus: "",
      toStatus: "CREATED",
      userId: user.id,
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("POST /api/tickets error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
