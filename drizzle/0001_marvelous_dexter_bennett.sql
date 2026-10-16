CREATE TABLE `checkout_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stripe_session_id` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`member_email` text NOT NULL,
	`member_name` text DEFAULT '' NOT NULL,
	`member_phone` text DEFAULT '' NOT NULL,
	`offer_id` integer NOT NULL,
	`amount_total` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'brl' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_orders_session_unique` ON `checkout_orders` (`stripe_session_id`);--> statement-breakpoint
CREATE INDEX `checkout_orders_member_idx` ON `checkout_orders` (`member_email`);--> statement-breakpoint
CREATE INDEX `checkout_orders_status_idx` ON `checkout_orders` (`status`);--> statement-breakpoint
CREATE TABLE `member_entitlements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_email` text NOT NULL,
	`access_key` text DEFAULT 'all_courses' NOT NULL,
	`source` text DEFAULT 'stripe' NOT NULL,
	`source_reference` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_period_end` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_entitlements_source_unique` ON `member_entitlements` (`source`,`source_reference`,`access_key`);--> statement-breakpoint
CREATE INDEX `member_entitlements_member_idx` ON `member_entitlements` (`member_email`);--> statement-breakpoint
CREATE INDEX `member_entitlements_status_idx` ON `member_entitlements` (`status`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`auth_user_id` text,
	`stripe_customer_id` text,
	`access_status` text DEFAULT 'pending' NOT NULL,
	`last_seen_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_stripe_customer_unique` ON `members` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `members_access_status_idx` ON `members` (`access_status`);--> statement-breakpoint
CREATE TABLE `offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'brl' NOT NULL,
	`billing_type` text DEFAULT 'subscription' NOT NULL,
	`billing_interval` text,
	`interval_count` integer DEFAULT 1 NOT NULL,
	`trial_days` integer DEFAULT 0 NOT NULL,
	`stripe_price_id` text,
	`access_key` text DEFAULT 'all_courses' NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offers_slug_unique` ON `offers` (`slug`);--> statement-breakpoint
CREATE INDEX `offers_active_idx` ON `offers` (`active`);--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`type` text NOT NULL,
	`livemode` integer DEFAULT false NOT NULL,
	`processed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_events_event_unique` ON `stripe_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `stripe_events_type_idx` ON `stripe_events` (`type`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_email` text NOT NULL,
	`provider` text DEFAULT 'stripe' NOT NULL,
	`provider_customer_id` text,
	`provider_subscription_id` text NOT NULL,
	`offer_id` integer,
	`plan_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_period_end` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_subscriptions`("id", "member_email", "provider", "provider_customer_id", "provider_subscription_id", "offer_id", "plan_name", "status", "current_period_end", "created_at", "updated_at") SELECT "id", "member_email", "provider", NULL, "provider_subscription_id", NULL, "plan_name", "status", "current_period_end", "created_at", "updated_at" FROM `subscriptions`;--> statement-breakpoint
DROP TABLE `subscriptions`;--> statement-breakpoint
ALTER TABLE `__new_subscriptions` RENAME TO `subscriptions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_provider_unique` ON `subscriptions` (`provider`,`provider_subscription_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_member_idx` ON `subscriptions` (`member_email`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);
