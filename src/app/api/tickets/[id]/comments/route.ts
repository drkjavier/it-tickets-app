import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, notFoundResponse } from "@/lib/auth/middleware";
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
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    const comments = await prisma.ticketComment.findMany({
      where: { ticketId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: comments,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
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
        taggedUsers: true,
      },
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    const isTagged = ticket.taggedUsers.some((t) => t.userId === user.id);
    const isCreator = ticket.createdById === user.id;
    const isAssigned = ticket.assignedToId === user.id;
    const isAdminOrIT = user.role === "ADMIN" || user.role === "IT";

    if (!isTagged && !isCreator && !isAssigned && !isAdminOrIT) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No tienes acceso a comentar en este ticket" },
        { status: 403 }
      );
    }

    const { content } = await request.json();

    if (!content) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Contenido es requerido" },
        { status: 400 }
      );
    }

    const sanitizedContent = sanitizeHtml(content);

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: user.id,
        content: sanitizedContent,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: comment,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
