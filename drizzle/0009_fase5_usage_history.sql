CREATE TABLE `app_usage_hourly` (
	`day_key` text NOT NULL,
	`hour` integer NOT NULL,
	`compulsion_id` integer NOT NULL,
	`app_package` text NOT NULL,
	`seconds` integer NOT NULL,
	PRIMARY KEY(`day_key`, `hour`, `compulsion_id`, `app_package`),
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "app_usage_hourly_day_key_valid" CHECK(`day_key` glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "app_usage_hourly_hour_valid" CHECK(`hour` between 0 and 23),
	CONSTRAINT "app_usage_hourly_seconds_valid" CHECK(`seconds` between 0 and 3600)
);
--> statement-breakpoint
CREATE TABLE `usage_history_days` (
	`day_key` text PRIMARY KEY NOT NULL,
	`imported_at` integer NOT NULL,
	CONSTRAINT "usage_history_days_day_key_valid" CHECK(`day_key` glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]')
);
--> statement-breakpoint
ALTER TABLE `settings` ADD `usage_history_since` text;--> statement-breakpoint
ALTER TABLE `user_compulsions` ADD `baseline_minutes_per_day` integer;--> statement-breakpoint
ALTER TABLE `user_compulsions` ADD `baseline_source` text;