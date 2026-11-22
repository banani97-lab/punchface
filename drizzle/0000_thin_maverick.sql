CREATE TABLE `bring_claims` (
	`item_id` text NOT NULL,
	`guest_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`item_id`, `guest_id`),
	FOREIGN KEY (`item_id`) REFERENCES `bring_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bring_items` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`label` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`added_by_guest_id` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bring_items_event_idx` ON `bring_items` (`event_id`);--> statement-breakpoint
CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`to` text NOT NULL,
	`subject` text NOT NULL,
	`html` text NOT NULL,
	`text` text NOT NULL,
	`kind` text NOT NULL,
	`event_id` text,
	`status` text NOT NULL,
	`error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `emails_created_idx` ON `emails` (`created_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`host_id` text NOT NULL,
	`host_name` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`emoji` text DEFAULT '🎉' NOT NULL,
	`theme_id` text DEFAULT 'punch' NOT NULL,
	`cover_key` text,
	`starts_at` integer,
	`ends_at` integer,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`location_name` text DEFAULT '' NOT NULL,
	`location_address` text DEFAULT '' NOT NULL,
	`online_url` text DEFAULT '' NOT NULL,
	`allow_plus_ones` integer DEFAULT true NOT NULL,
	`max_plus_ones` integer DEFAULT 3 NOT NULL,
	`capacity` integer,
	`guest_list_visibility` text DEFAULT 'guests' NOT NULL,
	`wall_enabled` integer DEFAULT true NOT NULL,
	`photos_enabled` integer DEFAULT true NOT NULL,
	`bring_enabled` integer DEFAULT false NOT NULL,
	`poll_open` integer DEFAULT false NOT NULL,
	`notify_host` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_idx` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_host_idx` ON `events` (`host_id`);--> statement-breakpoint
CREATE TABLE `guests` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`token` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`email` text,
	`status` text DEFAULT 'invited' NOT NULL,
	`plus_ones` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`email_opt_out` integer DEFAULT false NOT NULL,
	`invite_sent_at` integer,
	`nudge_sent_at` integer,
	`reminder_sent_at` integer,
	`responded_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guests_token_idx` ON `guests` (`token`);--> statement-breakpoint
CREATE INDEX `guests_event_idx` ON `guests` (`event_id`);--> statement-breakpoint
CREATE INDEX `guests_user_idx` ON `guests` (`user_id`);--> statement-breakpoint
CREATE TABLE `login_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`requested_by` text,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text,
	`author_name` text NOT NULL,
	`key` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `photos_event_idx` ON `photos` (`event_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `poll_options` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `poll_options_event_idx` ON `poll_options` (`event_id`);--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`option_id` text NOT NULL,
	`guest_id` text NOT NULL,
	PRIMARY KEY(`option_id`, `guest_id`),
	FOREIGN KEY (`option_id`) REFERENCES `poll_options`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`guest_id` text,
	`author_name` text NOT NULL,
	`is_host` integer DEFAULT false NOT NULL,
	`kind` text DEFAULT 'comment' NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `posts_event_idx` ON `posts` (`event_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reactions` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`, `emoji`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);