ALTER TABLE "exercises" ADD COLUMN "video_url" TEXT;

UPDATE "exercises"
SET
  "video_url" = "media_url",
  "media_url" = NULL,
  "media_type" = NULL
WHERE "media_type" = 'video_url'
  AND "media_url" IS NOT NULL
  AND "video_url" IS NULL;
