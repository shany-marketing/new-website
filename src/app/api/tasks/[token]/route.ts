import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyStaffToken } from "@/lib/staff-token";

interface Props {
  params: Promise<{ token: string }>;
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { token } = await params;
  const payload = verifyStaffToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  }

  const { staffMemberId, hotelId } = payload;

  // Verify staff member exists
  const members = await query<{ id: string; name: string; position: string | null }>(
    `SELECT id::text, name, position FROM staff_members WHERE id = $1 AND hotel_id = $2`,
    [staffMemberId, hotelId]
  );
  if (members.length === 0) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const staff = members[0];

  // Fetch assigned tasks
  const tasks = await query<{
    id: string;
    category_label: string;
    description: string;
    priority: string;
    status: string;
    due_date: string | null;
    notes: string | null;
    created_at: string;
  }>(
    `SELECT sa.id::text, cc.label AS category_label, sa.description,
            sa.priority, sa.status, sa.due_date::text,
            saa.notes, sa.created_at::text
     FROM staff_action_assignees saa
     JOIN staff_actions sa ON sa.id = saa.staff_action_id
     JOIN consensus_categories cc ON cc.id = sa.category_id
     WHERE saa.staff_member_id = $1 AND sa.hotel_id = $2
     ORDER BY
       CASE sa.status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
       sa.due_date ASC NULLS LAST,
       sa.created_at DESC`,
    [staffMemberId, hotelId]
  );

  // Hotel name
  const hotels = await query<{ name: string }>(
    `SELECT name FROM hotels WHERE id = $1`,
    [hotelId]
  );

  return NextResponse.json({
    staff,
    hotelName: hotels[0]?.name ?? "Hotel",
    tasks,
  });
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { token } = await params;
  const payload = verifyStaffToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  }

  const { staffMemberId, hotelId } = payload;
  const body = await req.json();
  const { taskId, status, notes } = body;

  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  // Verify this task is assigned to this staff member
  const assigned = await query<{ id: string }>(
    `SELECT saa.id::text FROM staff_action_assignees saa
     JOIN staff_actions sa ON sa.id = saa.staff_action_id
     WHERE saa.staff_member_id = $1 AND saa.staff_action_id = $2 AND sa.hotel_id = $3`,
    [staffMemberId, taskId, hotelId]
  );

  if (assigned.length === 0) {
    return NextResponse.json({ error: "Task not assigned to you" }, { status: 403 });
  }

  // Update status on staff_actions
  if (status && ["pending", "in_progress", "completed"].includes(status)) {
    await query(
      `UPDATE staff_actions SET status = $1 WHERE id = $2 AND hotel_id = $3`,
      [status, taskId, hotelId]
    );
  }

  // Update notes on the assignee record
  if (notes !== undefined) {
    await query(
      `UPDATE staff_action_assignees SET notes = $1 WHERE staff_action_id = $2 AND staff_member_id = $3`,
      [notes, taskId, staffMemberId]
    );
  }

  return NextResponse.json({ ok: true });
}
