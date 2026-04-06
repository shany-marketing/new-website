import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "RatingIQ | From reviews to revenue",
  description:
    "RatingIQ shows hotels what's driving their rating, what to fix first, and how it connects to ADR and RevPAR. Rating Intelligence + Reputation QA for Hotels.",
  openGraph: {
    title: "RatingIQ | From reviews to revenue",
    description:
      "RatingIQ shows hotels what's driving their rating, what to fix first, and how it connects to ADR and RevPAR. Not more noise. Clear operational direction.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RatingIQ | From reviews to revenue",
    description:
      "RatingIQ shows hotels what's driving their rating, what to fix first, and how it connects to revenue.",
  },
};

export default function Home() {
  return <HomeClient />;
}
