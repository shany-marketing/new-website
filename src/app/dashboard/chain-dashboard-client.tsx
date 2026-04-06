"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import HotelCard from "@/components/hotel-card";
import SectionTitle from "@/components/ui/section-title";

interface Hotel {
  id: string;
  name: string;
  reviewCount: number;
  avgRating: number | null;
  pipelineStatus: string | null;
}

export default function ChainDashboardClient({
  hotels,
  chainName,
  allPipelinesReady,
}: {
  hotels: Hotel[];
  chainName: string | null;
  allPipelinesReady: boolean;
}) {
  const totalReviews = hotels.reduce((sum, h) => sum + h.reviewCount, 0);
  const pendingHotels = hotels.filter((h) => h.pipelineStatus !== "completed");

  const elaineCard = (
    <motion.div
      className={`rounded-2xl p-6 mb-8 transition-all ${allPipelinesReady ? "cursor-pointer hover:scale-[1.01]" : "opacity-60"}`}
      style={{
        background: "linear-gradient(135deg, rgba(252,219,55,0.08) 0%, rgba(252,219,55,0.02) 100%)",
        border: "1px solid rgba(252,219,55,0.2)",
        boxShadow: "var(--card-shadow)",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: "rgba(252,219,55,0.15)" }}
        >
          E
        </div>
        <div>
          <h3 className="text-foreground font-semibold text-lg">Chain Elaine</h3>
          {allPipelinesReady ? (
            <p className="text-muted text-sm">
              Bird&apos;s-eye AI insights across all {hotels.length} properties
            </p>
          ) : (
            <p className="text-muted text-sm">
              Waiting for {pendingHotels.length} hotel{pendingHotels.length !== 1 ? "s" : ""} to finish pipeline: {pendingHotels.map((h) => h.name).join(", ")}
            </p>
          )}
        </div>
        {allPipelinesReady ? (
          <div className="ml-auto text-gold-light text-sm font-medium">Open &rarr;</div>
        ) : (
          <div className="ml-auto text-muted text-sm font-medium flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Not Ready
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div>
      <SectionTitle
        title={chainName ?? "Your Chain"}
        subtitle={`${hotels.length} properties \u00b7 ${totalReviews.toLocaleString()} total reviews`}
      />

      {/* Chain Elaine Card */}
      {allPipelinesReady ? (
        <Link href="/dashboard/chain/chat">{elaineCard}</Link>
      ) : (
        elaineCard
      )}

      {/* Hotel Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {hotels.map((hotel) => (
          <HotelCard key={hotel.id} {...hotel} />
        ))}
      </motion.div>
    </div>
  );
}
