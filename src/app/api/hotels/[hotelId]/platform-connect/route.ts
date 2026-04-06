import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import {
  getPlatformConnectionStatus,
  saveBookingCredentials,
  saveExpediaCredentials,
  markCredentialVerified,
  deletePlatformCredentials,
  getBookingCredentials,
  getExpediaCredentials,
} from "@/lib/platform-credentials";
import { queryOne } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const status = await getPlatformConnectionStatus(hotelId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Platform connect GET error:", error);
    return NextResponse.json({ error: "Failed to fetch connection status" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const body = await req.json();
    const { platform } = body;

    if (platform === "booking") {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
      }

      await saveBookingCredentials(hotelId, username, password);

      // Verify credentials by probing the API
      const hotel = await queryOne<{ external_hotel_id: number | null }>(
        "SELECT external_hotel_id FROM hotels WHERE id = $1",
        [hotelId]
      );

      if (hotel?.external_hotel_id) {
        try {
          const creds = await getBookingCredentials(hotelId);
          if (creds) {
            const auth = Buffer.from(`${creds.username}:${creds.password}`).toString("base64");
            const probeRes = await fetch(
              `https://supply-xml.booking.com/review-api/properties/${hotel.external_hotel_id}/reviews?limit=1`,
              {
                headers: { Authorization: `Basic ${auth}` },
              }
            );
            if (probeRes.ok || probeRes.status === 200) {
              await markCredentialVerified(hotelId, "booking");
              return NextResponse.json({ connected: true, verified: true });
            }
          }
        } catch {
          // Probe failed — credentials saved but not verified
        }
      }

      return NextResponse.json({ connected: true, verified: false, message: "Credentials saved. Verification pending." });
    }

    if (platform === "expedia") {
      const { apiKey, secret, propertyId } = body;
      if (!apiKey || !secret || !propertyId) {
        return NextResponse.json({ error: "API Key, Secret, and Property ID are required" }, { status: 400 });
      }

      await saveExpediaCredentials(hotelId, apiKey, secret, propertyId);

      // Verify by probing Expedia API
      try {
        const creds = await getExpediaCredentials(hotelId);
        if (creds) {
          const { createHmac } = await import("crypto");
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const signature = createHmac("sha512", creds.secret)
            .update(`${creds.apiKey}${timestamp}`)
            .digest("hex");

          const probeRes = await fetch("https://api.expediagroup.com/supply/lodging/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `EAN apikey=${creds.apiKey},signature=${signature},timestamp=${timestamp}`,
            },
            body: JSON.stringify({
              query: `{ property(id: "${creds.propertyId}") { name } }`,
            }),
          });

          if (probeRes.ok) {
            const data = await probeRes.json();
            if (!data.errors) {
              await markCredentialVerified(hotelId, "expedia");
              return NextResponse.json({ connected: true, verified: true });
            }
          }
        }
      } catch {
        // Probe failed
      }

      return NextResponse.json({ connected: true, verified: false, message: "Credentials saved. Verification pending." });
    }

    return NextResponse.json({ error: "Unsupported platform. Use 'booking' or 'expedia'." }, { status: 400 });
  } catch (error) {
    console.error("Platform connect POST error:", error);
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");

    if (!platform || !["booking", "google", "expedia"].includes(platform)) {
      return NextResponse.json({ error: "Valid platform required" }, { status: 400 });
    }

    await deletePlatformCredentials(hotelId, platform);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Platform connect DELETE error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
