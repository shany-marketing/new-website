import { NextRequest, NextResponse } from "next/server";
import { generateEmbeddings } from "@/lib/embeddings";
import { checkFeatureAccess } from "@/lib/plan";
import { requireHotelAccess } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    if (!(await checkFeatureAccess(hotelId, "embeddings"))) {
      return NextResponse.json(
        { error: "Embedding generation requires the Analytics add-on" },
        { status: 403 }
      );
    }

    const result = await generateEmbeddings(hotelId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Embedding error:", error);
    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}
