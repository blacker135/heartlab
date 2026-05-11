CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lemon_squeezy_subscription_id" text NOT NULL,
	"lemon_squeezy_variant_id" text NOT NULL,
	"variant_name" text NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_lemon_squeezy_subscription_id_unique" UNIQUE("lemon_squeezy_subscription_id")
);
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'trial_used'
 ) THEN
   ALTER TABLE "profiles" ALTER COLUMN "trial_used" DROP DEFAULT;
   ALTER TABLE "profiles" ALTER COLUMN "trial_used" TYPE integer USING trial_used::integer;
   ALTER TABLE "profiles" ALTER COLUMN "trial_used" SET DEFAULT 0;
 ELSE
   ALTER TABLE "profiles" ADD COLUMN "trial_used" integer DEFAULT 0;
 END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;