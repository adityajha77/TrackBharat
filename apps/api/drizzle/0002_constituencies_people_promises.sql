CREATE TYPE "public"."evidence_stance" AS ENUM('SHOWS_PROGRESS', 'SHOWS_NO_PROGRESS', 'CONTEXT');--> statement-breakpoint
CREATE TYPE "public"."house" AS ENUM('LOK_SABHA', 'VIDHAN_SABHA');--> statement-breakpoint
CREATE TYPE "public"."promise_category" AS ENUM('ROADS_INFRASTRUCTURE', 'HEALTH', 'EDUCATION', 'EMPLOYMENT', 'WATER', 'ELECTRICITY', 'AGRICULTURE', 'HOUSING', 'SAFETY', 'ENVIRONMENT', 'LOCAL_DEVELOPMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."promise_status" AS ENUM('PENDING', 'IN_PROGRESS', 'PARTIAL', 'FULFILLED', 'STALLED', 'BROKEN');--> statement-breakpoint
CREATE TYPE "public"."reservation" AS ENUM('GEN', 'SC', 'ST');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('OFFICIAL', 'MANIFESTO', 'NEWS', 'DATASET', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."term_status" AS ENUM('SITTING', 'COMPLETED', 'RESIGNED', 'DIED', 'DISQUALIFIED');--> statement-breakpoint
CREATE TABLE "constituencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"house" "house" NOT NULL,
	"state_id" integer NOT NULL,
	"number" smallint NOT NULL,
	"name" text NOT NULL,
	"name_hi" text,
	"slug" text NOT NULL,
	"reservation" "reservation" DEFAULT 'GEN' NOT NULL,
	"boundary" geometry(MultiPolygon, 4326),
	"boundary_source_id" integer,
	"boundary_outdated" boolean DEFAULT false NOT NULL,
	"wikidata_qid" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "constituencies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"promise_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"summary" text NOT NULL,
	"stance" "evidence_stance" NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	CONSTRAINT "parties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pin_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"pincode" varchar(6) NOT NULL,
	"office_name" text NOT NULL,
	"location" geometry(Point, 4326) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pincode_constituencies" (
	"pincode" varchar(6) NOT NULL,
	"constituency_id" integer NOT NULL,
	"office_count" integer NOT NULL,
	"share" real NOT NULL,
	CONSTRAINT "pincode_constituencies_pincode_constituency_id_pk" PRIMARY KEY("pincode","constituency_id")
);
--> statement-breakpoint
CREATE TABLE "promise_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"promise_id" integer NOT NULL,
	"status" "promise_status" NOT NULL,
	"note" text,
	"source_id" integer NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promises" (
	"id" serial PRIMARY KEY NOT NULL,
	"term_id" integer,
	"party_id" integer,
	"constituency_id" integer,
	"title" text NOT NULL,
	"description" text,
	"category" "promise_category" NOT NULL,
	"status" "promise_status" DEFAULT 'PENDING' NOT NULL,
	"made_on" date,
	"deadline" date,
	"source_id" integer NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promises_has_maker" CHECK ("promises"."term_id" IS NOT NULL OR "promises"."party_id" IS NOT NULL),
	CONSTRAINT "promises_deadline_after_made" CHECK ("promises"."deadline" IS NULL OR "promises"."made_on" IS NULL OR "promises"."deadline" >= "promises"."made_on")
);
--> statement-breakpoint
CREATE TABLE "representatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"gender" text,
	"education" text,
	"profession" text,
	"image_url" text,
	"sansad_member_id" integer,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "representatives_sansad_member_id_unique" UNIQUE("sansad_member_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"publisher" text NOT NULL,
	"kind" "source_kind" NOT NULL,
	"license" text,
	"published_on" date,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "states_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"representative_id" integer NOT NULL,
	"constituency_id" integer NOT NULL,
	"party_id" integer,
	"legislature" smallint NOT NULL,
	"status" "term_status" NOT NULL,
	"terms_served" smallint,
	"started_on" date,
	"ended_on" date,
	"source_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "constituencies" ADD CONSTRAINT "constituencies_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constituencies" ADD CONSTRAINT "constituencies_boundary_source_id_sources_id_fk" FOREIGN KEY ("boundary_source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_promise_id_promises_id_fk" FOREIGN KEY ("promise_id") REFERENCES "public"."promises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pincode_constituencies" ADD CONSTRAINT "pincode_constituencies_constituency_id_constituencies_id_fk" FOREIGN KEY ("constituency_id") REFERENCES "public"."constituencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promise_status_history" ADD CONSTRAINT "promise_status_history_promise_id_promises_id_fk" FOREIGN KEY ("promise_id") REFERENCES "public"."promises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promise_status_history" ADD CONSTRAINT "promise_status_history_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promises" ADD CONSTRAINT "promises_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promises" ADD CONSTRAINT "promises_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promises" ADD CONSTRAINT "promises_constituency_id_constituencies_id_fk" FOREIGN KEY ("constituency_id") REFERENCES "public"."constituencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promises" ADD CONSTRAINT "promises_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_representative_id_representatives_id_fk" FOREIGN KEY ("representative_id") REFERENCES "public"."representatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_constituency_id_constituencies_id_fk" FOREIGN KEY ("constituency_id") REFERENCES "public"."constituencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "constituencies_house_state_number_uq" ON "constituencies" USING btree ("house","state_id","number");--> statement-breakpoint
CREATE INDEX "constituencies_boundary_gist" ON "constituencies" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "evidence_promise_idx" ON "evidence" USING btree ("promise_id");--> statement-breakpoint
CREATE INDEX "pin_locations_pincode_idx" ON "pin_locations" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "pin_locations_location_gist" ON "pin_locations" USING gist ("location");--> statement-breakpoint
CREATE INDEX "promise_status_history_promise_idx" ON "promise_status_history" USING btree ("promise_id");--> statement-breakpoint
CREATE INDEX "promises_constituency_idx" ON "promises" USING btree ("constituency_id");--> statement-breakpoint
CREATE INDEX "promises_term_idx" ON "promises" USING btree ("term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_person_seat_legislature_uq" ON "terms" USING btree ("representative_id","constituency_id","legislature");--> statement-breakpoint
CREATE INDEX "terms_constituency_idx" ON "terms" USING btree ("constituency_id");