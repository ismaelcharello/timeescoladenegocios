CREATE TABLE `course_modules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `course_modules_course_idx` ON `course_modules` (`course_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `course_modules_course_title_unique` ON `course_modules` (`course_id`,`title`);--> statement-breakpoint
ALTER TABLE `community_posts` ADD `attachments_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `lessons` ADD `module_id` integer REFERENCES course_modules(id);--> statement-breakpoint
CREATE INDEX `lessons_module_idx` ON `lessons` (`module_id`);