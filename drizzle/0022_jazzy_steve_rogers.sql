CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`settings_json` text DEFAULT '{"version":1,"testEnabled":true}' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `site_settings` (`id`, `settings_json`) VALUES ('global', '{"version":1,"testEnabled":true}');
--> statement-breakpoint
ALTER TABLE `user` ADD `settings_json` text DEFAULT '{"version":1,"testEnabled":true}' NOT NULL;
