import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, notFoundResponse, forbiddenResponse } from "@/lib/auth/middleware";
import type { ApiResponse } from "@/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    if (!user) {
      return unauthorizedResponse();
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return notFoundResponse("Notificación");
    }

    if (notification.userId !== user.id) {
      return forbiddenResponse();
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedNotification,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
