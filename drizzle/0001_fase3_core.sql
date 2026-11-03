CREATE TABLE `check_ins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`compulsion_id` integer NOT NULL,
	`day_key` text NOT NULL,
	`answer` text NOT NULL,
	`source` text DEFAULT 'app' NOT NULL,
	`answered_at` integer NOT NULL,
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "check_ins_day_key_valid" CHECK(`day_key` glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "check_ins_answer_valid" CHECK(`answer` in ('no_relapse', 'relapse')),
	CONSTRAINT "check_ins_source_valid" CHECK(`source` in ('app', 'notification'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_ins_compulsion_day_unique` ON `check_ins` (`compulsion_id`,`day_key`);--> statement-breakpoint
CREATE TABLE `day_states` (
	`compulsion_id` integer NOT NULL,
	`day_key` text NOT NULL,
	`interruptions` integer DEFAULT 0 NOT NULL,
	`continues` integer DEFAULT 0 NOT NULL,
	`failed` integer DEFAULT false NOT NULL,
	`failed_reason` text,
	PRIMARY KEY(`compulsion_id`, `day_key`),
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "day_states_day_key_valid" CHECK(`day_key` glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "day_states_counts_valid" CHECK(`interruptions` >= 0 and `continues` >= 0),
	CONSTRAINT "day_states_failed_reason_valid" CHECK((`failed` = 0 and `failed_reason` is null) or (`failed` = 1 and `failed_reason` is not null and `failed_reason` in ('ignored_limit', 'third_continue')))
);
--> statement-breakpoint
CREATE TABLE `relapses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`compulsion_id` integer NOT NULL,
	`day_key` text NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "relapses_day_key_valid" CHECK(`day_key` glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relapses_compulsion_day_unique` ON `relapses` (`compulsion_id`,`day_key`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`age_confirmed_at` integer,
	`proactive_notification_daily_limit` integer DEFAULT 6 NOT NULL,
	`created_at` integer NOT NULL,
	`onboarding_step` text,
	`check_in_minutes` integer DEFAULT 1260 NOT NULL,
	CONSTRAINT "settings_single_row" CHECK(`id` = 1),
	CONSTRAINT "settings_onboarding_step_valid" CHECK(`onboarding_step` is null or `onboarding_step` in ('welcome', 'compulsions', 'setup', 'triggers', 'motivation', 'permissions', 'summary')),
	CONSTRAINT "settings_check_in_minutes_valid" CHECK(`check_in_minutes` between 0 and 1439)
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "onboarding_completed", "age_confirmed_at", "proactive_notification_daily_limit", "created_at") SELECT "id", "onboarding_completed", "age_confirmed_at", "proactive_notification_daily_limit", "created_at" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_triggers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`compulsion_id` integer,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "triggers_kind_valid" CHECK(`kind` in ('time', 'weekday', 'emotion')),
	CONSTRAINT "triggers_value_valid" CHECK(case `kind` when 'time' then (`value` glob '[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]' and substr(`value`, 1, 2) <= '23' and substr(`value`, 7, 2) <= '23' and substr(`value`, 1, 5) <> substr(`value`, 7, 5)) when 'weekday' then `value` in ('0', '1', '2', '3', '4', '5', '6') when 'emotion' then `value` in ('boredom', 'loneliness', 'stress', 'anxiety', 'tiredness', 'sadness') else 0 end)
);
--> statement-breakpoint
INSERT INTO `__new_triggers`("id", "compulsion_id", "kind", "value") SELECT "id", "compulsion_id", "kind", "value" FROM `triggers`;--> statement-breakpoint
DROP TABLE `triggers`;--> statement-breakpoint
ALTER TABLE `__new_triggers` RENAME TO `triggers`;