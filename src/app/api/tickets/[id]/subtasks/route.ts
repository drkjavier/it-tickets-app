import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/auth/middleware";
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

    if (user.role === "USER") {
      return forbiddenResponse();
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    const subtasks = await prisma.ticketSubtask.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: subtasks,
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

    if (user.role === "USER") {
      return forbiddenResponse();
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Título es requerido" },
        { status: 400 }
      );
    }

    const subtask = await prisma.ticketSubtask.create({
      data: {
        ticketId: id,
        title,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: subtask,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
