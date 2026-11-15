ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "promise_submissions" DROP CONSTRAINT "promise_submissions_reviewer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promise_submissions" ADD CONSTRAINT "promise_submissions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;