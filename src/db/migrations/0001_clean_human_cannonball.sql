CREATE TABLE "contra_keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contra_keywords_keyword_unique" UNIQUE("keyword")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"data" jsonb DEFAULT '[]' NOT NULL,
	"images" jsonb DEFAULT '[]' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "keyword_mappings" ADD COLUMN "created_by" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "keyword_mappings" ADD COLUMN "updated_by" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "keyword_mappings" DROP COLUMN "ai_category";--> statement-breakpoint
ALTER TABLE "keyword_mappings" DROP COLUMN "ai_parent_category";