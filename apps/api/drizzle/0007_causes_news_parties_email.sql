CREATE TYPE "public"."email_token_purpose" AS ENUM('VERIFY_EMAIL', 'RESET_PASSWORD');--> statement-breakpoint
CREATE TYPE "public"."manifesto_status" AS ENUM('FULFILLED', 'PARTIAL', 'IN_PROGRESS', 'BROKEN', 'NOT_RATED', 'NOT_IN_POWER');--> statement-breakpoint
CREATE TYPE "public"."news_status" AS ENUM('DRAFT', 'PUBLISHED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "cause_votes" (
	"user_id" integer NOT NULL,
	"cause_id" integer NOT NULL,
	"value" smallint NOT NULL,
	"counted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cause_votes_user_id_cause_id_pk" PRIMARY KEY("user_id","cause_id"),
	CONSTRAINT "cause_votes_value_ck" CHECK ("cause_votes"."value" IN (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "email_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"purpose" "email_token_purpose" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "manifesto_promises" (
	"id" serial PRIMARY KEY NOT NULL,
	"manifesto_id" integer NOT NULL,
	"category" "promise_category" NOT NULL,
	"text" text NOT NULL,
	"page" smallint,
	"status" "manifesto_status" DEFAULT 'NOT_RATED' NOT NULL,
	"status_note" text,
	"evidence_url" text,
	CONSTRAINT "manifesto_promises_evidence_ck" CHECK ("manifesto_promises"."status" IN ('NOT_RATED', 'NOT_IN_POWER') OR "manifesto_promises"."evidence_url" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "manifestos" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"election_year" smallint NOT NULL,
	"title" text NOT NULL,
	"source_url" text NOT NULL,
	"formed_government" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_feeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"homepage" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "news_feeds_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"feed_id" integer,
	"guid" text,
	"headline" text NOT NULL,
	"url" text NOT NULL,
	"source_name" text NOT NULL,
	"source_published_at" timestamp with time zone,
	"summary" text,
	"category" "promise_category",
	"state_id" integer,
	"district" text,
	"responsible" text,
	"status" "news_status" DEFAULT 'DRAFT' NOT NULL,
	"submitted_by" integer,
	"reviewed_by" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_items_guid_unique" UNIQUE("guid"),
	CONSTRAINT "news_items_url_unique" UNIQUE("url"),
	CONSTRAINT "news_items_published_ck" CHECK ("news_items"."status" <> 'PUBLISHED' OR ("news_items"."summary" IS NOT NULL AND "news_items"."state_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "party_leaders" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"years" text NOT NULL,
	"quote" text,
	"quote_source_url" text,
	"photo_key" text,
	"photo_license" text,
	"photo_author" text,
	"photo_source_url" text,
	"sort_order" smallint DEFAULT 100 NOT NULL,
	CONSTRAINT "party_leaders_quote_ck" CHECK ("party_leaders"."quote" IS NULL OR "party_leaders"."quote_source_url" IS NOT NULL),
	CONSTRAINT "party_leaders_photo_ck" CHECK ("party_leaders"."photo_key" IS NULL OR ("party_leaders"."photo_license" IS NOT NULL AND "party_leaders"."photo_source_url" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "party_profiles" (
	"party_id" integer PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"founded" date NOT NULL,
	"founders" text NOT NULL,
	"ideology_quote" text NOT NULL,
	"ideology_source_url" text NOT NULL,
	"symbol" text NOT NULL,
	"color" text NOT NULL,
	"sort_order" smallint DEFAULT 100 NOT NULL,
	CONSTRAINT "party_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer,
	"date" date NOT NULL,
	"precision" text DEFAULT 'DAY' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_causes" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"category" "promise_category" NOT NULL,
	"title" text,
	"blurb" text,
	"issue_count" integer DEFAULT 0 NOT NULL,
	"state_count" integer DEFAULT 0 NOT NULL,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_votes" ADD COLUMN "value" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_votes" ADD COLUMN "counted" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cause_votes" ADD CONSTRAINT "cause_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cause_votes" ADD CONSTRAINT "cause_votes_cause_id_weekly_causes_id_fk" FOREIGN KEY ("cause_id") REFERENCES "public"."weekly_causes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifesto_promises" ADD CONSTRAINT "manifesto_promises_manifesto_id_manifestos_id_fk" FOREIGN KEY ("manifesto_id") REFERENCES "public"."manifestos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifestos" ADD CONSTRAINT "manifestos_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_feed_id_news_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."news_feeds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_leaders" ADD CONSTRAINT "party_leaders_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_profiles" ADD CONSTRAINT "party_profiles_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cause_votes_cause_idx" ON "cause_votes" USING btree ("cause_id");--> statement-breakpoint
CREATE INDEX "email_tokens_user_idx" ON "email_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "manifesto_promises_text_uq" ON "manifesto_promises" USING btree ("manifesto_id","text");--> statement-breakpoint
CREATE UNIQUE INDEX "manifestos_party_year_uq" ON "manifestos" USING btree ("party_id","election_year");--> statement-breakpoint
CREATE INDEX "news_items_status_published_idx" ON "news_items" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "party_leaders_party_name_uq" ON "party_leaders" USING btree ("party_id","name");--> statement-breakpoint
CREATE INDEX "timeline_events_date_idx" ON "timeline_events" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "timeline_events_uq" ON "timeline_events" USING btree ("party_id","date","title");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_causes_week_category_uq" ON "weekly_causes" USING btree ("week_start","category");--> statement-breakpoint
ALTER TABLE "issue_votes" ADD CONSTRAINT "issue_votes_value_ck" CHECK ("issue_votes"."value" IN (-1, 1));--> statement-breakpoint
-- Accounts created before email verification existed are grandfathered in (nothing was deployed yet).
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;
