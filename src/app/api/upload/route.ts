import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/auth/middleware";
import { uploadImage } from "@/lib/cloudinary";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Archivo es requerido" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadImage(buffer, `it-tickets/${user.id}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { url: imageUrl },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al subir archivo" },
      { status: 500 }
    );
  }
}
