import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnread, markRead, markAllRead } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await getUnread(session.user.id);
  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { notificationId, markAll } = body;

  if (markAll) {
    await markAllRead(session.user.id);
  } else if (notificationId) {
    await markRead(notificationId, session.user.id);
  } else {
    return NextResponse.json({ error: "Missing notificationId or markAll" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
