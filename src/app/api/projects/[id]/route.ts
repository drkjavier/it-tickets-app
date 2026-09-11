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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        repos: true,
        publishedUrls: true,
        environments: true,
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!project) {
      return notFoundResponse("Proyecto");
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: project,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const { name, abbreviation, repos, publishedUrls, envVars, environments } = await request.json();

    if (abbreviation && abbreviation.length > 5) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "La abreviatura debe tener máximo 5 caracteres" },
        { status: 400 }
      );
    }

    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return notFoundResponse("Proyecto");
    }

    if (abbreviation) {
      const abbreviationExists = await prisma.project.findFirst({
        where: {
          abbreviation: abbreviation.toUpperCase(),
          NOT: { id },
        },
      });

      if (abbreviationExists) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "La abreviatura ya existe" },
          { status: 409 }
        );
      }
    }

    await prisma.repo.deleteMany({ where: { projectId: id } });
    await prisma.publishedUrl.deleteMany({ where: { projectId: id } });
    await prisma.environment.deleteMany({ where: { projectId: id } });

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: name || existing.name,
        abbreviation: abbreviation ? abbreviation.toUpperCase() : existing.abbreviation,
        repos: repos && repos.length > 0
          ? {
              create: repos.map((repo: { name: string; url: string }) => ({
                name: repo.name,
                url: repo.url,
              })),
            }
          : undefined,
        publishedUrls: publishedUrls && publishedUrls.length > 0
          ? {
              create: publishedUrls.map((pub: { name: string; url: string; type: string }) => ({
                name: pub.name,
                url: pub.url,
                type: pub.type,
              })),
            }
          : undefined,
        envVars: envVars !== undefined ? envVars : existing.envVars,
        environments: environments && environments.length > 0
          ? {
              create: environments.map((env: { name: string; url: string; type: string }) => ({
                name: env.name,
                url: env.url,
                type: env.type,
              })),
            }
          : undefined,
      },
      include: {
        repos: true,
        publishedUrls: true,
        environments: true,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: project,
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

    if (user.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const existing = await prisma.project.findUnique({
      where: { id },
      include: {
        tickets: {
          where: {
            status: {
              notIn: ["TERMINATED", "REJECTED"],
            },
          },
        },
      },
    });

    if (!existing) {
      return notFoundResponse("Proyecto");
    }

    if (existing.tickets.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `El proyecto tiene ${existing.tickets.length} ticket(s) activo(s). No se puede eliminar.` },
        { status: 400 }
      );
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: "Proyecto eliminado correctamente" },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
