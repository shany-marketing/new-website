/**
 * Puppeteer-based Booking.com review scraper.
 * Fallback for when the Apify voyager actor is blocked by Booking's WAF.
 *
 * Adapted from the original UpStar final-project scraper.
 * Toggle via env: PUPPETEER_BOOKING_FALLBACK=true (default: off)
 */

import { createHash } from "crypto";

interface RawPuppeteerReview {
  id: string;
  rating: number | null;
  reviewDate: string | null;
  reviewTitle: string | null;
  likedText: string | null;
  dislikedText: string | null;
  userName: string | null;
  userLocation: string | null;
  reviewLanguage: string | null;
  propertyResponse: string | null;
  roomInfo: string | null;
  travelerType: string | null;
  numberOfNights: number | null;
}

/**
 * Check if the Puppeteer fallback is enabled via env var.
 */
export function isPuppeteerFallbackEnabled(): boolean {
  return process.env.PUPPETEER_BOOKING_FALLBACK === "true";
}

/**
 * Convert a hotel page URL to the reviewlist endpoint.
 * e.g. https://www.booking.com/hotel/es/wyndham-grand-residences-costa-del-sol-mijas.html
 *   → https://www.booking.com/reviewlist.en-gb.html?pagename=wyndham-grand-residences-costa-del-sol-mijas&type=total&cc1=es
 */
