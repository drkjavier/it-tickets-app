import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/auth/middleware";
import type { ApiResponse, ResolutionType, BranchType } from "@/types";

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

    if (user.role !== "ADMIN" && user.role !== "IT") {
      return forbiddenResponse();
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        resolutions: true,
      },
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: ticket.resolutions,
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

    if (user.role !== "ADMIN" && user.role !== "IT") {
      return forbiddenResponse();
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return notFoundResponse("Ticket");
    }

    const { type, branchName, branchType, dbScript } = await request.json();

    if (!type) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El tipo de resolución es requerido" },
        { status: 400 }
      );
    }

    // Validar que CODE tenga branchName y branchType
    if (type === "CODE") {
      if (!branchName) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "El nombre de la branch es requerido para resoluciones de código" },
          { status: 400 }
        );
      }
      if (!branchType) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "El tipo de branch (BACKEND/FRONTEND) es requerido para resoluciones de código" },
          { status: 400 }
        );
      }
    }

    // Validar que DATABASE tenga dbScript
    if (type === "DATABASE" && !dbScript) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El script SQL es requerido para resoluciones de base de datos" },
        { status: 400 }
      );
    }

    const resolution = await prisma.ticketResolution.create({
      data: {
        ticketId: id,
        type,
        branchName: type === "CODE" ? branchName : null,
        branchType: type === "CODE" ? branchType : null,
        dbScript: type === "DATABASE" ? dbScript : null,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: resolution,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN" && user.role !== "IT") {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const resolutionId = searchParams.get("resolutionId");

    if (!resolutionId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID de resolución requerido" },
        { status: 400 }
      );
    }

    const resolution = await prisma.ticketResolution.findUnique({
      where: { id: resolutionId },
    });

    if (!resolution) {
      return notFoundResponse("Resolución");
    }

    if (resolution.ticketId !== id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "La resolución no pertenece a este ticket" },
        { status: 400 }
      );
    }

    await prisma.ticketResolution.delete({
      where: { id: resolutionId },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: "Resolución eliminada correctamente" },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
