DO $$
BEGIN
  CREATE TYPE "ProgressPhotoType" AS ENUM ('front', 'side', 'back', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "progress_photos" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "uploaded_by_type" "ProgressRecordActor" NOT NULL,
  "uploaded_by_member_id" TEXT,
  "storage_path" TEXT NOT NULL,
  "photo_type" "ProgressPhotoType" NOT NULL DEFAULT 'other',
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "progress_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "progress_photos_client_id_recorded_at_idx" ON "progress_photos"("client_id", "recorded_at");
CREATE INDEX "progress_photos_client_id_deleted_at_recorded_at_idx" ON "progress_photos"("client_id", "deleted_at", "recorded_at");
CREATE INDEX "progress_photos_uploaded_by_member_id_idx" ON "progress_photos"("uploaded_by_member_id");

ALTER TABLE "progress_photos"
  ADD CONSTRAINT "progress_photos_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "progress_photos"
  ADD CONSTRAINT "progress_photos_uploaded_by_member_id_fkey"
  FOREIGN KEY ("uploaded_by_member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
