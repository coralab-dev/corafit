-- Add pinHash column to ClientAccess
ALTER TABLE "client_accesses" ADD COLUMN "pin_hash" TEXT;

-- Create client portal sessions table
CREATE TABLE "client_portal_sessions" (
    "id" TEXT NOT NULL,
    "access_id" TEXT NOT NULL,
    "session_token_hash" TEXT NOT NULL,
    "invalidated" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_portal_sessions_pkey" PRIMARY KEY ("id")
);

-- Unique session token hash
CREATE UNIQUE INDEX "client_portal_sessions_session_token_hash_key" ON "client_portal_sessions"("session_token_hash");

-- Add index for faster lookups
CREATE INDEX "client_portal_sessions_access_id_idx" ON "client_portal_sessions"("access_id");

-- Add unique constraint for access sessions (one active per access typically)
-- Note: invalidated is boolean, so multiple valid sessions can exist temporarily
CREATE INDEX "client_portal_sessions_invalidated_idx" ON "client_portal_sessions"("invalidated") WHERE "invalidated" = false;

-- Add foreign key
ALTER TABLE "client_portal_sessions" ADD CONSTRAINT "client_portal_sessions_access_id_fkey" FOREIGN KEY ("access_id") REFERENCES "client_accesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
