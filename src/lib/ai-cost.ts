import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { query, queryOne } from './db';

// ── Pricing Map (per 1M tokens, in USD) ────────────────────────────

interface ModelPricing {
  input: number;
  output: number;
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini':            { input: 0.15,  output: 0.60 },
  'gpt-4o':                 { input: 2.50,  output: 10.00 },
  'gpt-5.4':                { input: 2.50,  output: 15.00 },
  'text-embedding-3-large': { input: 0.13,  output: 0 },
  'text-embedding-3-small': { input: 0.02,  output: 0 },
  'claude-sonnet-4-6':      { input: 3.00,  output: 15.00 },
};

function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  if (!pricing) {
    console.warn(`[ai-cost] Unknown model pricing: ${model}`);
    return 0;
  }
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

// ── Budget Check (with 30s in-memory cache) ────────────────────────

export interface BudgetStatus {
  spent: number;
  limit: number;
  hardStop: boolean;
  alertThreshold: number;
  percentUsed: number;
  exceeded: boolean;
}

let _budgetCache: { status: BudgetStatus; cachedAt: number } | null = null;
const BUDGET_CACHE_TTL = 30_000;

export async function checkBudget(): Promise<BudgetStatus> {
  if (_budgetCache && Date.now() - _budgetCache.cachedAt < BUDGET_CACHE_TTL) {
    return _budgetCache.status;
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [spendRow, budgetRow] = await Promise.all([
    queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(estimated_cost), 0)::text AS total FROM ai_cost_log WHERE created_at >= $1`,
      [monthStart.toISOString()]
    ),
    queryOne<{ monthly_limit: string; hard_stop: boolean; alert_threshold: string }>(
      `SELECT monthly_limit::text, hard_stop, alert_threshold::text FROM ai_budget LIMIT 1`
    ),
  ]);

  const spent = parseFloat(spendRow?.total ?? '0');
  const limit = parseFloat(budgetRow?.monthly_limit ?? '100');
  const hardStop = budgetRow?.hard_stop ?? true;
  const alertThreshold = parseFloat(budgetRow?.alert_threshold ?? '80');
  const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

  const status: BudgetStatus = { spent, limit, hardStop, alertThreshold, percentUsed, exceeded: spent >= limit };
  _budgetCache = { status, cachedAt: Date.now() };
  return status;
}

export class BudgetExceededError extends Error {
  constructor(spent: number, limit: number) {
    super(`Monthly AI budget exceeded: $${spent.toFixed(2)} / $${limit.toFixed(2)}`);
    this.name = 'BudgetExceededError';
  }
}

// ── Fire-and-forget cost logging ───────────────────────────────────

export function logCost(params: {
  hotelId?: string | null;
  provider: 'openai' | 'anthropic';
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  pipelineRunId?: string | null;
}): void {
  const cost = computeCost(params.model, params.inputTokens, params.outputTokens);

  // Invalidate cache so next budget check reflects this spend
  _budgetCache = null;

  query(
    `INSERT INTO ai_cost_log (hotel_id, provider, model, operation, input_tokens, output_tokens, estimated_cost, pipeline_run_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      params.hotelId ?? null,
      params.provider,
      params.model,
      params.operation,
      params.inputTokens,
      params.outputTokens,
      cost,
      params.pipelineRunId ?? null,
    ]
  ).catch((err) => console.error('[ai-cost] Failed to log cost:', err));
}

// ── Tracked OpenAI Client ──────────────────────────────────────────

interface TrackedOptions {
  hotelId?: string | null;
  operation: string;
  pipelineRunId?: string | null;
}

export function getTrackedOpenAI(opts: TrackedOptions): OpenAI {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Wrap chat.completions.create
  const origChat = client.chat.completions.create.bind(client.chat.completions);
  (client.chat.completions as { create: typeof origChat }).create = (async (...args: Parameters<typeof origChat>) => {
    const budget = await checkBudget();
    if (budget.exceeded && budget.hardStop) {
      throw new BudgetExceededError(budget.spent, budget.limit);
    }

    const response = await origChat(...args);
    const usage = (response as OpenAI.ChatCompletion).usage;
    if (usage) {
      const body = args[0] as unknown as Record<string, unknown>;
      logCost({
        hotelId: opts.hotelId,
        provider: 'openai',
        model: String(body?.model ?? 'unknown'),
        operation: opts.operation,
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
        pipelineRunId: opts.pipelineRunId,
      });
    }
    return response;
  }) as typeof origChat;

  // Wrap embeddings.create
  const origEmb = client.embeddings.create.bind(client.embeddings);
  (client.embeddings as { create: typeof origEmb }).create = (async (...args: Parameters<typeof origEmb>) => {
    const budget = await checkBudget();
    if (budget.exceeded && budget.hardStop) {
      throw new BudgetExceededError(budget.spent, budget.limit);
    }

    const response = await origEmb(...args);
    const usage = (response as OpenAI.CreateEmbeddingResponse).usage;
    if (usage) {
      const body = args[0] as unknown as Record<string, unknown>;
      logCost({
        hotelId: opts.hotelId,
        provider: 'openai',
        model: String(body?.model ?? 'text-embedding-3-large'),
        operation: opts.operation,
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: 0,
        pipelineRunId: opts.pipelineRunId,
      });
    }
    return response;
  }) as typeof origEmb;

  return client;
}

// ── Tracked Anthropic Client ───────────────────────────────────────

export function getTrackedAnthropic(opts: TrackedOptions): Anthropic {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const origCreate = client.messages.create.bind(client.messages);
  (client.messages as { create: typeof origCreate }).create = (async (...args: Parameters<typeof origCreate>) => {
    const budget = await checkBudget();
    if (budget.exceeded && budget.hardStop) {
      throw new BudgetExceededError(budget.spent, budget.limit);
    }

    const response = await origCreate(...args);
    const msg = response as Anthropic.Message;
    if (msg.usage) {
      logCost({
        hotelId: opts.hotelId,
        provider: 'anthropic',
        model: String(msg.model ?? 'claude-sonnet-4-6'),
        operation: opts.operation,
        inputTokens: msg.usage.input_tokens ?? 0,
        outputTokens: msg.usage.output_tokens ?? 0,
        pipelineRunId: opts.pipelineRunId,
      });
    }
    return response;
  }) as typeof origCreate;

  return client;
}

// ── Monthly Summary (for admin API) ────────────────────────────────

export async function getMonthlySummary() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const ms = monthStart.toISOString();

  const [totalRow, byProvider, byModel, byHotel, byOperation, dailySpend] = await Promise.all([
    queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(estimated_cost), 0)::text AS total FROM ai_cost_log WHERE created_at >= $1`,
      [ms]
    ),
    query<{ provider: string; cost: string }>(
      `SELECT provider, SUM(estimated_cost)::text AS cost FROM ai_cost_log WHERE created_at >= $1 GROUP BY provider`,
      [ms]
    ),
    query<{ model: string; cost: string; calls: string }>(
      `SELECT model, SUM(estimated_cost)::text AS cost, COUNT(*)::text AS calls FROM ai_cost_log WHERE created_at >= $1 GROUP BY model ORDER BY SUM(estimated_cost) DESC`,
      [ms]
    ),
    query<{ hotel_id: string; hotel_name: string; cost: string }>(
      `SELECT c.hotel_id, COALESCE(h.name, 'System') AS hotel_name, SUM(c.estimated_cost)::text AS cost
       FROM ai_cost_log c LEFT JOIN hotels h ON h.id = c.hotel_id
       WHERE c.created_at >= $1
       GROUP BY c.hotel_id, h.name ORDER BY SUM(c.estimated_cost) DESC`,
      [ms]
    ),
    query<{ operation: string; cost: string; calls: string }>(
      `SELECT operation, SUM(estimated_cost)::text AS cost, COUNT(*)::text AS calls FROM ai_cost_log WHERE created_at >= $1 GROUP BY operation ORDER BY SUM(estimated_cost) DESC`,
      [ms]
    ),
    query<{ date: string; cost: string }>(
      `SELECT created_at::date::text AS date, SUM(estimated_cost)::text AS cost FROM ai_cost_log WHERE created_at >= $1 GROUP BY created_at::date ORDER BY created_at::date`,
      [ms]
    ),
  ]);

  return {
    totalSpent: parseFloat(totalRow?.total ?? '0'),
    byProvider: byProvider.map((r) => ({ provider: r.provider, cost: parseFloat(r.cost) })),
    byModel: byModel.map((r) => ({ model: r.model, cost: parseFloat(r.cost), calls: parseInt(r.calls) })),
    byHotel: byHotel.map((r) => ({ hotelId: r.hotel_id ?? 'system', hotelName: r.hotel_name, cost: parseFloat(r.cost) })),
    byOperation: byOperation.map((r) => ({ operation: r.operation, cost: parseFloat(r.cost), calls: parseInt(r.calls) })),
    dailySpend: dailySpend.map((r) => ({ date: r.date, cost: parseFloat(r.cost) })),
  };
}
