import type { Metadata } from "next";
import PremiumClient from "./premium-client";

export const metadata: Metadata = {
  title: "Premium | RatingIQ",
  description: "AI-powered insights, Elaine AI analyst, automated responses, competitor benchmarking, and more. Everything your chain needs to turn reviews into revenue.",
};

export default function PremiumPage() {
  return <PremiumClient />;
}
