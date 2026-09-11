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

    const project = await prisma.project.findUnique({
      where: { id },
      include: { environments: true },
    });

    if (!project) {
      return notFoundResponse("Proyecto");
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: project.environments,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
