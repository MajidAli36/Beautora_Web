import {
  HELP_ARTICLES,
  type HelpArticle,
} from "@/lib/marketing/help-knowledge";
import { SYNCOPS } from "@/lib/print/syncops";

export type HelpChatReply = {
  answer: string;
  articleId: string | null;
  title: string | null;
  links: { label: string; href: string }[];
  confidence: "high" | "medium" | "low";
};

const STOP = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "do",
  "does",
  "did",
  "can",
  "could",
  "will",
  "would",
  "should",
  "how",
  "what",
  "when",
  "where",
  "who",
  "which",
  "why",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "and",
  "or",
  "my",
  "your",
  "our",
  "me",
  "you",
  "it",
  "this",
  "that",
  "any",
  "all",
  "about",
  "please",
  "tell",
  "give",
  "need",
  "want",
  "have",
  "has",
  "there",
  "from",
  "into",
  "also",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function scoreArticle(query: string, article: HelpArticle): number {
  const q = normalize(query);
  if (!q) return 0;
  const qTokens = tokens(query);
  let score = 0;

  const title = normalize(article.title);
  if (q === title || title.includes(q) || q.includes(title)) score += 14;

  for (const raw of article.keywords) {
    const kw = normalize(raw);
    if (!kw) continue;
    if (q === kw) score += 16;
    else if (q.includes(kw)) score += 9 + Math.min(kw.length, 16) * 0.12;
    else if (kw.includes(q) && q.length >= 3) score += 6;
    else {
      const kwTokens = tokens(raw);
      let overlap = 0;
      for (const t of qTokens) {
        if (kwTokens.includes(t) || kw.includes(t)) overlap += 1;
      }
      if (overlap) score += overlap * 2.8;
    }
  }

  const answer = normalize(article.answer);
  const titleTokens = tokens(article.title);
  for (const t of qTokens) {
    if (titleTokens.includes(t)) score += 1.8;
    if (answer.includes(t)) score += 0.85;
  }

  // Prefer the full-features article for broad “everything / all” questions
  if (
    article.id === "all-features" &&
    /\b(all|every|everything|full|complete|list|overview|modules)\b/.test(q)
  ) {
    score += 10;
  }

  return score;
}

function uniqueLinks(
  links: { label: string; href: string }[]
): { label: string; href: string }[] {
  const seen = new Set<string>();
  const out: { label: string; href: string }[] = [];
  for (const l of links) {
    const key = `${l.href}|${l.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out.slice(0, 5);
}

const FALLBACK: HelpChatReply = {
  answer: `I help with anything about Beautora: pricing & trial, signup, dashboard, customers, appointments, online booking & advances, queue, POS, sales (amend/void/refund), services & packages, products & in-house stock, chairs, staff & roles, attendance, devices, reports, finances, WhatsApp, feedback, settings, billing, partners, and apps. Try “List all features” or “How does POS work?” — or email ${SYNCOPS.email} / call ${SYNCOPS.phoneDisplay}.`,
  articleId: null,
  title: null,
  links: [
    { label: "All features", href: "/#platform" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Start free", href: "/signup" },
    { label: "Contact", href: "/contact" },
  ],
  confidence: "low",
};

/** Retrieve the best knowledge-base answer (may blend top related articles). */
export function answerFromKnowledgeBase(question: string): HelpChatReply {
  const q = question.trim();
  if (q.length < 2) return FALLBACK;

  const ranked = HELP_ARTICLES.map((article) => ({
    article,
    score: scoreArticle(q, article),
  })).sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 3.2) return FALLBACK;

  const second = ranked[1];
  const blend =
    second &&
    second.score >= 6 &&
    second.score >= best.score * 0.72 &&
    second.article.id !== best.article.id &&
    best.score < 18;

  if (blend) {
    return {
      answer: `${best.article.answer}\n\nAlso related — ${second.article.title}: ${second.article.answer}`,
      articleId: best.article.id,
      title: best.article.title,
      links: uniqueLinks([
        ...(best.article.links ?? []),
        ...(second.article.links ?? []),
      ]),
      confidence: best.score >= 10 ? "high" : "medium",
    };
  }

  return {
    answer: best.article.answer,
    articleId: best.article.id,
    title: best.article.title,
    links: best.article.links ?? [],
    confidence: best.score >= 10 ? "high" : "medium",
  };
}
