CREATE TABLE `milestone_reaches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`compulsion_id` integer NOT NULL,
	`milestone_day` integer NOT NULL,
	`streak_base_day` text NOT NULL,
	`reached_on` text NOT NULL,
	`celebrated_at` integer,
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "milestone_reaches_day_valid" CHECK(`milestone_day` between 1 and 3650),
	CONSTRAINT "milestone_reaches_base_valid" CHECK(`streak_base_day` glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "milestone_reaches_reached_on_valid" CHECK(`reached_on` glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_reaches_sequence_unique` ON `milestone_reaches` (`compulsion_id`,`milestone_day`,`streak_base_day`);--> statement-breakpoint
ALTER TABLE `settings` ADD `milestones_checked_on` text;