import { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { query, queryOne } from "@/lib/db";
import { embedQuery } from "@/lib/embeddings";
import { canAccessChat } from "@/lib/plan";
import { requireHotelAccess } from "@/lib/auth";
import { addCompetitor, scrapeCompetitor } from "@/lib/competitor";
import { getTrackedAnthropic } from "@/lib/ai-cost";
import type { ReviewSource } from "@/types/platform";
import type { ChartSpec } from "@/types/chart";

const ALLOWED_TABLES = [
  "raw_reviews",
  "atomic_items",
  "consensus_categories",
  "category_stats",
  "category_mappings",
  "response_quality",
  "response_usage",
  "competitor_hotels",
  "competitor_reviews",
];

const tools: Anthropic.Tool[] = [
  {
    name: "semantic_search",
    description:
      "Search hotel review items by semantic meaning using vector similarity. Use this when the user asks about specific topics, complaints, or praise. Returns the most relevant review fragments with metadata.",
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
      "Run a read-only SQL query against the hotel's data. Use for aggregations, counts, and structured queries. Available tables: raw_reviews, atomic_items, consensus_categories, category_stats, category_mappings. All queries are automatically scoped to the current hotel.",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "SELECT query to execute. Must start with SELECT. Use $1 for hotel_id parameter.",
        },
        params: {
          type: "array",
          items: {},
          description:
            "Additional query parameters (hotel_id is always $1 and injected automatically)",
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "create_chart",
    description:
      "Create a chart visualization to display to the user. Use this after gathering and analyzing data to present it visually.",
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
      "Add a competitor hotel and start scraping their reviews for benchmarking. Scraping takes 3-10 minutes. The user should ask again after a few minutes to see the results.",
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
      },
      required: ["url", "name"],
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
  hotelId: string,
  input: { url: string; name: string }
): Promise<string> {
  const platform = detectPlatformFromUrl(input.url);
  if (!platform) {
    return JSON.stringify({
      error: "Could not detect platform from URL. Supported: Booking.com, Google Maps, TripAdvisor, Expedia.",
    });
  }

  // Check if competitor with same URL already exists
  const existing = await queryOne<{ id: string; scrape_status: string; avg_rating: number | null; total_reviews: number | null; name: string }>(
    `SELECT id, scrape_status, avg_rating, total_reviews, name FROM competitor_hotels WHERE hotel_id = $1 AND platform_url = $2`,
    [hotelId, input.url]
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
    const competitor = await addCompetitor(hotelId, input.name, input.url, platform);
    // Fire-and-forget
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
  hotelId: string,
  input: { query: string; sentiment?: string; limit?: number }
): Promise<string> {
  const limit = Math.min(input.limit ?? 20, 50);

  const embedding = await embedQuery(input.query);
  const pgVector = `[${embedding.join(",")}]`;

  let sql = `
    SELECT ai.text, ai.sentiment,
           rr.user_location, rr.traveler_type, rr.rating,
           rr.number_of_nights, rr.room_info,
           cc.label AS category,
           1 - (ai.embedding <=> $2::vector) AS similarity
    FROM atomic_items ai
    JOIN raw_reviews rr ON rr.id = ai.raw_review_id
    LEFT JOIN category_mappings cm ON cm.atomic_item_id = ai.id
    LEFT JOIN consensus_categories cc ON cc.id = cm.category_id
    WHERE ai.hotel_id = $1 AND ai.embedding IS NOT NULL`;

  const params: unknown[] = [hotelId, pgVector];

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
  hotelId: string,
  input: { sql: string; params?: unknown[] }
): Promise<string> {
  const sql = input.sql.trim();

  // Strip SQL comments to prevent bypass attempts
  const stripped = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const upper = stripped.toUpperCase();

  // Validate read-only
  if (!upper.trimStart().startsWith("SELECT")) {
    return JSON.stringify({ error: "Only SELECT queries are allowed" });
  }

  // Block semicolons to prevent statement stacking
  if (stripped.includes(";")) {
    return JSON.stringify({ error: "Multiple statements are not allowed" });
  }

  // Check for disallowed keywords (word-boundary match to avoid false positives)
  const blocked = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE",
    "GRANT", "REVOKE", "UNION", "COPY", "EXECUTE", "DO", "CALL",
    "SET", "INTO", "RETURNING",
  ];
  for (const keyword of blocked) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(stripped)) {
      return JSON.stringify({ error: `Query contains disallowed keyword: ${keyword}` });
    }
  }

  // Block dangerous PG functions
  const blockedFunctions = [
    "pg_read_file", "pg_ls_dir", "pg_stat_file", "dblink",
    "lo_import", "lo_export", "current_setting", "set_config",
  ];
  for (const fn of blockedFunctions) {
    if (upper.includes(fn.toUpperCase())) {
      return JSON.stringify({ error: "Query contains a disallowed function" });
    }
  }

  // Validate only allowed tables — check ALL table references including comma-joins
  const allTablePattern = /\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)/gi;
  let tableMatch;
  const foundTables = new Set<string>();
  while ((tableMatch = allTablePattern.exec(stripped)) !== null) {
    foundTables.add(tableMatch[1].toLowerCase());
  }
  // Catch comma-joins (FROM t1, t2)
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

  // Enforce hotel_id scoping — query MUST reference $1 to prevent cross-hotel data leaks
  if (!sql.includes("$1")) {
    return JSON.stringify({ error: "Query must include hotel_id filter ($1)" });
  }

  // Only allow additional params the AI declares (max 5 to limit abuse)
  const extraParams = (input.params ?? []).slice(0, 5);
  const params = [hotelId, ...extraParams];

  try {
    const rows = await query(sql, params);
    const result = rows.slice(0, 200);
    return JSON.stringify(result);
  } catch {
    return JSON.stringify({ error: "Query failed" });
  }
}

