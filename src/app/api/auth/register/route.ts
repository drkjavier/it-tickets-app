import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/auth/middleware";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthUser();

    if (!currentUser) {
      return unauthorizedResponse();
    }

    if (currentUser.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El usuario ya existe" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role || "USER",
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
