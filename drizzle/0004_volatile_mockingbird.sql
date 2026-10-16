CREATE TABLE `check_in_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attendee_id` integer NOT NULL,
	`previous_status` text DEFAULT 'expected' NOT NULL,
	`new_status` text NOT NULL,
	`changed_by` text NOT NULL,
	`changed_by_email` text DEFAULT '' NOT NULL,
	`changed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`attendee_id`) REFERENCES `event_attendees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `check_in_history_attendee_idx` ON `check_in_history` (`attendee_id`,`changed_at`);--> statement-breakpoint
CREATE TABLE `event_attendees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`member_id` integer,
	`guest_id` integer,
	`attendee_type` text DEFAULT 'member' NOT NULL,
	`display_name` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`avatar_url` text DEFAULT '' NOT NULL,
	`host_member_id` integer,
	`host_name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'expected' NOT NULL,
	`checked_in_at` text,
	`checked_in_by` text,
	`checked_in_by_email` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`guest_id`) REFERENCES `event_guests`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`host_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_attendees_member_unique` ON `event_attendees` (`event_id`,`member_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_attendees_guest_unique` ON `event_attendees` (`event_id`,`guest_id`);--> statement-breakpoint
CREATE INDEX `event_attendees_event_status_idx` ON `event_attendees` (`event_id`,`status`);--> statement-breakpoint
CREATE INDEX `event_attendees_event_type_idx` ON `event_attendees` (`event_id`,`attendee_type`);--> statement-breakpoint
CREATE INDEX `event_attendees_name_idx` ON `event_attendees` (`display_name`);--> statement-breakpoint
CREATE INDEX `event_attendees_host_idx` ON `event_attendees` (`host_member_id`);--> statement-breakpoint
CREATE TABLE `event_guests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`host_member_id` integer,
	`host_name` text DEFAULT '' NOT NULL,
	`first_event_id` integer,
	`converted_member_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`host_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`first_event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`converted_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `event_guests_host_idx` ON `event_guests` (`host_member_id`);--> statement-breakpoint
CREATE INDEX `event_guests_converted_member_idx` ON `event_guests` (`converted_member_id`);--> statement-breakpoint
CREATE INDEX `event_guests_name_idx` ON `event_guests` (`full_name`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`location_name` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_starts_at_idx` ON `events` (`starts_at`);--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`status`);