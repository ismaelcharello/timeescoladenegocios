CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `podcast_episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`guest_name` text DEFAULT '' NOT NULL,
	`season_number` integer,
	`episode_number` integer,
	`published_at` text,
	`thumbnail_url` text DEFAULT '' NOT NULL,
	`external_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `podcast_episodes_slug_unique` ON `podcast_episodes` (`slug`);--> statement-breakpoint
CREATE INDEX `podcast_episodes_status_position_idx` ON `podcast_episodes` (`status`,`position`);--> statement-breakpoint
UPDATE `courses`
SET `title` = 'Em breve',
    `description` = '',
    `teacher` = '',
    `status` = 'draft',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `slug` = 'boaas-vindas-0b574a5e'
  AND `title` = 'Boaas Vindas'
  AND `description` = 'dsadasdsadasdsadsa';
