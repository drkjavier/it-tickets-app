import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { scheduleStatusChange } from "@/lib/inngest/functions";

export async function GET(request: NextRequest) {
  try {
    const body = await request.json();
    await scheduleStatusChange(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to process event" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await scheduleStatusChange(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to process event" }, { status: 500 });
  }
}
