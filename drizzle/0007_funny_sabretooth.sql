CREATE TABLE `community_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`author_email` text NOT NULL,
	`author_name` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `community_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `community_comments_post_idx` ON `community_comments` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_comments_status_idx` ON `community_comments` (`status`);--> statement-breakpoint
CREATE TABLE `community_post_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`member_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `community_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_post_likes_unique` ON `community_post_likes` (`post_id`,`member_email`);--> statement-breakpoint
CREATE INDEX `community_post_likes_post_idx` ON `community_post_likes` (`post_id`);--> statement-breakpoint
CREATE TABLE `community_post_saves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`member_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `community_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_post_saves_unique` ON `community_post_saves` (`post_id`,`member_email`);--> statement-breakpoint
CREATE INDEX `community_post_saves_member_idx` ON `community_post_saves` (`member_email`);--> statement-breakpoint
CREATE TABLE `lesson_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_email` text NOT NULL,
	`lesson_id` integer NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_notes_member_lesson_unique` ON `lesson_notes` (`member_email`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `lesson_notes_member_idx` ON `lesson_notes` (`member_email`);--> statement-breakpoint
ALTER TABLE `community_posts` ADD `category` text DEFAULT 'general' NOT NULL;
