CREATE TABLE `user_checkin_setting` (
	`user_id` text PRIMARY KEY NOT NULL,
	`log_template` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
