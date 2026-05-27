ALTER TABLE "users"
  ADD COLUMN "accepted_terms_at" TIMESTAMP(3),
  ADD COLUMN "accepted_terms_version" TEXT,
  ADD COLUMN "accepted_privacy_at" TIMESTAMP(3),
  ADD COLUMN "accepted_privacy_version" TEXT;
