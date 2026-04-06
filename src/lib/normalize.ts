import { createHash } from 'crypto';
import { cleanGuestName } from './guest-name';
import type { ReviewSource } from '@/types/platform';

/**
 * Full normalized review — captures all useful Apify fields.
 */
export interface NormalizedReview {
  source: ReviewSource;
  externalId: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  likedText: string | null;
  dislikedText: string | null;
  numberOfNights: number | null;
  rating: number | null;
  reviewDate: string | null;
  reviewTitle: string | null;
  roomInfo: string | null;
  travelerType: string | null;
  userLocation: string | null;
  userNameHash: string;           // pseudonymized — never store plaintext
  reviewerDisplayName: string | null;  // public first name (not PII)
  // Expanded fields
  reviewLanguage: string | null;
  helpfulVotes: number | null;
  propertyResponse: string | null;
  stayRoomId: number | null;
  hotelRating: number | null;
  hotelRatingLabel: string | null;
  hotelReviewsCount: number | null;
  hotelRatingScores: { name: string; codeName: string; score: number }[] | null;
}

/**
 * Raw Apify payload shape — supports BOTH old (voyager) and new (plowdata) actor fields.
 */
interface ApifyReview {
  // Old actor fields
  id?: string;
  checkInDate?: string;
  checkOutDate?: string;
  likedText?: string;
  dislikedText?: string;
  numberOfNights?: number;
  rating?: number;
  reviewDate?: string;
  reviewTitle?: string;
  roomInfo?: string;
  travelerType?: string;
  userLocation?: string;
  userName?: string;
  reviewLanguage?: string;
  helpfulVotes?: number;
  propertyResponse?: string;
  stayRoomId?: number;
  hotelRating?: number;
  hotelRatingLabel?: string;
  hotelReviews?: number;
  hotelRatingScores?: { name: string; codeName: string; score: number }[];
  // New actor (plowdata) fields
  positiveText?: string;
  negativeText?: string;
  numNights?: number;
  score?: number;
  date?: string;
  title?: string;
  roomTypeName?: string;
  roomTypeId?: number;
  customerType?: string;
  countryName?: string;
  countryCode?: string;
  username?: string;
  lang?: string;
  helpfulVotesCount?: number;
  partnerReplyText?: string;
  checkinDate?: string;
  checkoutDate?: string;
  url?: string;
  hotelId?: string | number;
  hotelName?: string;
}

/**
 * GDPR pseudonymization — one-way SHA-256 hash.
 * The original username is never stored or logged.
 */
