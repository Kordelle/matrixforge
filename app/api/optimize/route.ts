import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { clientCities } from '@/app/data/syntheticCatalog';
import type { ParsedRequest, ProjectResult } from '@/lib/types';

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
      baseURL: 'https://models.inference.ai.azure.com',
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

const SpaceMixSchema = z.object({
  openOfficePct: z.number().min(0).max(1),
  enclosedOfficePct: z.number().min(0).max(1),
  conferencePct: z.number().min(0).max(1),
  loungePct: z.number().min(0).max(1),
});

const AnalyzeInputSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  mode: z.enum(['sequential', 'parallel']).default('parallel'),
});

const DirectInputSchema = z.object({
  targetLocation: z.string().min(1),
  targetLat: z.number(),
  targetLng: z.number(),
  floors: z.number().int().positive().default(1),
  sqFtPerFloor: z.number().positive().default(10000),
  spaceMix: SpaceMixSchema,
  scopeHint: z.enum(['full_fitout', 'furniture_only', 'collaboration_focus', 'office_shell']).default('full_fitout'),
  weights: WeightsSchema,
  mode: z.enum(['sequential', 'parallel']).default('parallel'),
});

const InputSchema = z.union([AnalyzeInputSchema, DirectInputSchema]);

const LLMOutputSchema = z.object({
  targetLocation: z.string().min(1),
  floors: z.number().int().positive().default(1),
  sqFtPerFloor: z.number().positive().default(10000),
  spaceMix: z
    .object({
      openOfficePct: z.number().min(0).max(1).default(0.65),
      enclosedOfficePct: z.number().min(0).max(1).default(0.10),
      conferencePct: z.number().min(0).max(1).default(0.15),
      loungePct: z.number().min(0).max(1).default(0.10),
    })
    .default({ openOfficePct: 0.65, enclosedOfficePct: 0.10, conferencePct: 0.15, loungePct: 0.10 }),
  scopeHint: z.enum(['full_fitout', 'furniture_only', 'collaboration_focus', 'office_shell']).default('full_fitout'),
  weights: WeightsSchema,
});

// ---------------------------------------------------------------------------
// LLM system prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a B2B workspace planning assistant. Extract structured space program parameters from the user's project description.

Return ONLY valid JSON with these exact fields:
{
  "targetLocation": "city, state/country",
  "floors": <number of floors, integer>,
  "sqFtPerFloor": <usable square footage per floor, number>,
  "spaceMix": {
    "openOfficePct": <0.0-1.0>,
    "enclosedOfficePct": <0.0-1.0>,
    "conferencePct": <0.0-1.0>,
    "loungePct": <0.0-1.0>
  },
  "scopeHint": "full_fitout" | "furniture_only" | "collaboration_focus" | "office_shell",
  "weights": {
    "carbonWeight": <0.0-1.0>,
    "costWeight": <0.0-1.0>,
    "speedWeight": <0.0-1.0>
  }
}

Rules:
- weights must sum to exactly 1.0
- spaceMix values must sum to exactly 1.0
- scopeHint: choose the narrowest honest interpretation of the request. Use "furniture_only" when the request is explicitly limited to seating/chairs/furniture; "office_shell" when it focuses on structure/fit-out; "collaboration_focus" when the request emphasizes conference/lounge/collaboration; otherwise use "full_fitout".
- Infer weights from stated priorities: "low carbon" / "eco" / "green" = high carbonWeight; "fast" / "quick delivery" = high speedWeight; "budget" / "low cost" = high costWeight
- Default equal weights (0.33, 0.33, 0.34) if no priorities stated
- targetLocation must be one of: "Chicago, IL" | "New York, NY" | "Los Angeles, CA" | "Toronto, Canada" | "Mexico City, Mexico" | "São Paulo, Brazil" | "London, UK" | "Frankfurt, Germany" | "Cairo, Egypt" | "Dubai, UAE" | "Mumbai, India" | "Singapore" | "Tokyo, Japan" | "Seoul, South Korea" | "Sydney, Australia" — pick the geographically closest match
- floors: extract from "3-floor", "three story", "2 levels" etc. Default 1 if not mentioned.
- sqFtPerFloor: extract explicit sq ft or sq m (convert to sq ft: 1 m² = 10.76 sq ft). If headcount given but no sq ft, estimate: sqFtPerFloor = round(headcount × 100 / floors). Default 10000 if nothing mentioned.
- spaceMix defaults: open 0.65, enclosed 0.10, conference 0.15, lounge 0.10
- "mostly open plan" → openOfficePct 0.75-0.80; "executive floor" → enclosedOfficePct 0.25-0.35; "collaboration-heavy" → loungePct 0.20+
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
    // LLM path: parse natural language → extract space program + location + weights
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

    const { targetLocation, floors, sqFtPerFloor, spaceMix, scopeHint, weights } = llmResult.data;
    const city = resolveCity(targetLocation) ?? clientCities[0];

    solverPayload = {
      targetLocation,
      targetLat: city.lat,
      targetLng: city.lng,
      floors,
      sqFtPerFloor,
      spaceMix,
      scopeHint,
      weights,
      mode,
    };
  } else {
    // -----------------------------------------------------------------------
    // Direct path: pre-parsed data provided — skip LLM (slider re-optimization)
    // -----------------------------------------------------------------------
    const { targetLocation, targetLat, targetLng, floors, sqFtPerFloor, spaceMix, scopeHint, weights, mode } =
      inputResult.data;
    solverPayload = { targetLocation, targetLat, targetLng, floors, sqFtPerFloor, spaceMix, scopeHint, weights, mode };
  }

  // 2. POST to FastAPI compute engine
  const fastapiUrl = process.env.FASTAPI_URL ?? 'http://localhost:7431';

  let result: ProjectResult;
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

    result = (await res.json()) as ProjectResult;
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
