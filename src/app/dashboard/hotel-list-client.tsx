"use client";

import { motion } from "framer-motion";
import HotelCard from "@/components/hotel-card";
import SectionTitle from "@/components/ui/section-title";

interface Hotel {
  id: string;
  name: string;
  reviewCount: number;
  avgRating: number | null;
  pipelineStatus: string | null;
}

export default function HotelListClient({ hotels }: { hotels: Hotel[] }) {
  if (hotels.length === 0) {
    return (
      <div className="text-center py-20">
        <SectionTitle title="Your Hotels" subtitle="No hotels yet" />
        <div
          className="rounded-2xl p-10 max-w-md mx-auto"
          style={{
            background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <p className="text-muted text-sm">
            Hotels will appear here once they are created and have review data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle title="Your Hotels" subtitle={`${hotels.length} hotel${hotels.length > 1 ? "s" : ""} connected`} />
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {hotels.map((hotel) => (
          <HotelCard key={hotel.id} {...hotel} />
        ))}
      </motion.div>
    </div>
  );
}
