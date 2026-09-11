import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getAuthUser, clearAuthCookie } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/auth/middleware";
import type { ApiResponse, AuthUser } from "@/types";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      await clearAuthCookie();
      return unauthorizedResponse();
    }

    return NextResponse.json<ApiResponse<AuthUser>>({
      success: true,
      data: dbUser,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const { currentPassword, newPassword, name } = await request.json();

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Contraseña actual es requerida" },
          { status: 400 }
        );
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser) {
        return unauthorizedResponse();
      }

      const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);

      if (!isValid) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Contraseña actual incorrecta" },
          { status: 401 }
        );
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          name: name || dbUser.name,
        },
      });
    } else if (name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: "Perfil actualizado correctamente" },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
