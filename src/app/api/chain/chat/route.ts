import { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { query, queryOne } from "@/lib/db";
import { embedQuery } from "@/lib/embeddings";
import { canAccessChat } from "@/lib/plan";
import { requireAuth, getChainHotelIds } from "@/lib/auth";
import { addCompetitor, scrapeCompetitor } from "@/lib/competitor";
import { getTrackedAnthropic } from "@/lib/ai-cost";
import type { ReviewSource } from "@/types/platform";
import type { ChartSpec } from "@/types/chart";

// Simple in-memory rate limiter: 10 requests per minute per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

const ALLOWED_TABLES = [
  "raw_reviews",
  "atomic_items",
  "consensus_categories",
  "category_stats",
  "category_mappings",
  "response_quality",
  "response_usage",
  "hotels",
  "competitor_hotels",
  "competitor_reviews",
];

const tools: Anthropic.Tool[] = [
  {
    name: "semantic_search",
    description:
      "Search review items across ALL chain hotels by semantic meaning using vector similarity. Returns the most relevant review fragments with hotel_name for cross-property comparison.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Natural language search query describing what to find",
        },
        sentiment: {
          type: "string",
          enum: ["positive", "negative"],
          description: "Optional filter by sentiment",
        },
        limit: {
          type: "number",
          description: "Number of results to return (default 20, max 50)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "query_database",
    description:
      "Run a read-only SQL query across the chain's hotels. $1 is a UUID array of hotel IDs — use hotel_id = ANY($1::uuid[]) to filter. Always JOIN hotels table to get hotel names. Available tables: raw_reviews, atomic_items, consensus_categories, category_stats, category_mappings, response_quality, response_usage, hotels.",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "SELECT query to execute. Must start with SELECT. Use $1 for hotel_ids array (e.g., WHERE hotel_id = ANY($1::uuid[])).",
        },
        params: {
          type: "array",
          items: {},
          description: "Additional query parameters (hotel_ids is always $1)",
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "create_chart",
    description:
      "Create a chart visualization for cross-property comparison. Use this after gathering data to present it visually.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["bar", "line", "scatter", "pie", "composed"],
          description: "Chart type",
        },
        title: { type: "string", description: "Chart title" },
        subtitle: { type: "string", description: "Optional subtitle" },
        data: {
          type: "array",
          items: { type: "object" },
          description: "Array of data points",
        },
        xKey: { type: "string", description: "Key for X axis values" },
        yKey: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          description: "Key(s) for Y axis values",
        },
        xLabel: { type: "string", description: "X axis label" },
        yLabel: { type: "string", description: "Y axis label" },
        layout: {
          type: "string",
          enum: ["horizontal", "vertical"],
          description: "Bar chart layout direction",
        },
        colors: {
          type: "array",
          items: { type: "string" },
          description: "Custom color array",
        },
        series: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              color: { type: "string" },
              type: { type: "string", enum: ["bar", "line", "area"] },
            },
            required: ["key", "color"],
          },
          description: "Series config for composed charts",
        },
      },
      required: ["type", "title", "data", "xKey", "yKey"],
    },
  },
  {
    name: "scrape_competitor",
    description:
      "Add a competitor hotel and start scraping their reviews for benchmarking. Requires a hotel_id to associate the competitor with. Scraping takes 3-10 minutes.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The competitor's review page URL (Booking.com, Google Maps, TripAdvisor, or Expedia)",
        },
        name: {
          type: "string",
          description: "The competitor hotel's name",
        },
        hotel_id: {
          type: "string",
          description: "The hotel_id to associate this competitor with (ask the user which property)",
        },
      },
      required: ["url", "name", "hotel_id"],
    },
  },
];

function detectPlatformFromUrl(url: string): ReviewSource | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("booking.com")) return "booking";
    if (hostname.includes("google.com") || hostname.includes("google.co")) return "google";
    if (hostname.includes("tripadvisor")) return "tripadvisor";
    if (hostname.includes("expedia")) return "expedia";
    return null;
  } catch {
    return null;
  }
}

