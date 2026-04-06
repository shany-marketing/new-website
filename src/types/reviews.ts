import type { ReviewSource } from "./platform";

export interface Review {
  id: string;
  hotelId: string;
  externalId: string;
  source: ReviewSource;
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
  reviewLanguage: string | null;
  reviewerDisplayName: string | null;
  propertyResponse: string | null;
  aiResponse: string | null;
  aiResponseGeneratedAt: string | null;
  aiResponseEdited: boolean;
  sentToBooking: boolean;
  sentToBookingAt: string | null;
  qualityScore: number | null;
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
  search?: string;
  ratingMin?: number;
  ratingMax?: number;
  responseStatus?: "none" | "ai" | "scraped" | "sent" | "all";
  sortBy?: "date" | "rating" | "quality";
  sortOrder?: "asc" | "desc";
}

export interface ResponseQualityCriteria {
  is_response: boolean | null;
  is_right_lang: boolean | null;
  is_answered_positive: boolean | null;
  is_answered_negative: boolean | null;
  is_include_guest_name: boolean | null;
  is_include_hotelier_name: boolean | null;
  is_kind: boolean | null;
  is_concise: boolean | null;
  is_gratitude: boolean | null;
  is_include_come_back_asking: boolean | null;
  is_syntax_right: boolean | null;
  is_personal_tone_not_generic: boolean | null;
  quality_score: number | null;
}

export interface ResponseAnalytics {
  totalReviews: number;
  respondedCount: number;
  responseRate: number;
  avgQualityScore: number | null;
  aiGeneratedCount: number;
  sentToBookingCount: number;
}

export interface HotelResponseSettings {
  hotelierName: string | null;
  hotelierRole: string;
  customResponsePrompt: string | null;
}
