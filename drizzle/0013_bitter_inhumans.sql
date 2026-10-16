PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_offers` (
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
	`access_key` text DEFAULT 'membership' NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_offers`("id", "slug", "name", "description", "amount_cents", "currency", "billing_type", "billing_interval", "interval_count", "trial_days", "stripe_price_id", "access_key", "active", "created_at", "updated_at") SELECT "id", "slug", "name", "description", "amount_cents", "currency", "billing_type", "billing_interval", "interval_count", "trial_days", "stripe_price_id", "access_key", "active", "created_at", "updated_at" FROM `offers`;--> statement-breakpoint
DROP TABLE `offers`;--> statement-breakpoint
ALTER TABLE `__new_offers` RENAME TO `offers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `offers_slug_unique` ON `offers` (`slug`);--> statement-breakpoint
CREATE INDEX `offers_active_idx` ON `offers` (`active`);