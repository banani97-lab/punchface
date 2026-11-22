import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { EMOJI_CHOICES, OCCASIONS, THEMES, isThemeId } from "./themes";

/**
 * The invite writer. With ANTHROPIC_API_KEY set it asks Claude for a draft;
 * without it (or if the call fails) a keyword-based fallback keeps the
 * feature usable, and the result says which one produced it.
 */

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

const MODEL = "claude-opus-5-5";

const draftSchema = z.object({
  title: z.string(),
  description: z.string(),
  emoji: z.string(),
  themeId: z.string(),
  bringItems: z.array(z.string()),
});

export type InviteDraft = z.infer<typeof draftSchema> & { source: "ai" | "template" };

const SYSTEM = `You write party invitations for punchface, an invitation app. The host describes their event in a sentence or two and you draft the invite.

Write the way a warm, funny friend would: specific to what the host told you, never generic, never corporate. Don’t invent facts the host didn’t give you (no made-up addresses, dates, names or dress codes). The date, time and place have their own fields in the app, so leave them out of the description.

Return:
- title: at most 60 characters, the kind of name people would say out loud ("Sam’s 30th", "Friendsgiving at Priya’s"). No trailing punctuation unless it’s an exclamation that fits.
- description: 2 to 4 short sentences for the invite body. Say what’s happening and what the vibe is, and mention anything guests should know that the host told you. Plain text, no markdown, no hashtags, at most one emoji.
- emoji: a single emoji that fits the event.
- themeId: the id of the visual theme that best matches, chosen from this list:
${THEMES.map((t) => `  ${t.id}: ${t.name} (${t.vibe})`).join("\n")}
- bringItems: if the event sounds like a potluck, picnic, BBQ or anything where guests bring things, up to 6 short items for a sign-up list. Otherwise an empty list.`;

function clean(draft: z.infer<typeof draftSchema>, source: InviteDraft["source"]): InviteDraft {
  return {
    title: draft.title.trim().slice(0, 80),
    description: draft.description.trim().slice(0, 1200),
    emoji: Array.from(draft.emoji.trim()).slice(0, 4).join("") || "🎉",
    themeId: isThemeId(draft.themeId) ? draft.themeId : "punch",
    bringItems: draft.bringItems.map((s) => s.trim().slice(0, 80)).filter(Boolean).slice(0, 6),
    source,
  };
}

async function draftWithClaude(prompt: string): Promise<InviteDraft | null> {
  const client = new Anthropic();
  // Server-side fallbacks: if a safety classifier declines the request, the
  // API retries it on a fallback model inside the same call.
  const response = await client.beta.messages.create(
    {
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(draftSchema) },
      messages: [{ role: "user", content: prompt }],
    },
    { timeout: 30_000, maxRetries: 1 },
  );
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") return null;
  const parsed = draftSchema.safeParse(JSON.parse(text.text));
  return parsed.success ? clean(parsed.data, "ai") : null;
}

const KEYWORDS: Array<[RegExp, string]> = [
  [/\b(kid|child|toddler|turns? [1-9]\b|1st|2nd|3rd|[4-9]th birthday)/i, "kids"],
  [/\b(birthday|bday|turning|\d0th)\b/i, "birthday"],
  [/\b(baby|shower|gender reveal)\b/i, "shower"],
  [/\b(engage|wedding|anniversary|bridal|proposal)/i, "engagement"],
  [/\b(bbq|barbecue|cookout|picnic|potluck|grill)/i, "bbq"],
  [/\b(dinner|supper|brunch|lunch|tasting)\b/i, "dinner"],
  [/\b(game|board game|poker|trivia|movie|watch party)/i, "game"],
  [/\b(christmas|holiday|hanukkah|new year|nye|thanksgiving|friendsgiving|cookie)/i, "holiday"],
  [/\b(pool|beach|swim|lake)\b/i, "pool"],
  [/\b(gala|cocktail|formal|black tie|soir[ée]e)\b/i, "fancy"],
  [/\b(housewarming|house party|party|rager|dance|dj|drinks)\b/i, "house"],
];

/** No-API fallback: picks an occasion from keywords and tidies the host’s own words. */
export function draftFromTemplate(prompt: string): InviteDraft {
  const occasionId = KEYWORDS.find(([re]) => re.test(prompt))?.[1] ?? "other";
  const occasion = OCCASIONS.find((o) => o.id === occasionId)!;
  const sentence = prompt.trim().replace(/\s+/g, " ");
  const firstClause = sentence.split(/[.!?\n]/)[0].trim();
  // Only reuse the host’s words as a title when they are short enough to be one.
  const title =
    firstClause.length <= 48 && firstClause.length >= 3 ? firstClause[0].toUpperCase() + firstClause.slice(1) : "";
  const body = /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
  return clean(
    {
      title,
      description: `${body[0].toUpperCase()}${body.slice(1)} Tap to let us know if you can make it.`,
      emoji: EMOJI_CHOICES.includes(occasion.emoji) ? occasion.emoji : "🎉",
      themeId: occasion.themeId,
      bringItems: occasion.bring ?? [],
    },
    "template",
  );
}

export async function draftInvite(prompt: string): Promise<InviteDraft> {
  if (aiConfigured()) {
    try {
      const draft = await draftWithClaude(prompt);
      if (draft) return draft;
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        console.error("[ai] ANTHROPIC_API_KEY was rejected.");
      } else if (error instanceof Anthropic.RateLimitError) {
        console.error("[ai] Rate limited by the Claude API.");
      } else if (error instanceof Anthropic.APIError) {
        console.error(`[ai] Claude API error ${error.status}: ${error.message}`);
      } else {
        console.error("[ai] Draft failed", error);
      }
    }
  }
  return draftFromTemplate(prompt);
}
