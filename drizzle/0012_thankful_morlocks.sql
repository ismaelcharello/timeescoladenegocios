CREATE TABLE `member_access_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`grant_type` text DEFAULT 'complimentary' NOT NULL,
	`reason` text NOT NULL,
	`granted_by_user_id` text NOT NULL,
	`starts_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text,
	`revoked_at` text,
	`revoked_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `member_access_grants_member_idx` ON `member_access_grants` (`member_id`,`grant_type`,`revoked_at`);--> statement-breakpoint
CREATE TABLE `member_agreements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_email` text NOT NULL,
	`member_auth_user_id` text NOT NULL,
	`document_type` text NOT NULL,
	`document_version` text NOT NULL,
	`document_reference` text NOT NULL,
	`accepted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_agreements_version_unique` ON `member_agreements` (`member_auth_user_id`,`document_type`,`document_version`);--> statement-breakpoint
CREATE INDEX `member_agreements_member_idx` ON `member_agreements` (`member_email`,`accepted_at`);--> statement-breakpoint
ALTER TABLE `checkout_orders` ADD `member_auth_user_id` text;--> statement-breakpoint
CREATE INDEX `checkout_orders_member_auth_idx` ON `checkout_orders` (`member_auth_user_id`);--> statement-breakpoint
ALTER TABLE `stripe_events` ADD `status` text DEFAULT 'processed' NOT NULL;--> statement-breakpoint
ALTER TABLE `stripe_events` ADD `last_error` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `stripe_events` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;