// In-memory cache: hotel system prompts (rebuilt every 10 minutes)
const systemPromptCache = new Map<string, { prompt: string; builtAt: number }>();
const PROMPT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getCachedSystemPrompt(hotelId: string): Promise<string> {
  const cached = systemPromptCache.get(hotelId);
  if (cached && Date.now() - cached.builtAt < PROMPT_CACHE_TTL) {
    return cached.prompt;
  }
  const prompt = await buildSystemPrompt(hotelId);
  systemPromptCache.set(hotelId, { prompt, builtAt: Date.now() });
  return prompt;
}

async function buildSystemPrompt(hotelId: string): Promise<string> {
  // Fetch hotel name
  const hotel = await queryOne<{ name: string }>(
    `SELECT name FROM hotels WHERE id = $1`,
    [hotelId]
  );
  const hotelName = hotel?.name ?? "this hotel";

  // Fetch hotel's categories
  const categories = await query<{ label: string; sentiment: string }>(
    `SELECT label, sentiment FROM consensus_categories WHERE hotel_id = $1 ORDER BY label`,
    [hotelId]
  );

  // Fetch review count and date range
  const reviewStats = await queryOne<{ count: string; earliest: string; latest: string }>(
    `SELECT COUNT(*)::text AS count,
            MIN(check_out_date)::text AS earliest,
            MAX(check_out_date)::text AS latest
     FROM raw_reviews WHERE hotel_id = $1`,
    [hotelId]
  );

  const categoryList =
    categories.length > 0
      ? categories.map((c) => `- ${c.label} (${c.sentiment})`).join("\n")
      : "No categories generated yet.";

  // Fetch competitors
  const competitors = await query<{
    name: string;
    platform: string;
    avg_rating: number | null;
    total_reviews: number | null;
    response_rate: number | null;
  }>(
    `SELECT name, platform, avg_rating, total_reviews, response_rate
     FROM competitor_hotels WHERE hotel_id = $1 ORDER BY name`,
    [hotelId]
  );

  const competitorList =
    competitors.length > 0
      ? competitors.map((c) =>
          `- **${c.name}** (${c.platform}): ${c.avg_rating ?? "?"}/10 avg rating, ${c.total_reviews ?? "?"} reviews${c.response_rate != null ? `, ${c.response_rate}% response rate` : ""}`
        ).join("\n")
      : "No competitors configured.";

  return `You are **Elaine**, the AI assistant for **${hotelName}** on the UpStar hotel analytics platform. You know everything about this hotel — reviews, responses, ratings, guest profiles, quality scores, trends, and competitive positioning. You help hotel managers understand their property deeply and make data-driven decisions.

## Hotel Context
- **Hotel**: ${hotelName}
- **Total Reviews**: ${reviewStats?.count ?? "unknown"}
- **Date Range**: ${reviewStats?.earliest ?? "N/A"} to ${reviewStats?.latest ?? "N/A"}

## Hotel Data Schema

Tables available (all scoped to hotel_id = $1):

**raw_reviews**: Guest reviews and responses
- id, hotel_id, external_id, check_in_date, check_out_date, liked_text, disliked_text
- rating (1-10), review_title, room_info, traveler_type, user_location, number_of_nights
- reviewer_display_name, review_language, property_response (scraped from Booking.com)
- ai_response (AI-generated response), ai_response_generated_at, ai_response_edited (boolean)
- sent_to_booking (boolean), sent_to_booking_at

**atomic_items**: Decomposed review fragments
- id, hotel_id, raw_review_id, text, sentiment ('positive'/'negative'), embedding (vector)

**consensus_categories**: AI-generated categories
- id, hotel_id, label, sentiment

**category_mappings**: Item-to-category assignments
- id, hotel_id, atomic_item_id, category_id, classification, confidence

**category_stats**: Pre-aggregated monthly statistics
- id, hotel_id, category_id, period_month, item_count, share_pct, avg_rating, mom_delta

**response_quality**: 12-criteria quality evaluation of AI responses
- review_id, quality_score (0-100)
- is_response, is_right_lang, is_answered_positive, is_answered_negative
- is_include_guest_name, is_include_hotelier_name, is_kind, is_concise
- is_gratitude, is_include_come_back_asking, is_syntax_right, is_personal_tone_not_generic

**response_usage**: Monthly AI response generation tracking
- hotel_id, month (YYYY-MM), generation_count

**competitor_hotels**: Competitor properties for benchmarking
- id, hotel_id, name, platform, platform_url
- total_reviews, avg_rating (1-10), response_rate (percentage)
- rating_distribution (JSONB: {"1": count, "2": count, ...})
- monthly_data (JSONB: array of {month, avg_rating, review_count})
- last_scraped_at, scrape_status, created_at

**competitor_reviews**: Individual guest reviews from competitor hotels
- id, competitor_id (FK to competitor_hotels), hotel_id
- liked_text (what guests liked), disliked_text (what guests disliked)
- rating (1-10 normalized), review_date, review_title
- traveler_type, room_info, user_location, review_language
- property_response (competitor's reply to the review)

## Hotel's Current Categories
${categoryList}

## Competitors
${competitorList}

## Instructions
- You are Elaine. Introduce yourself naturally when it fits. Be warm and professional.
- Use **semantic_search** when the user asks about specific topics (e.g., "complaints about cleanliness"). This uses vector similarity to find relevant review fragments by meaning.
- Use **query_database** for aggregations, counts, and structured data queries. Always use $1 for hotel_id.
- Use **create_chart** to visualize data. Keep charts concise (max ~20 data points). Choose appropriate chart types:
  - Bar: comparisons across categories
  - Line: trends over time
  - Pie: proportions/distributions
  - Scatter: correlations
  - Composed: multiple metrics on one chart
- You can answer questions about review responses: response rates, quality scores, which criteria fail most, which reviews lack responses, etc.
- You can compare the hotel against its **competitors** using competitor_hotels and competitor_reviews tables. Use competitor names naturally — the manager added them for benchmarking.
- For aggregate comparisons (ratings, volumes, response rates): query **competitor_hotels** with hotel_id = $1.
- For understanding what competitor guests say (likes, dislikes, themes): query **competitor_reviews** with hotel_id = $1. JOIN with competitor_hotels to get the competitor name. Use LIMIT to keep results manageable.
- Example: "What do Orchid guests like?" → query competitor_reviews.liked_text WHERE competitor_id = (SELECT id FROM competitor_hotels WHERE hotel_id = $1 AND name ILIKE '%orchid%') LIMIT 30.
- Always analyze the data before creating charts — explain what the chart shows.
- Be concise but insightful. Focus on actionable findings.
- Never expose raw IDs to the user. Use labels and human-readable values.
- **IMPORTANT: Do NOT proactively suggest adding competitors or mention the competitor feature unless the user explicitly asks about competitors or benchmarking.** Only use the scrape_competitor tool when the user specifically requests to add or compare against a competitor.
- When a user asks to add a competitor, use the **scrape_competitor** tool. Ask them for the competitor's review page URL (Booking.com, Google Maps, TripAdvisor, or Expedia).
- Scraping takes 3-10 minutes. After triggering it, tell the user to ask again in a few minutes.
- To check competitor scrape status: \`SELECT name, scrape_status, avg_rating, total_reviews FROM competitor_hotels WHERE hotel_id = $1\`
- Once a competitor's scrape is complete, compare using **competitor_hotels** and **competitor_reviews** tables, and visualize with **create_chart**.
- You cannot modify any data — all operations are read-only (except scrape_competitor which adds a competitor).`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "AI chat is temporarily unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const { hotelId } = await params;

  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const chatAllowed = await canAccessChat(hotelId);
    if (!chatAllowed) {
      return new Response(
        JSON.stringify({ error: "AI Chat requires the Elaine add-on ($99/mo)" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const conversationId: string | undefined = body.conversationId;
    const rawMessages: Array<{ role: string; content: string }> =
      body.messages ?? [];

    // Validate and sanitize message roles (only user/assistant allowed)
    const validRoles = new Set(["user", "assistant"]);
    const userMessages = rawMessages
      .filter((m) => validRoles.has(m.role) && typeof m.content === "string")
      .slice(-50) as Array<{ role: "user" | "assistant"; content: string }>;

    if (userMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Cache system prompt per hotel (rebuilt at most once per 10 minutes)
    const systemPrompt = await getCachedSystemPrompt(hotelId);

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

        // Track accumulated response for conversation saving
        let accumulatedText = "";
        let accumulatedChart: ChartSpec | undefined;

        try {
          // Build messages for Claude
          const messages: Anthropic.MessageParam[] = userMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          // Loop for tool use
          const anthropic = getTrackedAnthropic({ hotelId, operation: 'chat' });
          let continueLoop = true;
          while (continueLoop) {
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              system: systemPrompt,
              tools,
              messages,
            });

            // Process response content blocks
            let hasToolUse = false;

            // Separate text blocks and tool use blocks
            const textBlocks = response.content.filter((b) => b.type === "text" && b.text);
            const toolBlocks = response.content.filter((b) => b.type === "tool_use");

            for (const block of textBlocks) {
              if (block.type === "text" && block.text) {
                accumulatedText += block.text;
                sendEvent("text", { text: block.text });
              }
            }

            // Execute tool calls in parallel
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            if (toolBlocks.length > 0) {
              hasToolUse = true;

              const toolPromises = toolBlocks.map(async (block) => {
                if (block.type !== "tool_use") return null;
                const toolInput = block.input as Record<string, unknown>;
                let toolResult: string;

                if (block.name === "semantic_search") {
                  toolResult = await handleSemanticSearch(
                    hotelId,
                    toolInput as { query: string; sentiment?: string; limit?: number }
                  );
                } else if (block.name === "query_database") {
                  toolResult = await handleQueryDatabase(
                    hotelId,
                    toolInput as { sql: string; params?: unknown[] }
                  );
                } else if (block.name === "create_chart") {
                  const chartSpec = toolInput as unknown as ChartSpec;
                  accumulatedChart = chartSpec;
                  sendEvent("chart", { chart: chartSpec });
                  toolResult = "Chart created and displayed to the user.";
                } else if (block.name === "scrape_competitor") {
                  toolResult = await handleScrapeCompetitor(
                    hotelId,
                    toolInput as { url: string; name: string }
                  );
                } else {
                  toolResult = JSON.stringify({ error: "Unknown tool" });
                }

                return {
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: toolResult,
                };
              });

              const results = await Promise.all(toolPromises);
              for (const r of results) {
                if (r) toolResults.push(r);
              }
            }

            if (hasToolUse) {
              // Add assistant message and tool results, then continue loop
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

          // Save messages to conversation if conversationId provided
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
              console.error("Failed to save chat messages:", saveErr);
            }
          }
        } catch (err) {
          console.error("Chat stream error:", err);
          sendEvent("error", {
            error: "Chat failed",
          });
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
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Chat request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
