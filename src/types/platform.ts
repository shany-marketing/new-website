export const PLATFORMS = ["booking", "google", "expedia", "tripadvisor"] as const;
export type ReviewSource = (typeof PLATFORMS)[number];

/**
 * Strip tracking query params, fragments, and trailing slashes from platform URLs.
 * Keeps only the clean canonical path so duplicate detection works regardless of
 * how the hotelier copied the URL.
 */
export function cleanPlatformUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    // Remove all query params and hash fragments
    url.search = "";
    url.hash = "";
    // Booking.com: strip language code before .html
    // e.g. /hotel/es/some-hotel.en-gb.html → /hotel/es/some-hotel.html
    if (url.hostname.includes("booking.com")) {
      url.pathname = url.pathname.replace(/\.[a-z]{2}(-[a-z]{2})?\.html$/, ".html");
    }
    // Remove trailing slash (but keep the one after .html etc.)
    let clean = url.toString();
    if (clean.endsWith("/") && !clean.endsWith("://")) {
      clean = clean.replace(/\/+$/, "");
    }
    return clean;
  } catch {
    // If not a valid URL, just trim and return as-is
    return raw.trim();
  }
}

export interface PlatformConfig {
  id: ReviewSource;
  label: string;
  apifyActorId: string;
  apifyFallbackActorId?: string;
  urlColumn: string;
  ratingScale: number;
  color: string;
  hasLikedDislikedSplit: boolean;
  canPost: boolean;
  /** When true, scraping is temporarily disabled for this platform */
  disabled?: boolean;
  disabledReason?: string;
}

export const PLATFORM_CONFIG: Record<ReviewSource, PlatformConfig> = {
  booking: {
    id: "booking",
    label: "Booking.com",
    apifyActorId: "plowdata~booking-com-review-scraper",              // browser-based — richer data (hotel_rating, language, responses)
    apifyFallbackActorId: "voyager~booking-reviews-scraper",          // CheerioCrawler fallback (cheaper, less fields)
    urlColumn: "booking_url",
    ratingScale: 10,
    color: "#003580",
    hasLikedDislikedSplit: true,
    canPost: true,
  },
  google: {
    id: "google",
    label: "Google",
    apifyActorId: "compass~google-maps-reviews-scraper",
    urlColumn: "google_url",
    ratingScale: 5,
    color: "#4285F4",
    hasLikedDislikedSplit: false,
    canPost: true,
  },
  expedia: {
    id: "expedia",
    label: "Expedia",
    apifyActorId: "memo23~expedia-scraper",
    urlColumn: "expedia_url",
    ratingScale: 10,
    color: "#FBCE00",
    hasLikedDislikedSplit: false,
    canPost: true,
  },
  tripadvisor: {
    id: "tripadvisor",
    label: "TripAdvisor",
    apifyActorId: "maxcopell~tripadvisor-reviews",
    urlColumn: "tripadvisor_url",
    ratingScale: 5,
    color: "#34E0A1",
    hasLikedDislikedSplit: false,
    canPost: false,
  },
};
