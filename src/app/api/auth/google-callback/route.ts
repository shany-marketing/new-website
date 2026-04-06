import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { saveGoogleTokens } from "@/lib/platform-credentials";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${origin}/pricing?google-error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/pricing?google-error=missing_params`);
  }

  // Verify state token
  let hotelId: string;
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback");
    const { payload } = await jwtVerify(state, secret);
    hotelId = payload.hotelId as string;
    if (!hotelId) throw new Error("No hotelId in state");
  } catch {
    return NextResponse.redirect(`${origin}/pricing?google-error=invalid_state`);
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "",
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Google token exchange failed:", errBody);
      return NextResponse.redirect(`${origin}/pricing?google-error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Fetch the user's Business Profile accounts
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let accountId: string | undefined;
    let locationId: string | undefined;

    if (accountsRes.ok) {
      const accountsData = await accountsRes.json();
      const accounts = accountsData.accounts || [];

      if (accounts.length > 0) {
        // Use the first account
        accountId = accounts[0].name; // e.g., "accounts/123456789"

        // Fetch locations for this account
        const locationsRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (locationsRes.ok) {
          const locationsData = await locationsRes.json();
          const locations = locationsData.locations || [];

          if (locations.length === 1) {
            locationId = locations[0].name; // e.g., "locations/456789"
          }
          // If multiple locations, user will need to select — for now use the first
          if (locations.length > 1) {
            locationId = locations[0].name;
          }
        }
      }
    }

    // Save tokens (encrypted)
    await saveGoogleTokens(hotelId, {
      accessToken,
      refreshToken,
      expiresAt,
      accountId,
      locationId,
      scope: "https://www.googleapis.com/auth/business.manage",
    });

    return NextResponse.redirect(
      `${origin}/dashboard/${hotelId}/reviews?platform-connected=google`
    );
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(`${origin}/pricing?google-error=unexpected`);
  }
}
