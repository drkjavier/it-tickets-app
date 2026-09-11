import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/auth/middleware";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
