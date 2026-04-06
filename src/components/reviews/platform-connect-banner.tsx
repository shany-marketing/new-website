"use client";

import { useState } from "react";
import { PLATFORM_CONFIG } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";
import PlatformCredentialsModal from "./platform-credentials-modal";

interface Props {
  hotelId: string;
  platform: ReviewSource;
  onConnected: () => void;
}

export default function PlatformConnectBanner({ hotelId, platform, onConnected }: Props) {
  const [showModal, setShowModal] = useState(false);
  const config = PLATFORM_CONFIG[platform];

  if (!config?.canPost) return null;

  function handleConnect() {
    if (platform === "google") {
      // Redirect to Google OAuth
      window.location.href = `/api/hotels/${hotelId}/platform-connect/google`;
    } else {
      setShowModal(true);
    }
  }

  return (
    <>
      <div
        className="rounded-xl p-4 flex items-center justify-between gap-4 mb-4"
        style={{
          background: `${config.color}08`,
          border: `1px solid ${config.color}20`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: config.color }}
          >
            {config.label[0]}
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              Connect {config.label} to post responses directly
            </p>
            <p className="text-muted text-xs">
              Skip copy-paste — send AI responses straight to {config.label}
            </p>
          </div>
        </div>
        <button
          onClick={handleConnect}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-80 shrink-0"
          style={{ background: config.color }}
        >
          Connect {config.label}
        </button>
      </div>

      {showModal && (
        <PlatformCredentialsModal
          hotelId={hotelId}
          platform={platform}
          onClose={() => setShowModal(false)}
          onConnected={() => {
            setShowModal(false);
            onConnected();
          }}
        />
      )}
    </>
  );
}
