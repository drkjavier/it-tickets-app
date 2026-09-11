import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, notFoundResponse, forbiddenResponse } from "@/lib/auth/middleware";
import { sanitizeHtml } from "@/lib/sanitize";
import type { ApiResponse } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        project: true,
        createdBy: true,
        assignedTo: true,
        subtasks: {
          orderBy: { createdAt: "asc" },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        taggedUsers: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
        resolutions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    const canViewITData = user.role === "ADMIN" || user.role === "IT";

    const ticketData = {
      ...ticket,
      subtasks: canViewITData ? ticket.subtasks : [],
      resolutions: canViewITData ? ticket.resolutions : [],
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: ticketData,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    if (!user) {
      return unauthorizedResponse();
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    const { title, description, priority, assignedToId, taggedUserIds } = await request.json();

    if (title && title.length > 125) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El título debe tener máximo 125 caracteres" },
        { status: 400 }
      );
    }

    const canAssign = user.role === "ADMIN";
    const canChangeAssignment = canAssign && assignedToId !== undefined;
    const canEditBasic = user.role === "ADMIN";

    if (!canEditBasic && (title || description || priority)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No tienes permisos para editar este ticket" },
        { status: 403 }
      );
    }

    await prisma.ticketTag.deleteMany({ where: { ticketId: id } });

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        title: title || ticket.title,
        description: description ? sanitizeHtml(description) : ticket.description,
        priority: priority || ticket.priority,
        assignedToId: canChangeAssignment ? assignedToId : ticket.assignedToId,
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
        assignedTo: true,
        taggedUsers: { include: { user: true } },
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedTicket,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    await prisma.ticket.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: "Ticket eliminado correctamente" },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
