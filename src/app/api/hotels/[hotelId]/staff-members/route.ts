import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { checkFeatureAccess } from "@/lib/plan";
import { requireHotelAccess } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const rows = await query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      position: string | null;
      created_at: string;
    }>(
      `SELECT id::text, name, email, phone, position, created_at::text
       FROM staff_members
       WHERE hotel_id = $1
       ORDER BY name`,
      [hotelId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Staff members GET error:", error);
    return NextResponse.json({ error: "Failed to fetch staff members" }, { status: 500 });
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
        { error: "Staff management requires the Analytics add-on" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, phone, position } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Check for duplicate email within this hotel
    const existing = await queryOne(
      "SELECT id FROM staff_members WHERE hotel_id = $1 AND email = $2",
      [hotelId, email.trim().toLowerCase()]
    );
    if (existing) {
      return NextResponse.json(
        { error: "A staff member with this email already exists" },
        { status: 409 }
      );
    }

    const created = await queryOne<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      position: string | null;
      created_at: string;
    }>(
      `INSERT INTO staff_members (hotel_id, name, email, phone, position)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id::text, name, email, phone, position, created_at::text`,
      [hotelId, name.trim(), email.trim().toLowerCase(), phone?.trim() || null, position?.trim() || null]
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Staff members POST error:", error);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
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

    const body = await req.json();
    const { id, name, email, phone, position } = body;

    if (!id) {
      return NextResponse.json({ error: "Staff member id is required" }, { status: 400 });
    }

    // Build dynamic update
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); values.push(name.trim()); }
    if (email !== undefined) { sets.push(`email = $${idx++}`); values.push(email.trim().toLowerCase()); }
    if (phone !== undefined) { sets.push(`phone = $${idx++}`); values.push(phone?.trim() || null); }
    if (position !== undefined) { sets.push(`position = $${idx++}`); values.push(position?.trim() || null); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id, hotelId);
    const updated = await queryOne<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      position: string | null;
    }>(
      `UPDATE staff_members SET ${sets.join(", ")}
       WHERE id = $${idx++} AND hotel_id = $${idx}
       RETURNING id::text, name, email, phone, position`,
      values
    );

    if (!updated) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Staff members PATCH error:", error);
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Staff member id is required" }, { status: 400 });
    }

    const deleted = await queryOne(
      "DELETE FROM staff_members WHERE id = $1 AND hotel_id = $2 RETURNING id::text",
      [id, hotelId]
    );

    if (!deleted) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Staff members DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}
