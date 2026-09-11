import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/auth/middleware";
import bcrypt from "bcryptjs";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    const whereClause: Record<string, unknown> = {};
    if (role) {
      whereClause.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const usersWithTicketCount = users.map((u) => ({
      ...u,
      totalTickets: u._count.createdTickets + u._count.assignedTickets,
      _count: undefined,
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: usersWithTicketCount,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthUser();

    if (!currentUser) {
      return unauthorizedResponse();
    }

    if (currentUser.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { email, name, role, password } = body;

    if (!email || !name || !role || !password) {
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
        { success: false, error: "El email ya está registrado" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json<ApiResponse>(
      { success: true, data: newUser },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getAuthUser();

    if (!currentUser) {
      return unauthorizedResponse();
    }

    if (currentUser.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    if (userId === currentUser.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No puedes eliminarte a ti mismo" },
        { status: 400 }
      );
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true,
          },
        },
      },
    });

    if (!userToDelete) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const totalTickets = userToDelete._count.createdTickets + userToDelete._count.assignedTickets;

    if (totalTickets > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `El usuario tiene ${totalTickets} ticket(s) activos. No se puede eliminar.` },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: "Usuario eliminado correctamente" },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getAuthUser();

    if (!currentUser) {
      return unauthorizedResponse();
    }

    if (currentUser.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { userId, action, newPassword, newName } = body;

    if (!userId || !action) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID de usuario y acción requeridos" },
        { status: 400 }
      );
    }

    if (action === "resetPassword") {
      if (!newPassword) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Nueva contraseña requerida" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { message: "Contraseña reiniciada correctamente" },
      });
    }

    if (action === "updateName") {
      if (!newName || newName.trim().length < 2) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "El nombre debe tener al menos 2 caracteres" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name: newName.trim() },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: updatedUser,
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "Acción no válida" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
