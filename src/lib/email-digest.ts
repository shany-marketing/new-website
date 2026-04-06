import { query, queryOne } from "./db";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

let _ses: SESClient | null = null;
function getSES() {
  if (!_ses) _ses = new SESClient({ region: process.env.AWS_REGION || "eu-west-1" });
  return _ses;
}

export interface DigestSettings {
  id: string;
  hotelId: string;
  enabled: boolean;
  emailAddress: string;
  frequency: "weekly" | "daily";
  dayOfWeek: number;
}

export interface DigestData {
  hotelName: string;
  period: string;
  newReviewCount: number;
  avgRating: number | null;
  previousAvgRating: number | null;
  unrespondedCount: number;
  needsAttention: { id: string; title: string | null; rating: number; source: string }[];
  topComplaint: string | null;
  responseRate: number;
}

export async function getDigestSettings(hotelId: string): Promise<DigestSettings | null> {
  const row = await queryOne<{
    id: string;
    hotel_id: string;
    enabled: boolean;
    email_address: string;
    frequency: string;
    day_of_week: number;
  }>(
    "SELECT id, hotel_id, enabled, email_address, frequency, day_of_week FROM email_digest_settings WHERE hotel_id = $1",
    [hotelId]
  );
  if (!row) return null;
  return {
    id: row.id,
    hotelId: row.hotel_id,
    enabled: row.enabled,
    emailAddress: row.email_address,
    frequency: row.frequency as "weekly" | "daily",
    dayOfWeek: row.day_of_week,
  };
}

export async function saveDigestSettings(
  hotelId: string,
  settings: Partial<Omit<DigestSettings, "id" | "hotelId">>
): Promise<void> {
  await query(
    `INSERT INTO email_digest_settings (hotel_id, enabled, email_address, frequency, day_of_week)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (hotel_id) DO UPDATE SET
       enabled = COALESCE($2, email_digest_settings.enabled),
       email_address = COALESCE($3, email_digest_settings.email_address),
       frequency = COALESCE($4, email_digest_settings.frequency),
       day_of_week = COALESCE($5, email_digest_settings.day_of_week),
       updated_at = NOW()`,
    [
      hotelId,
      settings.enabled ?? false,
      settings.emailAddress ?? "",
      settings.frequency ?? "weekly",
      settings.dayOfWeek ?? 1,
    ]
  );
}

