CREATE TABLE `daily_checkin` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`checkin_date` text NOT NULL,
	`hours` integer NOT NULL,
	`backlinks` integer NOT NULL,
	`quality` integer NOT NULL,
	`log` text NOT NULL,
	`image_key` text NOT NULL,
	`image_bytes` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_checkin_user_date_uidx` ON `daily_checkin` (`user_id`,`checkin_date`);--> statement-breakpoint
CREATE INDEX `daily_checkin_user_date_idx` ON `daily_checkin` (`user_id`,`checkin_date`);