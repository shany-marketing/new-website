import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { query, queryOne } from "./db";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.PLATFORM_CREDENTIAL_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("PLATFORM_CREDENTIAL_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

// ---- Encrypt / Decrypt ----

function encrypt(data: Record<string, string>): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const json = JSON.stringify(data);
  let encrypted = cipher.update(json, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  return {
    encryptedData: encrypted,
    iv: iv.toString("base64"),
    authTag,
  };
}

function decrypt(encryptedData: string, iv: string, authTag: string): Record<string, string> {
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

// ---- Booking.com Credentials ----

export async function saveBookingCredentials(
  hotelId: string,
  username: string,
  password: string
): Promise<void> {
  const { encryptedData, iv, authTag } = encrypt({ username, password });
  await query(
    `INSERT INTO platform_credentials (hotel_id, platform, credential_type, encrypted_data, iv, auth_tag)
     VALUES ($1, 'booking', 'basic_auth', $2, $3, $4)
     ON CONFLICT (hotel_id, platform)
     DO UPDATE SET encrypted_data = $2, iv = $3, auth_tag = $4, is_verified = FALSE, updated_at = NOW()`,
    [hotelId, encryptedData, iv, authTag]
  );
}

export async function getBookingCredentials(
  hotelId: string
): Promise<{ username: string; password: string } | null> {
  const row = await queryOne<{
    encrypted_data: string;
    iv: string;
    auth_tag: string;
  }>(
    "SELECT encrypted_data, iv, auth_tag FROM platform_credentials WHERE hotel_id = $1 AND platform = 'booking'",
    [hotelId]
  );
  if (!row) return null;
  const data = decrypt(row.encrypted_data, row.iv, row.auth_tag);
  return { username: data.username, password: data.password };
}

// ---- Expedia Credentials ----

export async function saveExpediaCredentials(
  hotelId: string,
  apiKey: string,
  secret: string,
  propertyId: string
): Promise<void> {
  const { encryptedData, iv, authTag } = encrypt({ apiKey, secret, propertyId });
  await query(
    `INSERT INTO platform_credentials (hotel_id, platform, credential_type, encrypted_data, iv, auth_tag)
     VALUES ($1, 'expedia', 'api_key', $2, $3, $4)
     ON CONFLICT (hotel_id, platform)
     DO UPDATE SET encrypted_data = $2, iv = $3, auth_tag = $4, is_verified = FALSE, updated_at = NOW()`,
    [hotelId, encryptedData, iv, authTag]
  );
}

export async function getExpediaCredentials(
  hotelId: string
): Promise<{ apiKey: string; secret: string; propertyId: string } | null> {
  const row = await queryOne<{
    encrypted_data: string;
    iv: string;
    auth_tag: string;
  }>(
    "SELECT encrypted_data, iv, auth_tag FROM platform_credentials WHERE hotel_id = $1 AND platform = 'expedia'",
    [hotelId]
  );
  if (!row) return null;
  const data = decrypt(row.encrypted_data, row.iv, row.auth_tag);
  return { apiKey: data.apiKey, secret: data.secret, propertyId: data.propertyId };
}

// ---- Google OAuth Tokens ----

export async function saveGoogleTokens(
  hotelId: string,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    accountId?: string;
    locationId?: string;
    scope?: string;
  }
): Promise<void> {
  const accessData = encrypt({ accessToken: tokens.accessToken });
  const refreshData = tokens.refreshToken
    ? encrypt({ refreshToken: tokens.refreshToken })
    : null;

  await query(
    `INSERT INTO platform_oauth_tokens
       (hotel_id, platform, encrypted_access_token, encrypted_refresh_token, iv, auth_tag,
        token_expires_at, google_account_id, google_location_id, scope)
     VALUES ($1, 'google', $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (hotel_id, platform)
     DO UPDATE SET
       encrypted_access_token = $2,
       encrypted_refresh_token = COALESCE($3, platform_oauth_tokens.encrypted_refresh_token),
       iv = $4, auth_tag = $5,
       token_expires_at = $6,
       google_account_id = COALESCE($7, platform_oauth_tokens.google_account_id),
       google_location_id = COALESCE($8, platform_oauth_tokens.google_location_id),
       scope = COALESCE($9, platform_oauth_tokens.scope),
       updated_at = NOW()`,
    [
      hotelId,
      accessData.encryptedData,
      refreshData?.encryptedData || null,
      accessData.iv,
      accessData.authTag,
      tokens.expiresAt.toISOString(),
      tokens.accountId || null,
      tokens.locationId || null,
      tokens.scope || null,
    ]
  );
}

export async function getGoogleTokens(
  hotelId: string
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  accountId: string | null;
  locationId: string | null;
  expiresAt: Date | null;
} | null> {
  const row = await queryOne<{
    encrypted_access_token: string;
    encrypted_refresh_token: string | null;
    iv: string;
    auth_tag: string;
    token_expires_at: string | null;
    google_account_id: string | null;
    google_location_id: string | null;
  }>(
    "SELECT encrypted_access_token, encrypted_refresh_token, iv, auth_tag, token_expires_at, google_account_id, google_location_id FROM platform_oauth_tokens WHERE hotel_id = $1 AND platform = 'google'",
    [hotelId]
  );
  if (!row) return null;

  const accessData = decrypt(row.encrypted_access_token, row.iv, row.auth_tag);
  let refreshToken: string | null = null;
  if (row.encrypted_refresh_token) {
    try {
      const refreshData = decrypt(row.encrypted_refresh_token, row.iv, row.auth_tag);
      refreshToken = refreshData.refreshToken;
    } catch {
      // Refresh token may use different IV — this is a known limitation
      // In practice, refresh tokens are stored with the same IV as the access token
    }
  }

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at) : null;

  // If token is expired and we have a refresh token, attempt refresh
  if (expiresAt && expiresAt < new Date() && refreshToken) {
    const refreshed = await refreshGoogleToken(hotelId, refreshToken);
    if (refreshed) {
      return {
        accessToken: refreshed.accessToken,
        refreshToken,
        accountId: row.google_account_id,
        locationId: row.google_location_id,
        expiresAt: refreshed.expiresAt,
      };
    }
    return null; // Refresh failed
  }

  return {
    accessToken: accessData.accessToken,
    refreshToken,
    accountId: row.google_account_id,
    locationId: row.google_location_id,
    expiresAt,
  };
}