export async function buildDigestData(hotelId: string, sinceDays: number = 7): Promise<DigestData> {
  const hotel = await queryOne<{ name: string }>("SELECT name FROM hotels WHERE id = $1", [hotelId]);
  const hotelName = hotel?.name || "Your Hotel";

  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const sinceStr = since.toISOString();

  const prevStart = new Date(since);
  prevStart.setDate(prevStart.getDate() - sinceDays);
  const prevStartStr = prevStart.toISOString();

  // New review count + avg rating
  const current = await queryOne<{ cnt: string; avg: string | null }>(
    "SELECT COUNT(*)::text as cnt, AVG(rating)::text as avg FROM raw_reviews WHERE hotel_id = $1 AND created_at >= $2",
    [hotelId, sinceStr]
  );

  // Previous period avg rating
  const prev = await queryOne<{ avg: string | null }>(
    "SELECT AVG(rating)::text as avg FROM raw_reviews WHERE hotel_id = $1 AND created_at >= $2 AND created_at < $3",
    [hotelId, prevStartStr, sinceStr]
  );

  // Unresponded reviews (no ai_response and no property_response)
  const unresponded = await queryOne<{ cnt: string }>(
    "SELECT COUNT(*)::text as cnt FROM raw_reviews WHERE hotel_id = $1 AND ai_response IS NULL AND property_response IS NULL AND created_at >= $2",
    [hotelId, sinceStr]
  );

  // Reviews needing attention (low rating, no response)
  const attention = await query<{ id: string; review_title: string | null; rating: number; source: string }>(
    `SELECT id, review_title, rating, source FROM raw_reviews
     WHERE hotel_id = $1 AND rating < 7 AND ai_response IS NULL AND property_response IS NULL AND created_at >= $2
     ORDER BY rating ASC LIMIT 5`,
    [hotelId, sinceStr]
  );

  // Top complaint category
  const topComplaint = await queryOne<{ category: string }>(
    `SELECT category FROM category_stats
     WHERE hotel_id = $1 AND sentiment = 'negative'
     ORDER BY mention_count DESC LIMIT 1`,
    [hotelId]
  );

  // Response rate for the period
  const totalInPeriod = parseInt(current?.cnt || "0", 10);
  const unrespondedCount = parseInt(unresponded?.cnt || "0", 10);
  const respondedCount = totalInPeriod - unrespondedCount;
  const responseRate = totalInPeriod > 0 ? (respondedCount / totalInPeriod) * 100 : 0;

  return {
    hotelName,
    period: `${since.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    newReviewCount: totalInPeriod,
    avgRating: current?.avg ? parseFloat(current.avg) : null,
    previousAvgRating: prev?.avg ? parseFloat(prev.avg) : null,
    unrespondedCount,
    needsAttention: attention.map((r) => ({
      id: r.id,
      title: r.review_title,
      rating: r.rating,
      source: r.source,
    })),
    topComplaint: topComplaint?.category || null,
    responseRate,
  };
}

export function buildDigestHtml(data: DigestData): string {
  const ratingTrend =
    data.avgRating != null && data.previousAvgRating != null
      ? data.avgRating > data.previousAvgRating
        ? "trending up"
        : data.avgRating < data.previousAvgRating
        ? "trending down"
        : "stable"
      : null;

  const trendIcon = ratingTrend === "trending up" ? "&#9650;" : ratingTrend === "trending down" ? "&#9660;" : "&#8212;";
  const trendColor = ratingTrend === "trending up" ? "#4A8F6B" : ratingTrend === "trending down" ? "#B85050" : "#999";

  const attentionRows = data.needsAttention
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #243545;color:#e0e0e0;font-size:13px;">${r.title || "No title"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #243545;color:#B85050;font-size:13px;text-align:center;">${r.rating}/10</td>
          <td style="padding:8px 12px;border-bottom:1px solid #243545;color:#999;font-size:13px;text-align:center;">${r.source}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1C2A39;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1C2A39;">
<tr><td align="center" style="padding:40px 20px;">
  <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0f1d32;border-radius:16px;overflow:hidden;border:1px solid rgba(252,219,55,0.15);">
    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#C9A86A 0%,#A88B52 100%);padding:24px 32px;text-align:center;">
      <h1 style="margin:0;color:#1C2A39;font-size:22px;font-weight:bold;">UpStar Weekly Digest</h1>
      <p style="margin:4px 0 0;color:#1C2A39;font-size:13px;opacity:0.8;">${data.hotelName} &mdash; ${data.period}</p>
    </td></tr>
    <!-- KPIs -->
    <tr><td style="padding:32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="text-align:center;padding:16px;background:#1C2A39;border-radius:12px;">
            <div style="color:#C9A86A;font-size:28px;font-weight:bold;">${data.newReviewCount}</div>
            <div style="color:#999;font-size:12px;margin-top:4px;">New Reviews</div>
          </td>
          <td width="8"></td>
          <td width="33%" style="text-align:center;padding:16px;background:#1C2A39;border-radius:12px;">
            <div style="color:#C9A86A;font-size:28px;font-weight:bold;">${data.avgRating != null ? data.avgRating.toFixed(1) : "N/A"}</div>
            <div style="color:${trendColor};font-size:12px;margin-top:4px;">${trendIcon} Avg Rating</div>
          </td>
          <td width="8"></td>
          <td width="33%" style="text-align:center;padding:16px;background:#1C2A39;border-radius:12px;">
            <div style="color:#C9A86A;font-size:28px;font-weight:bold;">${data.responseRate.toFixed(0)}%</div>
            <div style="color:#999;font-size:12px;margin-top:4px;">Response Rate</div>
          </td>
        </tr>
      </table>
    </td></tr>
    ${data.unrespondedCount > 0 ? `
    <!-- Unresponded alert -->
    <tr><td style="padding:0 32px 16px;">
      <div style="background:#2B1A1A;border:1px solid #B8505033;border-radius:12px;padding:16px;text-align:center;">
        <span style="color:#B85050;font-size:14px;font-weight:bold;">${data.unrespondedCount} reviews awaiting response</span>
      </div>
    </td></tr>` : ""}
    ${data.needsAttention.length > 0 ? `
    <!-- Needs attention -->
    <tr><td style="padding:0 32px 24px;">
      <h3 style="color:#e0e0e0;font-size:15px;margin:0 0 12px;">Needs Attention</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1C2A39;border-radius:12px;overflow:hidden;">
        <tr style="background:#111b30;">
          <th style="padding:10px 12px;text-align:left;color:#999;font-size:11px;text-transform:uppercase;">Review</th>
          <th style="padding:10px 12px;text-align:center;color:#999;font-size:11px;text-transform:uppercase;">Rating</th>
          <th style="padding:10px 12px;text-align:center;color:#999;font-size:11px;text-transform:uppercase;">Platform</th>
        </tr>
        ${attentionRows}
      </table>
    </td></tr>` : ""}
    ${data.topComplaint ? `
    <!-- Top complaint -->
    <tr><td style="padding:0 32px 24px;">
      <div style="background:#1C2A39;border-radius:12px;padding:16px;">
        <span style="color:#999;font-size:12px;">Top Complaint Category:</span>
        <span style="color:#B85050;font-size:14px;font-weight:bold;margin-left:8px;">${data.topComplaint}</span>
      </div>
    </td></tr>` : ""}
    <!-- CTA -->
    <tr><td style="padding:0 32px 32px;text-align:center;">
      <a href="${process.env.NEXTAUTH_URL || "https://upstar.com"}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#C9A86A 0%,#A88B52 100%);color:#1C2A39;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Open Dashboard
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

export async function sendDigestEmail(to: string, subject: string, html: string): Promise<void> {
  const from = process.env.SES_FROM_EMAIL || "digest@upstar.com";
  const command = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: { Html: { Data: html, Charset: "UTF-8" } },
    },
  });
  await getSES().send(command);
}

/**
 * Process digests for all eligible hotels (called by cron).
 */
export async function processAllDigests(): Promise<{ sent: number; failed: number }> {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...

  const settings = await query<{
    hotel_id: string;
    email_address: string;
    frequency: string;
    day_of_week: number;
  }>(
    "SELECT hotel_id, email_address, frequency, day_of_week FROM email_digest_settings WHERE enabled = TRUE"
  );

  let sent = 0;
  let failed = 0;

  for (const s of settings) {
    // Check if today matches the schedule
    if (s.frequency === "weekly" && s.day_of_week !== dayOfWeek) continue;

    try {
      const sinceDays = s.frequency === "daily" ? 1 : 7;
      const data = await buildDigestData(s.hotel_id, sinceDays);

      // Skip if no new reviews
      if (data.newReviewCount === 0) continue;

      const html = buildDigestHtml(data);
      const subject = `${data.hotelName} — ${s.frequency === "daily" ? "Daily" : "Weekly"} Review Digest`;

      await sendDigestEmail(s.email_address, subject, html);

      await query(
        "INSERT INTO email_digest_log (hotel_id, email_address, status) VALUES ($1, $2, 'sent')",
        [s.hotel_id, s.email_address]
      );
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[digest] Failed for hotel ${s.hotel_id}:`, msg);
      await query(
        "INSERT INTO email_digest_log (hotel_id, email_address, status, error_message) VALUES ($1, $2, 'failed', $3)",
        [s.hotel_id, s.email_address, msg]
      );
      failed++;
    }
  }

  return { sent, failed };
}
