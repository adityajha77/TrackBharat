CREATE TABLE "pincodes" (
	"pincode" varchar(6) PRIMARY KEY NOT NULL,
	"district" text NOT NULL,
	"state" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"pincode" varchar(6) NOT NULL,
	"name" text NOT NULL,
	"branch_type" text NOT NULL,
	"delivery_status" text NOT NULL,
	"block" text,
	"district" text NOT NULL,
	"state" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_offices" ADD CONSTRAINT "post_offices_pincode_pincodes_pincode_fk" FOREIGN KEY ("pincode") REFERENCES "public"."pincodes"("pincode") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_offices_pincode_idx" ON "post_offices" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "post_offices_district_idx" ON "post_offices" USING btree ("district");