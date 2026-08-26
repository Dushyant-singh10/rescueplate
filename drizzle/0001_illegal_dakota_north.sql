ALTER TYPE "public"."claim_status" ADD VALUE 'offered' BEFORE 'confirmed';--> statement-breakpoint
ALTER TYPE "public"."claim_status" ADD VALUE 'declined' BEFORE 'picked_up';--> statement-breakpoint
ALTER TYPE "public"."claim_status" ADD VALUE 'expired' BEFORE 'no_show';--> statement-breakpoint
ALTER TABLE "claims" ALTER COLUMN "claimed_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "rank" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "score" double precision;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "score_breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "respond_by" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "capacity_kg" double precision;