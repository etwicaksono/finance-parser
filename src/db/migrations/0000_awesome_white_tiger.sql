CREATE TABLE "categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_mappings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"category_id" varchar(36),
	"ai_category" text,
	"ai_parent_category" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "keyword_mappings_keyword_unique" UNIQUE("keyword")
);
--> statement-breakpoint
CREATE TABLE "aliases" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"alias" text NOT NULL,
	"canonical_text" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "aliases_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
CREATE TABLE "duplicate_hashes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"transaction_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "duplicate_hashes_transaction_hash_unique" UNIQUE("transaction_hash")
);
--> statement-breakpoint
ALTER TABLE "keyword_mappings" ADD CONSTRAINT "keyword_mappings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;