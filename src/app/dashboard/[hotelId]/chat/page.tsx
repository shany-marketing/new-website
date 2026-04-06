import { checkFeatureAccess } from "@/lib/plan";
import UpgradeBanner from "@/components/ui/upgrade-banner";
import ElaineChatPage from "./chat-client";

interface Props {
  params: Promise<{ hotelId: string }>;
}

export default async function ElainePage({ params }: Props) {
  const { hotelId } = await params;

  const hasAccess = await checkFeatureAccess(hotelId, "elaine");

  if (!hasAccess) {
    return (
      <div className="py-12">
        <UpgradeBanner feature="Elaine AI Assistant — Included in the Insight tier ($999/mo)" />
      </div>
    );
  }

  return <ElaineChatPage />;
}
