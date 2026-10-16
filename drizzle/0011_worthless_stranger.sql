CREATE TABLE `community_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`comment_id` integer,
	`reporter_email` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `community_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `community_comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_reports_unique` ON `community_reports` (`post_id`,`comment_id`,`reporter_email`);--> statement-breakpoint
CREATE INDEX `community_reports_status_idx` ON `community_reports` (`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `community_comments` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `community_posts` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_posts` ADD `company` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_posts` ADD `benefit` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_posts` ADD `discount` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_posts` ADD `conditions` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_posts` ADD `valid_until` text;--> statement-breakpoint
ALTER TABLE `community_posts` ADD `contact` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_posts` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `banner_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `capacity` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `registration_deadline` text;--> statement-breakpoint
ALTER TABLE `events` ADD `allow_guests` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `max_guests_per_member` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER `event_capacity_before_insert`
BEFORE INSERT ON `event_attendees`
WHEN NEW.`status` != 'cancelled'
  AND (SELECT `capacity` FROM `events` WHERE `id` = NEW.`event_id`) IS NOT NULL
  AND (SELECT count(*) FROM `event_attendees` WHERE `event_id` = NEW.`event_id` AND `status` != 'cancelled')
      >= (SELECT `capacity` FROM `events` WHERE `id` = NEW.`event_id`)
BEGIN
  SELECT RAISE(ABORT, 'EVENT_CAPACITY_REACHED');
END;
--> statement-breakpoint
CREATE TRIGGER `event_capacity_before_update`
BEFORE UPDATE OF `status`, `event_id` ON `event_attendees`
WHEN NEW.`status` != 'cancelled'
  AND OLD.`status` = 'cancelled'
  AND (SELECT `capacity` FROM `events` WHERE `id` = NEW.`event_id`) IS NOT NULL
  AND (SELECT count(*) FROM `event_attendees` WHERE `event_id` = NEW.`event_id` AND `status` != 'cancelled' AND `id` != OLD.`id`)
      >= (SELECT `capacity` FROM `events` WHERE `id` = NEW.`event_id`)
BEGIN
  SELECT RAISE(ABORT, 'EVENT_CAPACITY_REACHED');
END;
--> statement-breakpoint
CREATE TRIGGER `event_guest_limit_before_insert`
BEFORE INSERT ON `event_attendees`
WHEN NEW.`attendee_type` = 'guest'
  AND NEW.`status` != 'cancelled'
  AND NEW.`host_member_id` IS NOT NULL
  AND (SELECT `allow_guests` FROM `events` WHERE `id` = NEW.`event_id`) != 1
BEGIN
  SELECT RAISE(ABORT, 'EVENT_GUEST_LIMIT_REACHED');
END;
--> statement-breakpoint
CREATE TRIGGER `event_guest_count_before_insert`
BEFORE INSERT ON `event_attendees`
WHEN NEW.`attendee_type` = 'guest'
  AND NEW.`status` != 'cancelled'
  AND NEW.`host_member_id` IS NOT NULL
  AND (SELECT count(*) FROM `event_attendees`
       WHERE `event_id` = NEW.`event_id`
         AND `host_member_id` = NEW.`host_member_id`
         AND `attendee_type` = 'guest'
         AND `status` != 'cancelled')
      >= (SELECT `max_guests_per_member` FROM `events` WHERE `id` = NEW.`event_id`)
BEGIN
  SELECT RAISE(ABORT, 'EVENT_GUEST_LIMIT_REACHED');
END;
--> statement-breakpoint
CREATE TRIGGER `event_guest_rules_before_update`
BEFORE UPDATE OF `attendee_type`, `status`, `host_member_id`, `event_id` ON `event_attendees`
WHEN NEW.`attendee_type` = 'guest'
  AND NEW.`status` != 'cancelled'
  AND NEW.`host_member_id` IS NOT NULL
  AND (
    (SELECT `allow_guests` FROM `events` WHERE `id` = NEW.`event_id`) != 1
    OR (
      (SELECT count(*) FROM `event_attendees`
       WHERE `event_id` = NEW.`event_id`
         AND `host_member_id` = NEW.`host_member_id`
         AND `attendee_type` = 'guest'
         AND `status` != 'cancelled'
         AND `id` != OLD.`id`)
      >= (SELECT `max_guests_per_member` FROM `events` WHERE `id` = NEW.`event_id`)
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'EVENT_GUEST_LIMIT_REACHED');
END;
