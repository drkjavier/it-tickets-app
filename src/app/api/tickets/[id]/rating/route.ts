import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, notFoundResponse, forbiddenResponse } from "@/lib/auth/middleware";
import type { ApiResponse } from "@/types";

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
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    if (ticket.status !== "TERMINATED") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Solo se puede calificar tickets terminados" },
        { status: 400 }
      );
    }

    if (ticket.createdById !== user.id) {
      return forbiddenResponse();
    }

    const { rating } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Rating debe ser entre 1 y 5 estrellas" },
        { status: 400 }
      );
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { rating },
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