function hotelUrlToReviewList(hotelUrl: string): { reviewUrl: string; slug: string } {
  const slugMatch = hotelUrl.match(/hotel\/([^/]+)\/([^.?/#]+)/i);
  if (!slugMatch) throw new Error(`Cannot parse hotel slug from URL: ${hotelUrl}`);

  const countryCode = slugMatch[1].toLowerCase();
  const slug = slugMatch[2].toLowerCase();

  return {
    reviewUrl: `https://www.booking.com/reviewlist.en-gb.html?pagename=${slug}&type=total&cc1=${countryCode}`,
    slug,
  };
}

/**
 * Generate a deterministic external ID for a review (since the reviewlist page
 * doesn't expose Booking's internal review ID).
 */
function makeExternalId(reviewer: string, date: string, title: string, text: string): string {
  const key = [reviewer, date, title, text.slice(0, 80)].join("|");
  return "ppt_" + createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/**
 * Download a single review page via fetch, with Puppeteer stealth fallback.
 */
async function downloadPage(url: string): Promise<string> {
  // Try plain fetch first (much faster, works ~60% of the time)
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-gb,en;q=0.9",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const html = await res.text();

    // Check for WAF challenge page
    if (html.includes("challenge.js") || html.includes("AwsWafIntegration") || html.includes("challenge-container")) {
      throw new Error("WAF challenge detected");
    }
    return html;
  } catch {
    // Fall through to Puppeteer
  }

  // Puppeteer stealth fallback
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    // Hide automation indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-GB", "en", "en-US"] });
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });

    // Wait for challenge to pass (up to 30 seconds)
    for (let i = 0; i < 15; i++) {
      const html = await page.content();
      if (!html.includes("challenge.js") && !html.includes("AwsWafIntegration")) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Wait for review content
    try {
      await page.waitForSelector("div.c-review-block, div[data-testid='review-card']", { timeout: 10_000 });
    } catch {
      // May not appear if page is empty
    }

    return await page.content();
  } finally {
    await browser.close();
  }
}

/**
 * Parse reviews from HTML using Cheerio.
 */
function parseReviews(html: string): RawPuppeteerReview[] {
  // Dynamic import workaround for cheerio ESM
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cheerio = require("cheerio");
  const $ = cheerio.load(html);

  const reviewBlocks = $("div.c-review-block");
  const reviews: RawPuppeteerReview[] = [];

  reviewBlocks.each((_i: number, node: unknown) => {
    const getText = (selector: string): string => {
      const elements = $(node).find(selector);
      if (elements.length === 0) return "";
      const texts = elements
        .map((_j: number, el: unknown) => $(el).text().trim())
        .get()
        .filter((t: string) => t);
      if (texts.length === 0) return "";
      return texts.reduce((a: string, b: string) => (a.length >= b.length ? a : b));
    };

    const getNumber = (selector: string): number | null => {
      const num = parseFloat(getText(selector));
      return isNaN(num) ? null : Math.round(num);
    };

    const reviewerName = getText(".bui-avatar-block__title") || "Unknown";
    const reviewerCountry = getText(".bui-avatar-block__subtitle") || "";
    const rating = getNumber(".bui-review-score__badge");
    const reviewTitle = getText(".c-review-block__title") || "";

    // Extract liked/disliked text (Booking splits these in the review HTML)
    const likedText = getText(".c-review__body--positive, .c-review-block__row--positive .c-review__body") || "";
    const dislikedText = getText(".c-review__body--negative, .c-review-block__row--negative .c-review__body") || "";

    // If no split found, try the combined review body
    let finalLiked = likedText;
    let finalDisliked = dislikedText;
    if (!likedText && !dislikedText) {
      const combinedText = getText(".c-review__body") || getText(".review-content") || getText("[data-testid='review-text']") || "";
      finalLiked = combinedText;
      finalDisliked = "";
    }

    // Property response
    const responseEl = $(node).find(".c-review-block__response__body");
    const propertyResponse = responseEl.length > 0
      ? responseEl.map((_i: number, el: unknown) => $(el).text().trim()).get().filter(Boolean).sort((a: string, b: string) => b.length - a.length)[0] || null
      : null;

    // Review date
    let reviewDate: string | null = null;
    const dateText = getText(".c-review-block__date");
    if (dateText) {
      // Try to parse various date formats
      const isoMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
      const engMatch = dateText.match(/(\w+ \d{1,2},?\s*\d{4})/);
      const numMatch = dateText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (isoMatch) {
        reviewDate = isoMatch[1];
      } else if (engMatch) {
        const d = new Date(engMatch[1]);
        if (!isNaN(d.getTime())) reviewDate = d.toISOString().slice(0, 10);
      } else if (numMatch) {
        const d = new Date(`${numMatch[2]} ${numMatch[1]}, ${numMatch[3]}`);
        if (!isNaN(d.getTime())) reviewDate = d.toISOString().slice(0, 10);
      }
    }

    // Room info & traveler type from tags
    const roomInfo = getText(".c-review-block__room-info__name, .bui-list__body") || null;
    const travelerType = getText(".c-review-block__guest-type, .review-panel-wide__traveller_type") || null;

    // Nights
    const nightsText = getText(".c-review-block__stay-date, .c-review-block__date--stay");
    const nightsMatch = nightsText?.match(/(\d+)\s*night/i);
    const numberOfNights = nightsMatch ? parseInt(nightsMatch[1]) : null;

    // Language detection
    const allText = finalLiked + " " + finalDisliked;
    const reviewLanguage = /[֐-׿]/.test(allText) ? "he" : "en";

    const externalId = makeExternalId(reviewerName, reviewDate || "", reviewTitle, finalLiked || finalDisliked || "");

    reviews.push({
      id: externalId,
      rating,
      reviewDate,
      reviewTitle: reviewTitle || null,
      likedText: finalLiked || null,
      dislikedText: finalDisliked || null,
      userName: reviewerName !== "Unknown" ? reviewerName : null,
      userLocation: reviewerCountry || null,
      reviewLanguage,
      propertyResponse,
      roomInfo,
      travelerType,
      numberOfNights,
    });
  });

  return reviews;
}

/**
 * Scrape Booking.com reviews using Puppeteer.
 * Returns reviews in the same shape as the Apify actor output,
 * so existing normalization in normalize.ts works unchanged.
 */
export async function scrapeBookingWithPuppeteer(
  bookingUrl: string,
  maxReviews: number = 5000
): Promise<Record<string, unknown>[]> {
  const { reviewUrl, slug } = hotelUrlToReviewList(bookingUrl);
  console.log(`[puppeteer-booking] Scraping ${slug}, max ${maxReviews} reviews`);

  const allReviews: RawPuppeteerReview[] = [];
  const pageSize = 25;

  for (let offset = 0; offset < maxReviews; offset += pageSize) {
    const url = `${reviewUrl}&rows=${pageSize}&offset=${offset}`;
    console.log(`[puppeteer-booking] Fetching offset ${offset}...`);

    try {
      const html = await downloadPage(url);
      const reviews = parseReviews(html);
      allReviews.push(...reviews);

      console.log(`[puppeteer-booking] Got ${reviews.length} reviews at offset ${offset} (total: ${allReviews.length})`);

      if (reviews.length < pageSize) {
        console.log(`[puppeteer-booking] Less than ${pageSize} reviews — reached end`);
        break;
      }

      // Rate limiting: 2s between pages
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[puppeteer-booking] Error at offset ${offset}:`, err);
      break;
    }
  }

  console.log(`[puppeteer-booking] Done — ${allReviews.length} total reviews scraped`);

  // Return as Record<string, unknown>[] to match Apify dataset format
  return allReviews as unknown as Record<string, unknown>[];
}
