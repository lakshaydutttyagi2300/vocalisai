import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidDifficulty } from "@/lib/practice-taxonomy";
import { createGeminiScenarioProvider, type ScenarioCategory, type ScenarioResult } from "@/lib/providers/gemini-scenario-provider";
import { estimateAnalysisCostUsd } from "@/lib/providers/pricing";

// Only SHORT_ANSWER voice categories - no fixed "correctAnswer" for the AI
// to invent or get wrong (see gemini-scenario-provider.ts for why this
// matters). MCQ/comprehension categories are intentionally excluded.
const ALLOWED_CATEGORIES: ScenarioCategory[] = ["READING", "PRONUNCIATION", "FLUENCY", "SPEAKING", "CUSTOMER_SERVICE"];

const FLUENCY_TIME_LIMITS: Record<string, number> = {
  BEGINNER: 30,
  INTERMEDIATE: 45,
  ADVANCED: 60,
  EXPERT: 75,
};

const MAX_TOPIC_LENGTH = 100;

function assembleQuestion(category: ScenarioCategory, difficulty: string, scenario: ScenarioResult) {
  switch (category) {
    case "READING":
      return {
        prompt: "Read the following passage aloud, clearly and at a natural pace.",
        passage: scenario.content,
        expectedAnswer: scenario.content,
        timeLimitSeconds: 90,
      };
    case "PRONUNCIATION":
      return {
        prompt: `Say the following clearly: "${scenario.content}"`,
        passage: scenario.content,
        expectedAnswer: scenario.content,
        timeLimitSeconds: 20,
      };
    case "FLUENCY":
      return {
        prompt: scenario.content,
        passage: null,
        expectedAnswer: null,
        timeLimitSeconds: FLUENCY_TIME_LIMITS[difficulty] ?? 45,
      };
    case "SPEAKING":
      return {
        prompt: scenario.content,
        passage: null,
        expectedAnswer: null,
        timeLimitSeconds: 60,
      };
    case "CUSTOMER_SERVICE":
      return {
        prompt: "Respond to this customer as the agent.",
        passage: scenario.content,
        expectedAnswer: null,
        timeLimitSeconds: 90,
      };
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const category = body?.category as string;
  const difficulty = body?.difficulty as string;
  const rawTopic = typeof body?.topic === "string" ? body.topic.trim() : "";

  if (!ALLOWED_CATEGORIES.includes(category as ScenarioCategory)) {
    return NextResponse.json({ error: "This category doesn't support AI-generated scenarios." }, { status: 400 });
  }
  if (!isValidDifficulty(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 });
  }
  if (rawTopic.length > MAX_TOPIC_LENGTH) {
    return NextResponse.json({ error: `Topic is too long (max ${MAX_TOPIC_LENGTH} characters).` }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "AI scenario generation is not configured on this server." }, { status: 503 });
  }

  const provider = createGeminiScenarioProvider(geminiKey);
  let outcome;
  try {
    outcome = await provider.generateScenario(category as ScenarioCategory, difficulty, rawTopic || null);
  } catch (err) {
    return NextResponse.json(
      { error: `Scenario generation failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 }
    );
  }

  const assembled = assembleQuestion(category as ScenarioCategory, difficulty, outcome.result);
  const estimatedCostUsd = estimateAnalysisCostUsd(outcome.tokenUsage.textInput, outcome.tokenUsage.output);

  const question = await db.practiceQuestion.create({
    data: {
      category,
      difficulty,
      type: "SHORT_ANSWER",
      prompt: assembled.prompt,
      passage: assembled.passage,
      options: null,
      correctAnswer: null,
      expectedAnswer: assembled.expectedAnswer,
      explanation: null,
      scoringCriteria: outcome.result.scoringCriteria,
      timeLimitSeconds: assembled.timeLimitSeconds,
      source: "AI_GENERATED",
      estimatedCostUsd,
    },
  });

  return NextResponse.json({
    question: {
      id: question.id,
      category: question.category,
      difficulty: question.difficulty,
      type: question.type,
      prompt: question.prompt,
      passage: question.passage,
      timeLimitSeconds: question.timeLimitSeconds,
      source: question.source,
    },
  });
}
