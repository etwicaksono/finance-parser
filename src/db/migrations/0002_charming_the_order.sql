CREATE TABLE "labels" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_mapping_labels" (
	"keyword_mapping_id" varchar(36) NOT NULL,
	"label_id" varchar(36) NOT NULL,
	CONSTRAINT "keyword_mapping_labels_keyword_mapping_id_label_id_pk" PRIMARY KEY("keyword_mapping_id","label_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "keyword_cleaning_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "keyword_mapping_labels" ADD CONSTRAINT "keyword_mapping_labels_keyword_mapping_id_keyword_mappings_id_fk" FOREIGN KEY ("keyword_mapping_id") REFERENCES "public"."keyword_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_mapping_labels" ADD CONSTRAINT "keyword_mapping_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "labels_name_lower_unique" ON "labels" USING btree (lower("name"));