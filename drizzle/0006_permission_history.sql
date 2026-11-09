ALTER TABLE `settings` ADD `usage_access_granted_once` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `notifications_granted_once` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `overlay_granted_once` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `protection_notice_dismissed_at` integer;