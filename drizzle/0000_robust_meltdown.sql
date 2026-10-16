CREATE TABLE `community_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_email` text NOT NULL,
	`author_name` text NOT NULL,
	`content` text NOT NULL,
	`official` integer DEFAULT false NOT NULL,
	`likes_count` integer DEFAULT 0 NOT NULL,
	`comments_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `community_posts_status_idx` ON `community_posts` (`status`);--> statement-breakpoint
CREATE INDEX `community_posts_created_idx` ON `community_posts` (`created_at`);--> statement-breakpoint
CREATE TABLE `course_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`member_email` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_member_review_unique` ON `course_reviews` (`course_id`,`member_email`);--> statement-breakpoint
CREATE INDEX `course_reviews_course_idx` ON `course_reviews` (`course_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`teacher` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'negocios' NOT NULL,
	`thumbnail_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_unique` ON `courses` (`slug`);--> statement-breakpoint
CREATE INDEX `courses_status_idx` ON `courses` (`status`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`module_title` text DEFAULT 'Fundamentos' NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`video_key` text DEFAULT '' NOT NULL,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`is_preview` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lessons_course_idx` ON `lessons` (`course_id`);--> statement-breakpoint
CREATE INDEX `lessons_position_idx` ON `lessons` (`course_id`,`position`);--> statement-breakpoint
CREATE TABLE `member_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_email` text NOT NULL,
	`lesson_id` integer NOT NULL,
	`watch_seconds` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_lesson_progress_unique` ON `member_progress` (`member_email`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `member_progress_email_idx` ON `member_progress` (`member_email`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_email` text NOT NULL,
	`provider` text DEFAULT 'cakto' NOT NULL,
	`provider_subscription_id` text NOT NULL,
	`plan_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_period_end` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_provider_unique` ON `subscriptions` (`provider`,`provider_subscription_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_member_idx` ON `subscriptions` (`member_email`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);