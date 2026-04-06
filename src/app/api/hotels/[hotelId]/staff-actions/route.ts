import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { checkFeatureAccess } from "@/lib/plan";
import { requireHotelAccess } from "@/lib/auth";
import { notifyAssignees } from "@/lib/staff-notifications";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const month = searchParams.get("month");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignee = searchParams.get("assignee");

    let sql = `
      SELECT sa.id::text, cc.label AS category, cc.id::text AS category_id,
             sa.period_month::text, sa.action_date::text,
             sa.staff_name, sa.description, sa.created_at::text,
             sa.due_date::text, sa.status, sa.priority,
             sa.completed_at::text, sa.notes,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', sm.id::text,
                   'name', sm.name,
                   'email', sm.email
                 )
               ) FILTER (WHERE sm.id IS NOT NULL),
               '[]'::json
             ) AS assignees
      FROM staff_actions sa
      JOIN consensus_categories cc ON cc.id = sa.category_id
      LEFT JOIN staff_action_assignees saa ON saa.staff_action_id = sa.id
      LEFT JOIN staff_members sm ON sm.id = saa.staff_member_id
      WHERE sa.hotel_id = $1`;
    const values: unknown[] = [hotelId];

    if (category) {
      values.push(category);
      sql += ` AND cc.label = $${values.length}`;
    }
    if (month) {
      values.push(month);
      sql += ` AND sa.period_month = $${values.length}`;
    }
    if (status) {
      values.push(status);
      sql += ` AND sa.status = $${values.length}`;
    }
    if (priority) {
      values.push(priority);
      sql += ` AND sa.priority = $${values.length}`;
    }
    if (assignee) {
      values.push(assignee);
      sql += ` AND EXISTS (SELECT 1 FROM staff_action_assignees saa2 WHERE saa2.staff_action_id = sa.id AND saa2.staff_member_id = $${values.length})`;
    }

    sql += ` GROUP BY sa.id, cc.label, cc.id
             ORDER BY
               CASE sa.status
                 WHEN 'pending' THEN 0
                 WHEN 'in_progress' THEN 1
                 WHEN 'completed' THEN 2
               END,
               CASE sa.priority
                 WHEN 'urgent' THEN 0
                 WHEN 'high' THEN 1
                 WHEN 'medium' THEN 2
                 WHEN 'low' THEN 3
               END,
               sa.due_date ASC NULLS LAST,
               sa.action_date DESC`;

    const rows = await query(sql, values);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Staff actions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch staff actions" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    if (!(await checkFeatureAccess(hotelId, "staff_actions"))) {
      return NextResponse.json(
        { error: "Staff action tracking requires the Analytics add-on" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { categoryId, periodMonth: rawMonth, actionDate, staffName, description, dueDate, priority, assigneeIds } = body;

    // Normalize periodMonth to YYYY-MM-01 (DB stores as DATE first-of-month)
    const periodMonth = rawMonth?.length === 7 ? rawMonth + "-01" : rawMonth;

    // staffName is optional if assigneeIds are provided
    const effectiveStaffName = staffName?.trim() || "";
    if (!categoryId || !periodMonth || !actionDate || !description?.trim()) {
      return NextResponse.json({ error: "Category, month, date, and description are required" }, { status: 400 });
    }

    // Validate category belongs to hotel
    const cat = await queryOne(
      `SELECT id FROM consensus_categories WHERE id = $1 AND hotel_id = $2`,
      [categoryId, hotelId]
    );
    if (!cat) {
      return NextResponse.json({ error: "Category not found for this hotel" }, { status: 404 });
    }

    // If assigneeIds provided but no staffName, build it from member names
    let resolvedStaffName = effectiveStaffName;
    if (!resolvedStaffName && assigneeIds?.length > 0) {
      const members = await query<{ name: string }>(
        `SELECT name FROM staff_members WHERE id = ANY($1::uuid[]) AND hotel_id = $2 ORDER BY name`,
        [assigneeIds, hotelId]
      );
      resolvedStaffName = members.map((m) => m.name).join(" / ");
    }

    const created = await queryOne<{
      id: string;
      action_date: string;
      staff_name: string;
      description: string;
      period_month: string;
      due_date: string | null;
      status: string;
      priority: string;
      created_at: string;
    }>(
      `INSERT INTO staff_actions (hotel_id, category_id, period_month, action_date, staff_name, description, due_date, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id::text, action_date::text, staff_name, description, period_month::text,
                 due_date::text, status, priority, created_at::text`,
      [
        hotelId, categoryId, periodMonth, actionDate,
        resolvedStaffName || "Unassigned",
        description.trim(),
        dueDate || null,
        priority || "medium",
        authResult.session.user.id || null,
      ]
    );

    // Insert assignees if provided
    if (created && assigneeIds?.length > 0) {
      const insertValues = assigneeIds
        .map((_: string, i: number) => `($1, $${i + 2})`)
        .join(", ");
      await query(
        `INSERT INTO staff_action_assignees (staff_action_id, staff_member_id) VALUES ${insertValues}
         ON CONFLICT DO NOTHING`,
        [created.id, ...assigneeIds]
      );

      // Fire-and-forget notification
      notifyAssignees(created.id, hotelId, assigneeIds).catch((err) => {
        console.error("[staff-actions] Notification failed:", err);
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Staff actions POST error:", error);
    return NextResponse.json({ error: "Failed to create staff action" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    if (!(await checkFeatureAccess(hotelId, "staff_actions"))) {
      return NextResponse.json(
        { error: "Staff action tracking requires the Analytics add-on" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, status, priority, dueDate, notes, assigneeIds, description, actionDate, categoryId, periodMonth: rawPeriodMonth } = body;
    const periodMonth = rawPeriodMonth?.length === 7 ? rawPeriodMonth + "-01" : rawPeriodMonth;

    if (!id) {
      return NextResponse.json({ error: "Action id is required" }, { status: 400 });
    }

    // Build dynamic update
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(status);
      if (status === "completed") {
        sets.push(`completed_at = NOW()`);
      } else {
        sets.push(`completed_at = NULL`);
      }
    }
    if (priority !== undefined) {
      sets.push(`priority = $${idx++}`);
      values.push(priority);
    }
    if (dueDate !== undefined) {
      sets.push(`due_date = $${idx++}`);
      values.push(dueDate || null);
    }
    if (notes !== undefined) {
      sets.push(`notes = $${idx++}`);
      values.push(notes || null);
    }
    if (description !== undefined) {
      sets.push(`description = $${idx++}`);
      values.push(description.trim());
    }
    if (actionDate !== undefined) {
      sets.push(`action_date = $${idx++}`);
      values.push(actionDate);
    }
    if (categoryId !== undefined) {
      sets.push(`category_id = $${idx++}`);
      values.push(categoryId);
    }
    if (periodMonth !== undefined) {
      sets.push(`period_month = $${idx++}`);
      values.push(periodMonth);
    }

    if (sets.length === 0 && !assigneeIds) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    let updated = null;
    if (sets.length > 0) {
      values.push(id, hotelId);
      updated = await queryOne<{ id: string; status: string; priority: string; due_date: string | null; notes: string | null; completed_at: string | null }>(
        `UPDATE staff_actions SET ${sets.join(", ")}
         WHERE id = $${idx++} AND hotel_id = $${idx}
         RETURNING id::text, status, priority, due_date::text, notes, completed_at::text`,
        values
      );

      if (!updated) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
      }
    }

    // Update assignees if provided
    if (assigneeIds) {
      await query(
        "DELETE FROM staff_action_assignees WHERE staff_action_id = $1",
        [id]
      );
      if (assigneeIds.length > 0) {
        const insertValues = assigneeIds
          .map((_: string, i: number) => `($1, $${i + 2})`)
          .join(", ");
        await query(
          `INSERT INTO staff_action_assignees (staff_action_id, staff_member_id) VALUES ${insertValues}`,
          [id, ...assigneeIds]
        );

        // Update staff_name for backward compat
        const members = await query<{ name: string }>(
          `SELECT name FROM staff_members WHERE id = ANY($1::uuid[]) AND hotel_id = $2 ORDER BY name`,
          [assigneeIds, hotelId]
        );
        await query(
          "UPDATE staff_actions SET staff_name = $1 WHERE id = $2",
          [members.map((m) => m.name).join(" / "), id]
        );
      }
    }

    return NextResponse.json(updated || { id, updated: true });
  } catch (error) {
    console.error("Staff actions PATCH error:", error);
    return NextResponse.json({ error: "Failed to update staff action" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(req.url);
    const actionId = searchParams.get("id");

    if (!actionId) {
      return NextResponse.json({ error: "Action id is required" }, { status: 400 });
    }

    const deleted = await queryOne(
      `DELETE FROM staff_actions WHERE id = $1 AND hotel_id = $2 RETURNING id::text`,
      [actionId, hotelId]
    );

    if (!deleted) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Staff actions DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete staff action" }, { status: 500 });
  }
}
