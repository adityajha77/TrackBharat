ALTER TABLE "constituencies" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "constituencies" ADD CONSTRAINT "constituencies_parent_id_constituencies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."constituencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "constituencies_parent_idx" ON "constituencies" USING btree ("parent_id");