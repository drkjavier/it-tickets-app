import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/email/usage-tracker";

export async function GET() {
  try {
    const stats = await getUsageStats();
    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
