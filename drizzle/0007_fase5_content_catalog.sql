CREATE TABLE `content_catalog` (
	`locale` text PRIMARY KEY NOT NULL,
	`format_version` integer NOT NULL,
	`content_version` integer NOT NULL,
	`fetched_at` integer NOT NULL,
	`json` text NOT NULL,
	CONSTRAINT "content_catalog_versions_valid" CHECK(`format_version` >= 1 and `content_version` >= 1)
);
