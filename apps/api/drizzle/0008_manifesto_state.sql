DROP INDEX "manifestos_party_year_uq";--> statement-breakpoint
ALTER TABLE "manifestos" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "manifestos" ADD CONSTRAINT "manifestos_party_year_state_uq" UNIQUE NULLS NOT DISTINCT("party_id","election_year","state");