import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/auth/middleware";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const projects = await prisma.project.findMany({
      include: {
        repos: true,
        publishedUrls: true,
        environments: true,
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: projects,
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
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const { name, abbreviation, repos, publishedUrls, envVars, environments } = await request.json();

    if (!name || !abbreviation) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Nombre y abreviatura son requeridos" },
        { status: 400 }
      );
    }

    if (abbreviation.length > 5) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "La abreviatura debe tener máximo 5 caracteres" },
        { status: 400 }
      );
    }

    const existing = await prisma.project.findUnique({
      where: { abbreviation: abbreviation.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "La abreviatura ya existe" },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        abbreviation: abbreviation.toUpperCase(),
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
        envVars: envVars || null,
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
