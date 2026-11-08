CREATE TABLE `emergency_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`source` text NOT NULL,
	`outcome` text,
	CONSTRAINT "emergency_sessions_source_valid" CHECK(`source` in ('home', 'interruption', 'notification')),
	CONSTRAINT "emergency_sessions_outcome_valid" CHECK(`outcome` is null or `outcome` in ('passed', 'not_passed', 'abandoned')),
	CONSTRAINT "emergency_sessions_ended_together" CHECK((`outcome` is null) = (`ended_at` is null))
);
--> statement-breakpoint
CREATE TABLE `imported_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`imported_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interruption_events` (
	`id` text PRIMARY KEY NOT NULL,
	`compulsion_id` integer NOT NULL,
	`day_key` text NOT NULL,
	`shown_at` integer NOT NULL,
	`response` text,
	`responded_at` integer,
	`app_package` text NOT NULL,
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "interruption_events_day_key_valid" CHECK(`day_key` glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "interruption_events_response_valid" CHECK(`response` is null or `response` in ('emergency', 'home', 'continue', 'ignore_today')),
	CONSTRAINT "interruption_events_responded_together" CHECK((`response` is null) = (`responded_at` is null))
);
