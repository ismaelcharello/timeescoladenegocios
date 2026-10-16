CREATE TABLE `lesson_materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lesson_id` integer NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`storage_key` text,
	`external_url` text,
	`mime_type` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lesson_materials_lesson_idx` ON `lesson_materials` (`lesson_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_materials_storage_key_unique` ON `lesson_materials` (`storage_key`);--> statement-breakpoint
CREATE TABLE `lesson_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lesson_id` integer NOT NULL,
	`member_email` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_reviews_member_lesson_unique` ON `lesson_reviews` (`member_email`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `lesson_reviews_lesson_idx` ON `lesson_reviews` (`lesson_id`,`status`,`updated_at`);--> statement-breakpoint
ALTER TABLE `courses` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `lessons` ADD `status` text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_progress` ADD `started_at` text;