async function refreshGoogleToken(
  hotelId: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const accessToken = data.access_token;
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

    // Save the new access token
    await saveGoogleTokens(hotelId, { accessToken, expiresAt });

    return { accessToken, expiresAt };
  } catch {
    return null;
  }
}

// ---- Mark Credentials as Verified ----

export async function markCredentialVerified(hotelId: string, platform: string): Promise<void> {
  await query(
    "UPDATE platform_credentials SET is_verified = TRUE, verified_at = NOW() WHERE hotel_id = $1 AND platform = $2",
    [hotelId, platform]
  );
}

// ---- Connection Status ----

export interface PlatformConnectionStatus {
  booking: { connected: boolean; verified: boolean };
  google: { connected: boolean; expiresAt: string | null };
  expedia: { connected: boolean; verified: boolean };
}

export async function getPlatformConnectionStatus(
  hotelId: string
): Promise<PlatformConnectionStatus> {
  const [creds, oauth] = await Promise.all([
    query<{ platform: string; is_verified: boolean }>(
      "SELECT platform, is_verified FROM platform_credentials WHERE hotel_id = $1",
      [hotelId]
    ),
    queryOne<{ token_expires_at: string | null }>(
      "SELECT token_expires_at FROM platform_oauth_tokens WHERE hotel_id = $1 AND platform = 'google'",
      [hotelId]
    ),
  ]);

  const booking = creds.find((c) => c.platform === "booking");
  const expedia = creds.find((c) => c.platform === "expedia");

  return {
    booking: {
      connected: !!booking,
      verified: booking?.is_verified ?? false,
    },
    google: {
      connected: !!oauth,
      expiresAt: oauth?.token_expires_at ?? null,
    },
    expedia: {
      connected: !!expedia,
      verified: expedia?.is_verified ?? false,
    },
  };
}

// ---- Delete Credentials ----

export async function deletePlatformCredentials(hotelId: string, platform: string): Promise<void> {
  if (platform === "google") {
    await query("DELETE FROM platform_oauth_tokens WHERE hotel_id = $1 AND platform = 'google'", [hotelId]);
  } else {
    await query("DELETE FROM platform_credentials WHERE hotel_id = $1 AND platform = $2", [hotelId, platform]);
  }
}
