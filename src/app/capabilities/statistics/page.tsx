import type { Metadata } from "next";
import StatisticsClient from "./statistics-client";

export const metadata: Metadata = {
  title: "Statistics | RatingIQ",
  description: "Free review analytics for hotel chains. See your review volume, platform mix, guest demographics, and response rate — all in one place.",
};

export default function StatisticsPage() {
  return <StatisticsClient />;
}
