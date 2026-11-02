CREATE TABLE `monitored_apps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`compulsion_id` integer NOT NULL,
	`package_name` text NOT NULL,
	`role` text NOT NULL,
	`declared_consumption` integer,
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "monitored_apps_role_valid" CHECK("monitored_apps"."role" in ('short_video', 'risk'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monitored_apps_compulsion_package_unique` ON `monitored_apps` (`compulsion_id`,`package_name`);--> statement-breakpoint
CREATE TABLE `motivation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`age_confirmed_at` integer,
	`proactive_notification_daily_limit` integer DEFAULT 6 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "settings_single_row" CHECK("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `triggers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`compulsion_id` integer,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "triggers_kind_valid" CHECK("triggers"."kind" in ('time', 'weekday', 'emotion'))
);
--> statement-breakpoint
CREATE TABLE `user_compulsions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` integer NOT NULL,
	`daily_limit_minutes` integer,
	CONSTRAINT "user_compulsions_type_valid" CHECK("user_compulsions"."type" in ('pornography', 'short_videos')),
	CONSTRAINT "user_compulsions_status_valid" CHECK("user_compulsions"."status" in ('active', 'paused'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_compulsions_type_unique` ON `user_compulsions` (`type`);