import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkBudget, getMonthlySummary } from "@/lib/ai-cost";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [budget, summary] = await Promise.all([
    checkBudget(),
    getMonthlySummary(),
  ]);

  return NextResponse.json({ budget, summary });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { monthlyLimit, hardStop, alertThreshold } = body;

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (monthlyLimit != null) {
    updates.push(`monthly_limit = $${idx++}`);
    values.push(monthlyLimit);
  }
  if (hardStop != null) {
    updates.push(`hard_stop = $${idx++}`);
    values.push(hardStop);
  }
  if (alertThreshold != null) {
    updates.push(`alert_threshold = $${idx++}`);
    values.push(alertThreshold);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.push("updated_at = now()");

  await query(
    `UPDATE ai_budget SET ${updates.join(", ")} WHERE id = (SELECT id FROM ai_budget LIMIT 1)`,
    values
  );

  const budget = await checkBudget();
  return NextResponse.json({ budget });
}
