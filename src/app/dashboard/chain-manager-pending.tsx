"use client";

import SectionTitle from "@/components/ui/section-title";

export default function ChainManagerPending({ chainName }: { chainName: string | null }) {
  return (
    <div className="text-center py-20">
      <SectionTitle
        title={chainName ?? "Chain Manager"}
        subtitle="Waiting for hotel assignment"
      />
      <div
        className="rounded-2xl p-10 max-w-md mx-auto"
        style={{
          background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <p className="text-muted text-sm leading-relaxed">
          Your account is set up as a chain manager for <strong className="text-foreground">{chainName}</strong>.
          An admin will assign properties to your account shortly. You&apos;ll see them here once they do.
        </p>
      </div>
    </div>
  );
}
