import type { Metadata } from "next";
import PremiumClient from "../capabilities/premium/premium-client";

export const metadata: Metadata = {
  title: "Premium | RatingIQ",
  description: "The full operating layer for hotel chains. AI insights, automated responses, staff actions, benchmarking, and weekly digests - all in one place.",
};

export default function PremiumPage() {
  return <PremiumClient />;
}
