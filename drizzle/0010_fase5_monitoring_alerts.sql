CREATE TABLE `monitoring_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`compulsion_id` integer NOT NULL,
	`day_key` text NOT NULL,
	`sent_at` integer NOT NULL,
	`kind` text NOT NULL,
	`app_package` text,
	FOREIGN KEY (`compulsion_id`) REFERENCES `user_compulsions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "monitoring_alerts_day_key_valid" CHECK(`day_key` glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "monitoring_alerts_kind_valid" CHECK(`kind` in ('limit', 'risk_app')),
	CONSTRAINT "monitoring_alerts_app_valid" CHECK((`kind` = 'limit' and `app_package` is null) or (`kind` = 'risk_app' and `app_package` is not null))
);
