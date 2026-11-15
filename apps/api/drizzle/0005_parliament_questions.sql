CREATE TABLE "parliament_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"representative_id" integer NOT NULL,
	"legislature" smallint NOT NULL,
	"question_no" integer NOT NULL,
	"asked_on" date NOT NULL,
	"ministry" text NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parliament_questions" ADD CONSTRAINT "parliament_questions_representative_id_representatives_id_fk" FOREIGN KEY ("representative_id") REFERENCES "public"."representatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "parliament_questions_uq" ON "parliament_questions" USING btree ("representative_id","legislature","asked_on","question_no","type");--> statement-breakpoint
CREATE INDEX "parliament_questions_rep_idx" ON "parliament_questions" USING btree ("representative_id","legislature");