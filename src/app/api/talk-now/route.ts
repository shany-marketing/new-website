import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { name, phone, hotel } = await req.json();

  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  }

  const now = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "full",
    timeStyle: "short",
  });

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; padding: 32px; background: #f9f8f6; border-radius: 8px;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 13px; font-weight: 600; color: #C9A86A; text-transform: uppercase; letter-spacing: 0.08em;">RatingIQ — Talk Now Request</span>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 22px; color: #1C2A39; font-weight: 700;">Someone wants to talk now.</h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #516B84;">They came through the email sequence and clicked "Can we talk now?" — they're expecting a call within the hour.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e0dbd4; font-size: 13px; color: #516B84; width: 120px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Name</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e0dbd4; font-size: 15px; color: #1C2A39; font-weight: 600;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e0dbd4; font-size: 13px; color: #516B84; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Phone</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e0dbd4; font-size: 15px; color: #1C2A39; font-weight: 600;"><a href="tel:${phone}" style="color: #1C2A39; text-decoration: none;">${phone}</a></td>
        </tr>
        ${hotel ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e0dbd4; font-size: 13px; color: #516B84; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Hotel / Chain</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e0dbd4; font-size: 15px; color: #1C2A39; font-weight: 600;">${hotel}</td>
        </tr>` : ""}
        <tr>
          <td style="padding: 10px 0; font-size: 13px; color: #516B84; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Submitted</td>
          <td style="padding: 10px 0; font-size: 14px; color: #516B84;">${now}</td>
        </tr>
      </table>
    </div>
  `;

  await sendEmail(
    "omri@rating-iq.com",
    `Talk Now — ${name}${hotel ? ` · ${hotel}` : ""}`,
    html
  );

  return NextResponse.json({ ok: true });
}
