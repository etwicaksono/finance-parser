PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_keyword_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`keyword` text NOT NULL,
	`category_id` text,
	`ai_category` text,
	`ai_parent_category` text,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_keyword_mappings`("id", "keyword", "category_id", "ai_category", "ai_parent_category", "usage_count", "created_at", "updated_at") SELECT "id", "keyword", "category_id", "ai_category", "ai_parent_category", "usage_count", "created_at", "updated_at" FROM `keyword_mappings`;--> statement-breakpoint
DROP TABLE `keyword_mappings`;--> statement-breakpoint
ALTER TABLE `__new_keyword_mappings` RENAME TO `keyword_mappings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `keyword_mappings_keyword_unique` ON `keyword_mappings` (`keyword`);