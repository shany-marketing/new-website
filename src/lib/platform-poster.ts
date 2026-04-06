import { getBookingCredentials, getExpediaCredentials, getGoogleTokens } from "./platform-credentials";
import { queryOne } from "./db";
import { createHmac } from "crypto";

export type PostingStatus = "posted" | "in_moderation" | "failed" | "rejected";

export interface PostResult {
  status: PostingStatus;
  platformPostId?: string;
  errorMessage?: string;
}

export async function postResponseToPlatform(
  platform: "booking" | "google" | "expedia",
  hotelId: string,
  review: {
    id: string;
    externalId: string;
    externalHotelId?: number;
  },
  responseText: string
): Promise<PostResult> {
  switch (platform) {
    case "booking":
      return postToBooking(hotelId, review, responseText);
    case "google":
      return postToGoogle(hotelId, review, responseText);
    case "expedia":
      return postToExpedia(hotelId, review, responseText);
    default:
      return { status: "failed", errorMessage: `Unsupported platform: ${platform}` };
  }
}

// ---- Booking.com ----

async function postToBooking(
  hotelId: string,
  review: { externalId: string; externalHotelId?: number },
  responseText: string
): Promise<PostResult> {
  const creds = await getBookingCredentials(hotelId);
  if (!creds) {
    return { status: "failed", errorMessage: "Booking.com credentials not configured" };
  }

  // Get property ID from hotels table if not provided
  let propertyId = review.externalHotelId;
  if (!propertyId) {
    const hotel = await queryOne<{ external_hotel_id: number | null }>(
      "SELECT external_hotel_id FROM hotels WHERE id = $1",
      [hotelId]
    );
    propertyId = hotel?.external_hotel_id ?? undefined;
  }

  if (!propertyId) {
    return { status: "failed", errorMessage: "Booking.com property ID not found" };
  }

  try {
    const auth = Buffer.from(`${creds.username}:${creds.password}`).toString("base64");
    const url = `https://supply-xml.booking.com/review-api/properties/${propertyId}/reviews/${review.externalId}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hotel_response: responseText }),
    });

    if (res.ok) {
      return { status: "in_moderation" }; // Booking.com moderates replies ~48h
    }

    const errorBody = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      return { status: "failed", errorMessage: "Authentication failed — check your Booking.com credentials" };
    }
    return { status: "rejected", errorMessage: `Booking.com rejected (${res.status}): ${errorBody}` };
  } catch (err) {
    return { status: "failed", errorMessage: `Network error: ${err instanceof Error ? err.message : "unknown"}` };
  }
}

// ---- Google Business Profile ----

async function postToGoogle(
  hotelId: string,
  review: { externalId: string },
  responseText: string
): Promise<PostResult> {
  const tokens = await getGoogleTokens(hotelId);
  if (!tokens) {
    return { status: "failed", errorMessage: "Google account not connected" };
  }

  if (!tokens.accountId || !tokens.locationId) {
    return { status: "failed", errorMessage: "Google Business Profile location not configured" };
  }

  try {
    const url = `https://mybusiness.googleapis.com/v4/${tokens.accountId}/${tokens.locationId}/reviews/${review.externalId}/reply`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: responseText }),
    });

    if (res.ok) {
      return { status: "posted" }; // Google applies immediately
    }

    const errorBody = await res.text().catch(() => "");
    if (res.status === 401) {
      return { status: "failed", errorMessage: "Google token expired — please reconnect your account" };
    }
    if (res.status === 403) {
      return { status: "failed", errorMessage: "Insufficient permissions — you need Owner/Manager access" };
    }
    return { status: "rejected", errorMessage: `Google rejected (${res.status}): ${errorBody}` };
  } catch (err) {
    return { status: "failed", errorMessage: `Network error: ${err instanceof Error ? err.message : "unknown"}` };
  }
}

// ---- Expedia ----

async function postToExpedia(
  hotelId: string,
  review: { externalId: string },
  responseText: string
): Promise<PostResult> {
  const creds = await getExpediaCredentials(hotelId);
  if (!creds) {
    return { status: "failed", errorMessage: "Expedia credentials not configured" };
  }

  try {
    // Expedia uses HMAC-SHA512 authentication
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha512", creds.secret)
      .update(`${creds.apiKey}${timestamp}`)
      .digest("hex");

    const graphqlQuery = {
      query: `mutation SetReviewResponse($propertyId: String!, $reviewId: String!, $body: String!) {
        property(id: $propertyId) {
          review(id: $reviewId) {
            setResponse(body: $body) {
              body
            }
          }
        }
      }`,
      variables: {
        propertyId: creds.propertyId,
        reviewId: review.externalId,
        body: responseText,
      },
    };

    const res = await fetch("https://api.expediagroup.com/supply/lodging/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `EAN apikey=${creds.apiKey},signature=${signature},timestamp=${timestamp}`,
      },
      body: JSON.stringify(graphqlQuery),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      return { status: "failed", errorMessage: `Expedia API error (${res.status}): ${errorBody}` };
    }

    const data = await res.json();
    if (data.errors && data.errors.length > 0) {
      return { status: "rejected", errorMessage: `Expedia: ${data.errors[0].message}` };
    }

    return { status: "posted" };
  } catch (err) {
    return { status: "failed", errorMessage: `Network error: ${err instanceof Error ? err.message : "unknown"}` };
  }
}
