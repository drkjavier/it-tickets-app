import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/auth/middleware";
import type { ApiResponse } from "@/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id, subtaskId } = await params;

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role === "USER") {
      return forbiddenResponse();
    }

    const subtask = await prisma.ticketSubtask.findUnique({
      where: { id: subtaskId, ticketId: id },
    });

    if (!subtask) {
      return notFoundResponse("Subtarea");
    }

    const { isCompleted } = await request.json();

    const updatedSubtask = await prisma.ticketSubtask.update({
      where: { id: subtaskId },
      data: { isCompleted: isCompleted ?? !subtask.isCompleted },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedSubtask,
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
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id, subtaskId } = await params;

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role === "USER") {
      return forbiddenResponse();
    }

    const subtask = await prisma.ticketSubtask.findUnique({
      where: { id: subtaskId, ticketId: id },
    });

    if (!subtask) {
      return notFoundResponse("Subtarea");
    }

    await prisma.ticketSubtask.delete({
      where: { id: subtaskId },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: "Subtarea eliminada" },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
