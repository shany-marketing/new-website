import { query, queryOne } from "./db";
import { sendEmail } from "./email";
import { notifyHotelUsers } from "./notifications";
import { generateStaffToken } from "./staff-token";

export interface StaffNotificationData {
  hotelName: string;
  staffName: string;
  category: string;
  description: string;
  dueDate: string | null;
  priority: string;
  assignedBy: string;
}

function priorityColor(p: string): string {
  switch (p) {
    case "urgent": return "#B85050";
    case "high": return "#ff8c42";
    case "medium": return "#C9A86A";
    default: return "#999";
  }
}

function priorityLabel(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export function buildAssignmentEmailHtml(data: StaffNotificationData & { taskUrl?: string }): string {
  const dashboardUrl = process.env.NEXTAUTH_URL || "https://upstar.com";
  const ctaUrl = data.taskUrl || `${dashboardUrl}/dashboard`;
  const dueDateRow = data.dueDate
    ? `<tr>
        <td style="padding:8px 16px;color:#999;font-size:13px;width:120px;">Due Date</td>
        <td style="padding:8px 16px;color:#e0e0e0;font-size:13px;font-weight:bold;">${new Date(data.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</td>
       </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1C2A39;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1C2A39;">
<tr><td align="center" style="padding:40px 20px;">
  <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0f1d32;border-radius:16px;overflow:hidden;border:1px solid rgba(252,219,55,0.15);">
    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#C9A86A 0%,#A88B52 100%);padding:24px 32px;text-align:center;">
      <h1 style="margin:0;color:#1C2A39;font-size:22px;font-weight:bold;">New Task Assignment</h1>
      <p style="margin:4px 0 0;color:#1C2A39;font-size:13px;opacity:0.8;">${data.hotelName}</p>
    </td></tr>
    <!-- Greeting -->
    <tr><td style="padding:32px 32px 16px;">
      <p style="color:#e0e0e0;font-size:15px;margin:0;">Hi ${data.staffName},</p>
      <p style="color:#999;font-size:14px;margin:8px 0 0;">You have been assigned a new task to address a guest feedback issue.</p>
    </td></tr>
    <!-- Details -->
    <tr><td style="padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1C2A39;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:8px 16px;color:#999;font-size:13px;width:120px;">Issue</td>
          <td style="padding:8px 16px;color:#e0e0e0;font-size:13px;font-weight:bold;">${data.category}</td>
        </tr>
        <tr>
          <td style="padding:8px 16px;color:#999;font-size:13px;">Priority</td>
          <td style="padding:8px 16px;">
            <span style="display:inline-block;padding:2px 10px;border-radius:8px;font-size:12px;font-weight:bold;color:#fff;background:${priorityColor(data.priority)};">${priorityLabel(data.priority)}</span>
          </td>
        </tr>
        ${dueDateRow}
        <tr>
          <td style="padding:8px 16px;color:#999;font-size:13px;vertical-align:top;">Description</td>
          <td style="padding:8px 16px;color:#e0e0e0;font-size:13px;">${data.description}</td>
        </tr>
        <tr>
          <td style="padding:8px 16px;color:#999;font-size:13px;">Assigned By</td>
          <td style="padding:8px 16px;color:#C9A86A;font-size:13px;">${data.assignedBy}</td>
        </tr>
      </table>
    </td></tr>
    <!-- CTA -->
    <tr><td style="padding:0 32px 32px;text-align:center;">
      <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#C9A86A 0%,#A88B52 100%);color:#1C2A39;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        View & Update Task
      </a>
    </td></tr>
    <!-- Footer -->
    <tr><td style="padding:16px 32px;border-top:1px solid #243545;text-align:center;">
      <p style="color:#666;font-size:11px;margin:0;">Powered by UpStar Intelligence</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export async function notifyAssignees(
  actionId: string,
  hotelId: string,
  assigneeIds: string[]
): Promise<void> {
  if (assigneeIds.length === 0) return;

  try {
    // Fetch action details + hotel name + category
    const action = await queryOne<{
      description: string;
      due_date: string | null;
      priority: string;
      category_label: string;
      hotel_name: string;
      assigned_by: string | null;
    }>(
      `SELECT sa.description, sa.due_date::text, sa.priority,
              cc.label AS category_label, h.name AS hotel_name,
              u.name AS assigned_by
       FROM staff_actions sa
       JOIN consensus_categories cc ON cc.id = sa.category_id
       JOIN hotels h ON h.id = sa.hotel_id
       LEFT JOIN users u ON u.id = sa.created_by
       WHERE sa.id = $1 AND sa.hotel_id = $2`,
      [actionId, hotelId]
    );

    if (!action) return;

    // Fetch assignee details
    const members = await query<{ id: string; name: string; email: string }>(
      `SELECT id::text, name, email FROM staff_members WHERE id = ANY($1::uuid[]) AND hotel_id = $2`,
      [assigneeIds, hotelId]
    );

    const baseUrl = process.env.NEXTAUTH_URL || "https://upstar.com";

    for (const member of members) {
      try {
        // Generate magic link token for staff portal
        const token = generateStaffToken(member.id, hotelId);
        const taskUrl = `${baseUrl}/tasks/${token}`;

        const html = buildAssignmentEmailHtml({
          hotelName: action.hotel_name,
          staffName: member.name,
          category: action.category_label,
          description: action.description,
          dueDate: action.due_date,
          priority: action.priority,
          assignedBy: action.assigned_by || "Management",
          taskUrl,
        });

        await sendEmail(
          member.email,
          `${action.hotel_name} — New Task: ${action.category_label}`,
          html
        );

        await query(
          `UPDATE staff_action_assignees SET notified_at = NOW()
           WHERE staff_action_id = $1 AND staff_member_id = $2`,
          [actionId, member.id]
        );
      } catch (err) {
        console.error(`[staff-notify] Failed for ${member.email}:`, err instanceof Error ? err.message : err);
      }
    }

    // Also create in-app notification for hotel users
    try {
      await notifyHotelUsers(hotelId, {
        type: "task_assigned",
        title: `Task assigned: ${action.category_label}`,
        message: `${members.map(m => m.name).join(", ")} assigned to "${action.category_label}"`,
        link: `/dashboard/${hotelId}/actions`,
      });
    } catch {
      // non-critical
    }
  } catch (err) {
    console.error("[staff-notify] notifyAssignees error:", err instanceof Error ? err.message : err);
  }
}

export async function renotifyAssignees(
  actionId: string,
  hotelId: string
): Promise<{ notified: number; failed: number }> {
  let notified = 0;
  let failed = 0;

  try {
    const action = await queryOne<{
      description: string;
      due_date: string | null;
      priority: string;
      category_label: string;
      hotel_name: string;
      assigned_by: string | null;
    }>(
      `SELECT sa.description, sa.due_date::text, sa.priority,
              cc.label AS category_label, h.name AS hotel_name,
              u.name AS assigned_by
       FROM staff_actions sa
       JOIN consensus_categories cc ON cc.id = sa.category_id
       JOIN hotels h ON h.id = sa.hotel_id
       LEFT JOIN users u ON u.id = sa.created_by
       WHERE sa.id = $1 AND sa.hotel_id = $2`,
      [actionId, hotelId]
    );

    if (!action) return { notified: 0, failed: 0 };

    const members = await query<{ id: string; name: string; email: string }>(
      `SELECT sm.id::text, sm.name, sm.email
       FROM staff_action_assignees saa
       JOIN staff_members sm ON sm.id = saa.staff_member_id
       WHERE saa.staff_action_id = $1`,
      [actionId]
    );

    for (const member of members) {
      try {
        const html = buildAssignmentEmailHtml({
          hotelName: action.hotel_name,
          staffName: member.name,
          category: action.category_label,
          description: action.description,
          dueDate: action.due_date,
          priority: action.priority,
          assignedBy: action.assigned_by || "Management",
        });

        await sendEmail(
          member.email,
          `Reminder: ${action.hotel_name} — ${action.category_label}`,
          html
        );

        await query(
          `UPDATE staff_action_assignees SET notified_at = NOW()
           WHERE staff_action_id = $1 AND staff_member_id = $2`,
          [actionId, member.id]
        );
        notified++;
      } catch (err) {
        console.error(`[staff-notify] Re-notify failed for ${member.email}:`, err instanceof Error ? err.message : err);
        failed++;
      }
    }
  } catch (err) {
    console.error("[staff-notify] renotifyAssignees error:", err instanceof Error ? err.message : err);
  }

  return { notified, failed };
}
