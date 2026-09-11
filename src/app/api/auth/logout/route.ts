import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST() {
  try {
    await clearAuthCookie();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: "Sesión cerrada correctamente" },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
