import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { clientCities } from '@/app/data/syntheticCatalog';
import type { OptimizationResult, ParsedRequest } from '@/lib/types';

// Prevent Next.js from statically rendering this route at build time
export const dynamic = 'force-dynamic';

// GitHub Copilot chat completions client — server-side only, lazily
// initialized at request time so next build never evaluates it without a token.
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }
    _openai = new OpenAI({
      baseURL: 'https://api.githubcopilot.com',
      apiKey: process.env.GITHUB_TOKEN,
    });
  }
  return _openai;
}

// ---------------------------------------------------------------------------
// Input validation schemas — two paths:
//   "analyze"  → natural language query → LLM → FastAPI
//   "direct"   → pre-parsed data + weights → FastAPI only (slider re-optimize)
// ---------------------------------------------------------------------------

const WeightsSchema = z.object({
  carbonWeight: z.number().min(0).max(1),
  costWeight: z.number().min(0).max(1),
  speedWeight: z.number().min(0).max(1),
});

const AnalyzeInputSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  mode: z.enum(['sequential', 'parallel']).default('parallel'),
});

const DirectInputSchema = z.object({
  targetLocation: z.string().min(1),
  targetLat: z.number(),
  targetLng: z.number(),
  volume: z.number().positive(),
  weights: WeightsSchema,
  mode: z.enum(['sequential', 'parallel']).default('parallel'),
});

const InputSchema = z.union([AnalyzeInputSchema, DirectInputSchema]);

const LLMOutputSchema = z.object({
  targetLocation: z.string().min(1),
  volume: z.number().positive(),
  weights: WeightsSchema,
});

// ---------------------------------------------------------------------------
// LLM system prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a B2B supply chain planning assistant. Extract structured parameters from the user's manufacturing request.

Return ONLY valid JSON with these exact fields:
{
  "targetLocation": "city, state/country",
  "volume": <number of units>,
  "weights": {
    "carbonWeight": <0.0-1.0>,
    "costWeight": <0.0-1.0>,
    "speedWeight": <0.0-1.0>
  }
}

Rules:
- weights must sum to exactly 1.0
- Infer weights from stated priorities: "low carbon" = high carbonWeight, "fast delivery" = high speedWeight, "low cost" = high costWeight
- Default equal weights (0.33, 0.33, 0.34) if no priorities stated
- targetLocation must be one of: "Chicago, IL" | "New York, NY" | "London, UK" — pick the geographically closest match
- Default volume to 100 if not specified
- Return ONLY the JSON object, no prose`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveCity(location: string): (typeof clientCities)[number] | null {
  const lower = location.toLowerCase();
  return (
    clientCities.find(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        lower.includes(c.name.toLowerCase().split(',')[0])
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// POST /api/optimize
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const inputResult = InputSchema.safeParse(body);
  if (!inputResult.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: inputResult.error.flatten() },
      { status: 400 }
    );
  }

  let solverPayload: ParsedRequest;

  if ('query' in inputResult.data) {
    // -----------------------------------------------------------------------
    // LLM path: parse natural language → extract location, volume, weights
    // -----------------------------------------------------------------------
    const { query, mode } = inputResult.data;

    let llmRaw: string | null = null;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
      });
      llmRaw = completion.choices[0]?.message?.content ?? null;
    } catch (err) {
      console.error('[optimize] OpenAI error:', err);
      return NextResponse.json({ error: 'LLM service unavailable' }, { status: 502 });
    }

    if (!llmRaw) {
      return NextResponse.json({ error: 'Empty LLM response' }, { status: 502 });
    }

    let llmData: unknown;
    try {
      llmData = JSON.parse(llmRaw);
    } catch {
      return NextResponse.json({ error: 'LLM returned malformed JSON' }, { status: 422 });
    }

    const llmResult = LLMOutputSchema.safeParse(llmData);
    if (!llmResult.success) {
      return NextResponse.json(
        { error: 'LLM output did not match schema', details: llmResult.error.flatten() },
        { status: 422 }
      );
    }

    const { targetLocation, volume, weights } = llmResult.data;
    const city = resolveCity(targetLocation) ?? clientCities[0];

    solverPayload = { targetLocation, targetLat: city.lat, targetLng: city.lng, volume, weights, mode };
  } else {
    // -----------------------------------------------------------------------
    // Direct path: pre-parsed data provided — skip LLM (slider re-optimization)
    // -----------------------------------------------------------------------
    const { targetLocation, targetLat, targetLng, volume, weights, mode } = inputResult.data;
    solverPayload = { targetLocation, targetLat, targetLng, volume, weights, mode };
  }

  // 2. POST to FastAPI compute engine
  const fastapiUrl = process.env.FASTAPI_URL ?? 'http://localhost:7431';

  let result: OptimizationResult;
  try {
    const res = await fetch(`${fastapiUrl}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(solverPayload),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[optimize] FastAPI error:', res.status, detail);
      return NextResponse.json({ error: 'Compute engine error', detail }, { status: 502 });
    }

    result = (await res.json()) as OptimizationResult;
  } catch (err) {
    console.error('[optimize] FastAPI unreachable:', err);
    return NextResponse.json(
      {
        error:
          'Compute engine unreachable. Ensure python/main.py is running on port 7431 (uvicorn main:app --reload).',
      },
      { status: 502 }
    );
  }

  return NextResponse.json(result);
}