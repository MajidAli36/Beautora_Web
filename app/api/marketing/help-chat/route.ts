import { NextResponse } from "next/server";
import { z } from "zod";
import { answerFromKnowledgeBase } from "@/lib/marketing/help-answer";
import { getHelpSystemPrompt } from "@/lib/marketing/help-knowledge";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(500),
});

/**
 * Marketing help chat — grounded in Beautora knowledge base.
 * Optional: set OPENAI_API_KEY to polish answers with GPT using the same KB context.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const message = parsed.data.message;
  const kb = answerFromKnowledgeBase(message);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey && kb.confidence !== "low") {
    try {
      const polished = await polishWithOpenAI(apiKey, message, kb.answer);
      if (polished) {
        return NextResponse.json({
          ...kb,
          answer: polished,
          source: "knowledge+llm",
        });
      }
    } catch {
      /* fall through to KB answer */
    }
  }

  return NextResponse.json({
    ...kb,
    source: "knowledge",
  });
}

async function polishWithOpenAI(
  apiKey: string,
  question: string,
  kbAnswer: string
): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_HELP_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 280,
      messages: [
        { role: "system", content: getHelpSystemPrompt() },
        {
          role: "user",
          content: `Visitor question: ${question}\n\nCanonical knowledge answer (stay faithful):\n${kbAnswer}\n\nReply helpfully in plain language. Do not add facts not in the knowledge.`,
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}