function hashPII(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/**
 * Normalize a single Apify review into our full schema.
 * Returns null if the review is malformed (missing required fields).
 */
export function normalizeReview(raw: ApifyReview): NormalizedReview | null {
  // Generate an ID: old actor has `id`, new actor may use URL or we hash content
  const externalId = raw.id
    ?? (raw.url ? hashPII(raw.url + (raw.date ?? '') + (raw.username ?? '')) : null);
  if (!externalId) return null;

  const liked = raw.likedText?.trim() || raw.positiveText?.trim() || null;
  const disliked = raw.dislikedText?.trim() || raw.negativeText?.trim() || null;
  const nights = raw.numberOfNights ?? (raw.numNights != null && raw.numNights > 0 ? raw.numNights : null);
  const rating = raw.rating ?? (raw.score != null && raw.score > 0 ? raw.score : null);
  const reviewDate = raw.reviewDate ?? raw.date ?? null;
  const title = raw.reviewTitle?.trim() || raw.title?.trim() || null;
  const room = raw.roomInfo?.trim() || raw.roomTypeName?.trim() || null;
  const traveler = raw.travelerType?.trim() || raw.customerType?.trim() || null;
  const location = raw.userLocation?.trim() || raw.countryName?.trim() || null;
  const userName = raw.userName ?? raw.username ?? null;
  const lang = raw.reviewLanguage?.trim() || raw.lang?.trim() || null;
  const votes = raw.helpfulVotes ?? raw.helpfulVotesCount ?? null;
  const propResponse = raw.propertyResponse?.trim() || raw.partnerReplyText?.trim() || null;
  const checkIn = raw.checkInDate ?? raw.checkinDate ?? null;
  const checkOut = raw.checkOutDate ?? raw.checkoutDate ?? null;

  // Skip placeholder/error reviews from new actor
  if (!liked && !disliked && !title && rating === null) return null;

  return {
    source: 'booking',
    externalId: String(externalId),
    checkInDate: checkIn,
    checkOutDate: checkOut,
    likedText: liked,
    dislikedText: disliked,
    numberOfNights: nights,
    rating,
    reviewDate,
    reviewTitle: title,
    roomInfo: room,
    travelerType: traveler,
    userLocation: location,
    userNameHash: userName ? hashPII(userName) : hashPII('anonymous'),
    reviewerDisplayName: cleanGuestName(userName),
    reviewLanguage: lang,
    helpfulVotes: votes,
    propertyResponse: propResponse,
    stayRoomId: raw.stayRoomId ?? (raw.roomTypeId ?? null),
    hotelRating: typeof raw.hotelRating === 'number' ? raw.hotelRating : null,
    hotelRatingLabel: raw.hotelRatingLabel?.trim() || null,
    hotelReviewsCount: raw.hotelReviews ?? null,
    hotelRatingScores: raw.hotelRatingScores
      ? raw.hotelRatingScores.map(s => ({ name: s.name, codeName: s.codeName, score: s.score }))
      : null,
  };
}

/**
 * Normalize an entire Apify batch payload.
 * Discards malformed reviews and returns only valid entries.
 */
export function normalizeBatch(rawReviews: ApifyReview[]): NormalizedReview[] {
  const results: NormalizedReview[] = [];
  for (const raw of rawReviews) {
    const normalized = normalizeReview(raw);
    if (normalized) results.push(normalized);
  }
  return results;
}

// ---- Google Maps normalizer ----

interface GoogleReview {
  reviewId?: string;
  name?: string;
  text?: string | null;
  textTranslated?: string | null;
  stars?: number;
  publishedAtDate?: string;
  publishedAt?: string;
  responseFromOwnerText?: string | null;
  language?: string;
  likesCount?: number;
}

function normalizeGoogleReview(raw: GoogleReview): NormalizedReview | null {
  if (!raw.reviewId) return null;

  return {
    source: 'google',
    externalId: String(raw.reviewId),
    checkInDate: null,
    checkOutDate: null,
    likedText: raw.text?.trim() || raw.textTranslated?.trim() || null,
    dislikedText: null,
    numberOfNights: null,
    rating: raw.stars != null ? raw.stars * 2 : null,
    reviewDate: raw.publishedAtDate ?? raw.publishedAt ?? null,
    reviewTitle: null,
    roomInfo: null,
    travelerType: null,
    userLocation: null,
    userNameHash: raw.name ? hashPII(raw.name) : hashPII('anonymous'),
    reviewerDisplayName: cleanGuestName(raw.name),
    reviewLanguage: raw.language ?? null,
    helpfulVotes: raw.likesCount ?? null,
    propertyResponse: raw.responseFromOwnerText?.trim() || null,
    stayRoomId: null,
    hotelRating: null,
    hotelRatingLabel: null,
    hotelReviewsCount: null,
    hotelRatingScores: null,
  };
}

// ---- Expedia normalizer (memo23~expedia-scraper actor) ----

interface ExpediaReview {
  reviewId?: string;
  reviewText?: string;
  reviewTitle?: string;
  reviewRating?: number;
  reviewDate?: string;
  authorName?: string;
  reviewerName?: string;
  tripType?: string;
  traveledWith?: string;
  stayDuration?: number;
  liked?: string[];
  disliked?: string[];
  hotelResponse?: string | null;
  hotelOverallRating?: number | null;
  hotelRatingLabel?: string | null;
  hotelTotalReviews?: number | null;
}

function normalizeExpediaReview(raw: ExpediaReview): NormalizedReview | null {
  if (!raw.reviewId) return null;

  // Rating is already on 10-point scale from memo23 actor
  const rating = raw.reviewRating != null ? raw.reviewRating : null;

  const authorName = raw.authorName || raw.reviewerName;

  // Build traveler type from traveledWith + tripType
  const traveler = raw.traveledWith?.trim() || raw.tripType?.trim() || null;

  // reviewText is the main body; liked/disliked are category arrays
  const reviewText = raw.reviewText?.trim() || null;
  const likedCategories = raw.liked?.length ? raw.liked.join(', ') : null;
  // Use reviewText as main liked text; append category sentiments if no free text
  const likedText = reviewText || (likedCategories ? `Liked: ${likedCategories}` : null);
  const dislikedCategories = raw.disliked?.length ? raw.disliked.join(', ') : null;

  // Skip reviews with no useful content
  if (!likedText && !dislikedCategories && !raw.reviewTitle && rating === null) return null;

  return {
    source: 'expedia',
    externalId: String(raw.reviewId),
    checkInDate: null,
    checkOutDate: null,
    likedText,
    dislikedText: dislikedCategories ? `Disliked: ${dislikedCategories}` : null,
    numberOfNights: raw.stayDuration ?? null,
    rating,
    reviewDate: raw.reviewDate ?? null,
    reviewTitle: raw.reviewTitle?.trim() || null,
    roomInfo: null,
    travelerType: traveler,
    userLocation: null,
    userNameHash: authorName ? hashPII(authorName) : hashPII('anonymous'),
    reviewerDisplayName: cleanGuestName(authorName),
    reviewLanguage: null,
    helpfulVotes: null,
    propertyResponse: raw.hotelResponse?.trim() || null,
    stayRoomId: null,
    hotelRating: typeof raw.hotelOverallRating === 'number' ? raw.hotelOverallRating : null,
    hotelRatingLabel: raw.hotelRatingLabel?.trim() || null,
    hotelReviewsCount: typeof raw.hotelTotalReviews === 'number' ? raw.hotelTotalReviews : null,
    hotelRatingScores: null,
  };
}

// ---- TripAdvisor normalizer ----

interface TripAdvisorReview {
  id?: string;
  text?: string;
  title?: string;
  rating?: number;
  publishedDate?: string;
  user?: { username?: string; name?: string; userLocation?: { name?: string } };
  ownerResponse?: { text?: string };
  tripType?: string;
  language?: string;
  helpfulVotes?: number;
  roomTip?: string;
}

function normalizeTripAdvisorReview(raw: TripAdvisorReview): NormalizedReview | null {
  if (!raw.id) return null;

  return {
    source: 'tripadvisor',
    externalId: String(raw.id),
    checkInDate: null,
    checkOutDate: null,
    likedText: raw.text?.trim() || null,
    dislikedText: null,
    numberOfNights: null,
    rating: raw.rating != null ? raw.rating * 2 : null,
    reviewDate: raw.publishedDate ?? null,
    reviewTitle: raw.title?.trim() || null,
    roomInfo: raw.roomTip?.trim() || null,
    travelerType: raw.tripType?.trim() || null,
    userLocation: raw.user?.userLocation?.name?.trim() || null,
    userNameHash: raw.user?.username ? hashPII(raw.user.username) : hashPII('anonymous'),
    reviewerDisplayName: cleanGuestName(raw.user?.name || raw.user?.username),
    reviewLanguage: raw.language ?? null,
    helpfulVotes: raw.helpfulVotes ?? null,
    propertyResponse: raw.ownerResponse?.text?.trim() || null,
    stayRoomId: null,
    hotelRating: null,
    hotelRatingLabel: null,
    hotelReviewsCount: null,
    hotelRatingScores: null,
  };
}

// ---- Unified batch normalizer for any platform ----

export function normalizeBatchForPlatform(
  rawReviews: Record<string, unknown>[],
  source: ReviewSource
): NormalizedReview[] {
  const results: NormalizedReview[] = [];
  for (const raw of rawReviews) {
    let normalized: NormalizedReview | null = null;
    switch (source) {
      case 'booking':
        normalized = normalizeReview(raw as unknown as ApifyReview);
        break;
      case 'google':
        normalized = normalizeGoogleReview(raw as unknown as GoogleReview);
        break;
      case 'expedia':
        normalized = normalizeExpediaReview(raw as unknown as ExpediaReview);
        break;
      case 'tripadvisor':
        normalized = normalizeTripAdvisorReview(raw as unknown as TripAdvisorReview);
        break;
    }
    if (normalized) results.push(normalized);
  }
  return results;
}
