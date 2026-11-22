import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** All timestamps are UTC epoch milliseconds. */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  /** Null until the person verifies an email; until then the account lives on one device. */
  email: text("email").unique(),
  name: text("name"),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 of the cookie token, so a database leak does not leak sessions. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginTokens = sqliteTable("login_tokens", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  /** The device-only account that asked, so its events can be merged on sign-in. */
  requestedBy: text("requested_by"),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  createdAt: integer("created_at").notNull(),
});

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    hostId: text("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hostName: text("host_name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    emoji: text("emoji").notNull().default("🎉"),
    themeId: text("theme_id").notNull().default("punch"),
    coverKey: text("cover_key"),
    /** Null while the date is still being voted on. */
    startsAt: integer("starts_at"),
    endsAt: integer("ends_at"),
    timezone: text("timezone").notNull().default("UTC"),
    locationName: text("location_name").notNull().default(""),
    locationAddress: text("location_address").notNull().default(""),
    onlineUrl: text("online_url").notNull().default(""),
    allowPlusOnes: integer("allow_plus_ones", { mode: "boolean" }).notNull().default(true),
    maxPlusOnes: integer("max_plus_ones").notNull().default(3),
    capacity: integer("capacity"),
    guestListVisibility: text("guest_list_visibility", { enum: ["everyone", "guests", "host"] })
      .notNull()
      .default("guests"),
    wallEnabled: integer("wall_enabled", { mode: "boolean" }).notNull().default(true),
    photosEnabled: integer("photos_enabled", { mode: "boolean" }).notNull().default(true),
    bringEnabled: integer("bring_enabled", { mode: "boolean" }).notNull().default(false),
    pollOpen: integer("poll_open", { mode: "boolean" }).notNull().default(false),
    notifyHost: integer("notify_host", { mode: "boolean" }).notNull().default(true),
    status: text("status", { enum: ["active", "cancelled"] })
      .notNull()
      .default("active"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [uniqueIndex("events_slug_idx").on(t.slug), index("events_host_idx").on(t.hostId)],
);

export const guests = sqliteTable(
  "guests",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    /** Secret carried by a personal invite link; possession lets you answer as this guest. */
    token: text("token").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    status: text("status", { enum: ["invited", "going", "maybe", "declined", "waitlist"] })
      .notNull()
      .default("invited"),
    plusOnes: integer("plus_ones").notNull().default(0),
    note: text("note").notNull().default(""),
    emailOptOut: integer("email_opt_out", { mode: "boolean" }).notNull().default(false),
    inviteSentAt: integer("invite_sent_at"),
    nudgeSentAt: integer("nudge_sent_at"),
    reminderSentAt: integer("reminder_sent_at"),
    respondedAt: integer("responded_at"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("guests_token_idx").on(t.token),
    index("guests_event_idx").on(t.eventId),
    index("guests_user_idx").on(t.userId),
  ],
);

export const pollOptions = sqliteTable(
  "poll_options",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    startsAt: integer("starts_at").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("poll_options_event_idx").on(t.eventId)],
);

export const pollVotes = sqliteTable(
  "poll_votes",
  {
    optionId: text("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.optionId, t.guestId] })],
);

export const bringItems = sqliteTable(
  "bring_items",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    quantity: integer("quantity").notNull().default(1),
    position: integer("position").notNull().default(0),
    /** Set when a guest added the item themselves ("I’ll bring something else"). */
    addedByGuestId: text("added_by_guest_id"),
  },
  (t) => [index("bring_items_event_idx").on(t.eventId)],
);

export const bringClaims = sqliteTable(
  "bring_claims",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => bringItems.id, { onDelete: "cascade" }),
    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.guestId] })],
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    /** Null for posts written by the host. */
    guestId: text("guest_id").references(() => guests.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    isHost: integer("is_host", { mode: "boolean" }).notNull().default(false),
    kind: text("kind", { enum: ["comment", "update"] })
      .notNull()
      .default("comment"),
    body: text("body").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("posts_event_idx").on(t.eventId, t.createdAt)],
);

export const reactions = sqliteTable(
  "reactions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId, t.emoji] })],
);

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    key: text("key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("photos_event_idx").on(t.eventId, t.createdAt)],
);

/** Every email the app sends is recorded here; in development it doubles as the inbox. */
export const emails = sqliteTable(
  "emails",
  {
    id: text("id").primaryKey(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    kind: text("kind").notNull(),
    eventId: text("event_id"),
    status: text("status", { enum: ["sent", "logged", "failed"] }).notNull(),
    error: text("error"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("emails_created_idx").on(t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type GuestStatus = Guest["status"];
export type Post = typeof posts.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type BringItem = typeof bringItems.$inferSelect;
export type PollOption = typeof pollOptions.$inferSelect;
export type Email = typeof emails.$inferSelect;
