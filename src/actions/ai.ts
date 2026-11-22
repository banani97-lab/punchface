"use server";

import { SLOW_DOWN } from "@/lib/access";
import { draftInvite, type InviteDraft } from "@/lib/ai";
import { allowAction } from "@/lib/request";
import { fail, ok, type ActionResult } from "@/lib/utils";

/** Drafts a title, description, emoji and theme from a one-line description. */
export async function draftInviteAction(prompt: string): Promise<ActionResult<InviteDraft>> {
  const text = prompt.trim();
  if (text.length < 8) return fail("Tell me a little more: what’s the occasion, and what’s the vibe?");
  if (text.length > 600) return fail("That’s a lot! Keep it under 600 characters.");
  if (!(await allowAction("ai-draft", 8, 5 * 60_000))) return fail(SLOW_DOWN);
  return ok(await draftInvite(text));
}
