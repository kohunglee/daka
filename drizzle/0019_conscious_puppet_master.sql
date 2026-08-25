PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_daily_checkin` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`checkin_date` text NOT NULL,
	`hours` text NOT NULL,
	`backlinks` text NOT NULL,
	`quality` integer NOT NULL,
	`log` text NOT NULL,
	`image_key` text NOT NULL,
	`image_bytes` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_daily_checkin`("id", "user_id", "checkin_date", "hours", "backlinks", "quality", "log", "image_key", "image_bytes", "created_at") SELECT "id", "user_id", "checkin_date", "hours", "backlinks", "quality", "log", "image_key", "image_bytes", "created_at" FROM `daily_checkin`;--> statement-breakpoint
DROP TABLE `daily_checkin`;--> statement-breakpoint
ALTER TABLE `__new_daily_checkin` RENAME TO `daily_checkin`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `daily_checkin_user_date_uidx` ON `daily_checkin` (`user_id`,`checkin_date`);