async function handleScrapeCompetitor(
  hotelIds: string[],
  input: { url: string; name: string; hotel_id: string }
): Promise<string> {
  // Validate hotel_id belongs to the chain
  if (!hotelIds.includes(input.hotel_id)) {
    return JSON.stringify({ error: "The specified hotel_id does not belong to your chain." });
  }

  const platform = detectPlatformFromUrl(input.url);
  if (!platform) {
    return JSON.stringify({
      error: "Could not detect platform from URL. Supported: Booking.com, Google Maps, TripAdvisor, Expedia.",
    });
  }

  const existing = await queryOne<{ id: string; scrape_status: string; avg_rating: number | null; total_reviews: number | null; name: string }>(
    `SELECT id, scrape_status, avg_rating, total_reviews, name FROM competitor_hotels WHERE hotel_id = $1 AND platform_url = $2`,
    [input.hotel_id, input.url]
  );

  if (existing) {
    if (existing.scrape_status === "completed") {
      return JSON.stringify({
        status: "already_completed",
        name: existing.name,
        avg_rating: existing.avg_rating,
        total_reviews: existing.total_reviews,
        message: "This competitor has already been scraped. You can query their data now.",
      });
    }
    if (existing.scrape_status === "scraping") {
      return JSON.stringify({
        status: "already_scraping",
        name: existing.name,
        message: "This competitor is currently being scraped. Please check back in a few minutes.",
      });
    }
  }

  try {
    const competitor = await addCompetitor(input.hotel_id, input.name, input.url, platform);
    scrapeCompetitor(competitor.id).catch((err) =>
      console.error(`[competitor] Background scrape failed:`, err)
    );

    return JSON.stringify({
      status: "scraping",
      name: input.name,
      platform,
      message: `Started scraping ${input.name} from ${platform}. This takes 3-10 minutes. Ask me again shortly to see the results.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: msg });
  }
}

async function handleSemanticSearch(
  hotelIds: string[],
  input: { query: string; sentiment?: string; limit?: number }
): Promise<string> {
  const limit = Math.min(input.limit ?? 20, 50);
  const embedding = await embedQuery(input.query);
  const pgVector = `[${embedding.join(",")}]`;

  let sql = `
    SELECT ai.text, ai.sentiment, h.name AS hotel_name,
           rr.rating, rr.traveler_type, rr.user_location,
           cc.label AS category,
           1 - (ai.embedding <=> $2::vector) AS similarity
    FROM atomic_items ai
    JOIN raw_reviews rr ON rr.id = ai.raw_review_id
    JOIN hotels h ON h.id = ai.hotel_id
    LEFT JOIN category_mappings cm ON cm.atomic_item_id = ai.id
    LEFT JOIN consensus_categories cc ON cc.id = cm.category_id
    WHERE ai.hotel_id = ANY($1::uuid[]) AND ai.embedding IS NOT NULL`;

  const params: unknown[] = [hotelIds, pgVector];

  if (input.sentiment) {
    params.push(input.sentiment);
    sql += ` AND ai.sentiment = $${params.length}`;
  }

  params.push(limit);
  sql += ` ORDER BY ai.embedding <=> $2::vector LIMIT $${params.length}`;

  const rows = await query(sql, params);
  return JSON.stringify(rows);
}

async function handleQueryDatabase(
  hotelIds: string[],
  input: { sql: string; params?: unknown[] }
): Promise<string> {
  const sql = input.sql.trim();

  const stripped = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const upper = stripped.toUpperCase();

  if (!upper.trimStart().startsWith("SELECT")) {
    return JSON.stringify({ error: "Only SELECT queries are allowed" });
  }

  if (stripped.includes(";")) {
    return JSON.stringify({ error: "Multiple statements are not allowed" });
  }

  const blocked = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE",
    "GRANT", "REVOKE", "COPY", "EXECUTE", "DO", "CALL",
    "SET", "INTO", "RETURNING",
  ];
  for (const keyword of blocked) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(stripped)) {
      return JSON.stringify({ error: `Query contains disallowed keyword: ${keyword}` });
    }
  }

  const blockedFunctions = [
    "pg_read_file", "pg_ls_dir", "pg_stat_file", "dblink",
    "lo_import", "lo_export", "current_setting", "set_config",
  ];
  for (const fn of blockedFunctions) {
    if (upper.includes(fn.toUpperCase())) {
      return JSON.stringify({ error: "Query contains a disallowed function" });
    }
  }

  const allTablePattern = /\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)/gi;
  let tableMatch;
  const foundTables = new Set<string>();
  while ((tableMatch = allTablePattern.exec(stripped)) !== null) {
    foundTables.add(tableMatch[1].toLowerCase());
  }
  const commaJoinPattern = /\bFROM\s+[a-z_]\w*(?:\s+\w+)?\s*,\s*([a-z_]\w*)/gi;
  while ((tableMatch = commaJoinPattern.exec(stripped)) !== null) {
    foundTables.add(tableMatch[1].toLowerCase());
  }

  for (const table of foundTables) {
    if (!ALLOWED_TABLES.includes(table)) {
      return JSON.stringify({ error: `Access to table '${table}' is not allowed` });
    }
  }

  if (foundTables.size === 0) {
    return JSON.stringify({ error: "Query must reference at least one allowed table" });
  }

  if (!sql.includes("$1")) {
    return JSON.stringify({ error: "Query must include hotel_ids filter ($1)" });
  }

  const extraParams = (input.params ?? []).slice(0, 5);
  const params = [hotelIds, ...extraParams];

  try {
    const rows = await query(sql, params);
    return JSON.stringify(rows.slice(0, 200));
  } catch {
    return JSON.stringify({ error: "Query failed" });
  }
}

async function buildChainSystemPrompt(hotelIds: string[], chainName?: string | null): Promise<string> {
  const hotels = await query<{ id: string; name: string }>(
    "SELECT id, name FROM hotels WHERE id = ANY($1::uuid[]) ORDER BY name",
    [hotelIds]
  );

  const hotelList = hotels.map((h) => `- ${h.name}`).join("\n");

  const reviewStats = await queryOne<{ count: string; earliest: string; latest: string }>(
    `SELECT COUNT(*)::text AS count,
            MIN(review_date)::text AS earliest,
            MAX(review_date)::text AS latest
     FROM raw_reviews WHERE hotel_id = ANY($1::uuid[])`,
    [hotelIds]
  );

  // Get per-hotel review counts
  const perHotel = await query<{ name: string; count: string; avg_rating: string }>(
    `SELECT h.name, COUNT(rr.id)::text AS count, ROUND(AVG(rr.rating), 1)::text AS avg_rating
     FROM hotels h
     LEFT JOIN raw_reviews rr ON rr.hotel_id = h.id
     WHERE h.id = ANY($1::uuid[])
     GROUP BY h.id, h.name ORDER BY h.name`,
    [hotelIds]
  );

  const perHotelStats = perHotel.map((h) =>
    `- ${h.name}: ${h.count} reviews, avg rating ${h.avg_rating ?? "N/A"}`
  ).join("\n");

  return `You are **Elaine**, the AI chain-level assistant for **${chainName ?? "this hotel chain"}** on the UpStar hotel analytics platform. You have a bird-eye view across ${hotels.length} properties with ${reviewStats?.count ?? 0} total reviews.

## Chain: ${chainName ?? "Hotel Chain"}

### Properties
${hotelList}

### Per-Property Overview
${perHotelStats}

### Date Range
${reviewStats?.earliest ?? "N/A"} to ${reviewStats?.latest ?? "N/A"}

## Hotel Data Schema

Tables available (scoped to chain hotels via $1 = UUID array):

**hotels**: Hotel metadata
- id, name

**raw_reviews**: Guest reviews
- id, hotel_id, check_in_date, check_out_date, liked_text, disliked_text
- rating (1-10), review_title, room_info, traveler_type, user_location
- review_date, source, ai_response, property_response

**atomic_items**: Decomposed review fragments
- id, hotel_id, raw_review_id, text, sentiment ('positive'/'negative'), embedding

**consensus_categories**: AI-generated categories
- id, hotel_id, label, sentiment

**category_mappings**: Item-to-category assignments
- id, hotel_id, atomic_item_id, category_id, classification, confidence

**category_stats**: Pre-aggregated monthly statistics
- id, hotel_id, category_id, period_month, item_count, share_pct, avg_rating, mom_delta

**response_quality**: Quality evaluation of AI responses
- review_id, quality_score (0-100)

**response_usage**: Monthly AI response generation tracking
- hotel_id, month, generation_count

**competitor_hotels**: Competitor properties for benchmarking
- id, hotel_id, name, platform, platform_url
- total_reviews, avg_rating (1-10), response_rate (percentage)
- rating_distribution (JSONB), monthly_data (JSONB)
- last_scraped_at, scrape_status, created_at

**competitor_reviews**: Individual guest reviews from competitor hotels
- id, competitor_id (FK to competitor_hotels), hotel_id
- liked_text, disliked_text, rating (1-10 normalized), review_date
- traveler_type, room_info, user_location, review_language, property_response

## Instructions
- You are Elaine, the chain-level AI assistant. Introduce yourself naturally.
- **Always use hotel names**, never IDs when talking to the user.
- Use **semantic_search** for topic-based queries (e.g., "complaints about breakfast across all hotels").
- Use **query_database** for structured data. Always use \`ANY($1::uuid[])\` for hotel_id filtering. Always JOIN the \`hotels\` table to include hotel names in results.
- Use **create_chart** to visualize cross-property comparisons. Label data by hotel name.
- **IMPORTANT: Do NOT proactively suggest adding competitors or mention the competitor feature unless the user explicitly asks about competitors or benchmarking.**
- When a user asks to compare a property against a competitor, use the **scrape_competitor** tool. Ask them which property the competitor is for (to get the hotel_id) and the competitor's review page URL.
- Scraping takes 3-10 minutes. After triggering it, tell the user to ask again in a few minutes.
- To check competitor scrape status: \`SELECT name, scrape_status, avg_rating, total_reviews FROM competitor_hotels WHERE hotel_id = ANY($1::uuid[])\`
- Once scraped, compare using **competitor_hotels** and **competitor_reviews** tables.
- Focus on **cross-property insights**: compare performance, identify chain-wide patterns, highlight outliers.
- Examples of great chain-level insights:
  - "Breakfast is a top complaint at 3 of your 5 properties"
  - "Hotel X has the highest rating trend this quarter"
  - "Cleanliness scores improved chain-wide after last month"
- Be concise but insightful. Focus on actionable chain-level findings.
- You cannot modify any data — all operations are read-only (except scrape_competitor which adds a competitor).`;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "AI chat is temporarily unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { session } = authResult;
  if (session.user.role !== "chain_manager") {
    return new Response(
      JSON.stringify({ error: "Chain Elaine is only available to chain managers" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!checkRateLimit(session.user.id)) {
    return new Response(
      JSON.stringify({ error: "Too many requests — please wait a minute" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const hotelIds = await getChainHotelIds(session.user.id);
  if (hotelIds.length === 0) {
    return new Response(
      JSON.stringify({ error: "No hotels assigned to your chain" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if at least one hotel has Elaine access
  let chainChatAllowed = false;
  for (const hid of hotelIds) {
    if (await canAccessChat(hid)) {
      chainChatAllowed = true;
      break;
    }
  }
  if (!chainChatAllowed) {
    return new Response(
      JSON.stringify({ error: "Chain Elaine requires at least one hotel with the Elaine add-on or premium plan" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const conversationId: string | undefined = body.conversationId;
    const rawMessages: Array<{ role: string; content: string }> = body.messages ?? [];

    const validRoles = new Set(["user", "assistant"]);
    const userMessages = rawMessages
      .filter((m) => validRoles.has(m.role) && typeof m.content === "string" && m.content.length <= 10000)
      .slice(-50) as Array<{ role: "user" | "assistant"; content: string }>;

    if (userMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const totalChars = userMessages.reduce((sum, m) => sum + m.content.length, 0);
    if (totalChars > 100_000) {
      return new Response(
        JSON.stringify({ error: "Conversation too long — please start a new chat" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = await buildChainSystemPrompt(hotelIds, session.user.chainName);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(type: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data as Record<string, unknown> })}\n\n`)
          );
        }

        // Send SSE keepalive comment every 15s to prevent CloudFront/proxy timeouts
        const keepalive = setInterval(() => {
          try { controller.enqueue(encoder.encode(": keepalive\n\n")); } catch {}
        }, 15_000);

        let accumulatedText = "";
        let accumulatedChart: ChartSpec | undefined;

        try {
          const messages: Anthropic.MessageParam[] = userMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          const anthropic = getTrackedAnthropic({ operation: 'chat' });
          let continueLoop = true;
          while (continueLoop) {
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              system: systemPrompt,
              tools,
              messages,
            });

            let hasToolUse = false;
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of response.content) {
              if (block.type === "text" && block.text) {
                accumulatedText += block.text;
                sendEvent("text", { text: block.text });
              } else if (block.type === "tool_use") {
                hasToolUse = true;
                const toolInput = block.input as Record<string, unknown>;
                let toolResult: string;

                if (block.name === "semantic_search") {
                  toolResult = await handleSemanticSearch(
                    hotelIds,
                    toolInput as { query: string; sentiment?: string; limit?: number }
                  );
                } else if (block.name === "query_database") {
                  toolResult = await handleQueryDatabase(
                    hotelIds,
                    toolInput as { sql: string; params?: unknown[] }
                  );
                } else if (block.name === "create_chart") {
                  const chartSpec = toolInput as unknown as ChartSpec;
                  accumulatedChart = chartSpec;
                  sendEvent("chart", { chart: chartSpec });
                  toolResult = "Chart created and displayed to the user.";
                } else if (block.name === "scrape_competitor") {
                  toolResult = await handleScrapeCompetitor(
                    hotelIds,
                    toolInput as { url: string; name: string; hotel_id: string }
                  );
                } else {
                  toolResult = JSON.stringify({ error: "Unknown tool" });
                }

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: toolResult,
                });
              }
            }

            if (hasToolUse) {
              messages.push({ role: "assistant", content: response.content });
              messages.push({ role: "user", content: toolResults });
            } else {
              continueLoop = false;
            }

            if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
              continueLoop = false;
            }
          }

          sendEvent("done", {});

          // Save conversation
          if (conversationId && (accumulatedText || accumulatedChart)) {
            try {
              const lastUserMsg = userMessages[userMessages.length - 1];
              if (lastUserMsg) {
                await queryOne(
                  `INSERT INTO chat_messages (conversation_id, role, text) VALUES ($1, $2, $3) RETURNING id`,
                  [conversationId, "user", lastUserMsg.content]
                );
              }
              await queryOne(
                `INSERT INTO chat_messages (conversation_id, role, text, chart_spec) VALUES ($1, $2, $3, $4) RETURNING id`,
                [conversationId, "assistant", accumulatedText, accumulatedChart ? JSON.stringify(accumulatedChart) : null]
              );
              await queryOne(
                `UPDATE chat_conversations SET updated_at = now() WHERE id = $1 RETURNING id`,
                [conversationId]
              );
            } catch (saveErr) {
              console.error("Failed to save chain chat messages:", saveErr);
            }
          }
        } catch (err) {
          console.error("Chain chat stream error:", err);
          sendEvent("error", { error: "Chat failed" });
        } finally {
          clearInterval(keepalive);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Chain chat error:", error);
    return new Response(
      JSON.stringify({ error: "Chat request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
