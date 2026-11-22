export const REACTION_EMOJI = ["❤️", "😂", "🎉", "🔥", "👍"] as const;

export const STATUS_LABEL = {
  going: "Going",
  maybe: "Maybe",
  declined: "Can’t go",
  waitlist: "Waitlist",
  invited: "No reply yet",
} as const;

export const STATUS_EMOJI = {
  going: "🎉",
  maybe: "🤔",
  declined: "😢",
  waitlist: "⏳",
  invited: "✉️",
} as const;
