CREATE TABLE `tutor_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`tone` text DEFAULT 'execution_mentor' NOT NULL,
	`custom_instructions` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
