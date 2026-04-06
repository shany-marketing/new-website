/**
 * Country tokens commonly appended to Booking.com usernames.
 * Strips these to extract just the guest's first name.
 */
const COUNTRY_TOKENS_EN = new Set([
  "united kingdom", "united states", "united arab emirates",
  "germany", "france", "spain", "italy", "netherlands", "belgium",
  "switzerland", "austria", "poland", "czech republic", "sweden",
  "norway", "denmark", "finland", "ireland", "portugal", "greece",
  "turkey", "russia", "china", "japan", "south korea", "india",
  "australia", "new zealand", "canada", "brazil", "mexico",
  "argentina", "south africa", "egypt", "israel", "saudi arabia",
]);

const COUNTRY_TOKENS_HE = new Set([
  "ישראל", "בריטניה", "ארצות הברית", "גרמניה", "צרפת",
  "ספרד", "איטליה", "הולנד", "בלגיה", "שוויץ",
  "אוסטריה", "פולין", "שבדיה", "נורבגיה", "דנמרק",
  "יוון", "טורקיה", "רוסיה", "מצרים", "ערב הסעודית",
]);

/**
 * Extract a display-safe first name from a Booking.com username.
 * Returns null if no usable name is found.
 */
export function cleanGuestName(userName: string | undefined | null): string | null {
  if (!userName || userName.trim().length === 0) return null;

  let name = userName.trim();

  // Remove country tokens (case-insensitive for EN)
  const lower = name.toLowerCase();
  for (const token of COUNTRY_TOKENS_EN) {
    if (lower.endsWith(token)) {
      name = name.slice(0, -token.length).trim();
      break;
    }
  }
  for (const token of COUNTRY_TOKENS_HE) {
    if (name.endsWith(token)) {
      name = name.slice(0, -token.length).trim();
      break;
    }
  }

  // Remove trailing commas / spaces
  name = name.replace(/[,\s]+$/, "").trim();

  // Take first name only (first word)
  const firstName = name.split(/\s+/)[0];

  if (!firstName || firstName.length < 2) return null;

  return firstName;
}
