import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import type { AuthUser } from "@/types";

export async function authMiddleware(
  request: NextRequest
): Promise<AuthUser | null> {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) return null;

  return verifyToken(token).then((payload) => {
    if (!payload) return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.sub,
      role: payload.role,
    };
  });
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export function forbiddenResponse() {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}

export function badRequestResponse(error: string) {
  return NextResponse.json(
    { success: false, error },
    { status: 400 }
  );
}

export function notFoundResponse(resource: string = "Resource") {
  return NextResponse.json(
    { success: false, error: `${resource} not found` },
    { status: 404 }
  );
}

export function serverErrorResponse(error: string) {
  return NextResponse.json(
    { success: false, error },
    { status: 500 }
  );
}
