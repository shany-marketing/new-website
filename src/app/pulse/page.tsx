import type { Metadata } from "next";
import StatisticsClient from "../capabilities/statistics/statistics-client";

export const metadata: Metadata = {
  title: "Pulse | RatingIQ",
  description: "Free review analytics for hotel chains. See your review volume, platform mix, guest demographics, and response rate - all in one place.",
};

export default function PulsePage() {
  return <StatisticsClient />;
}
