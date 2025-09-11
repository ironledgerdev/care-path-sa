-- Migration: Add address column to doctors table
-- Generated: 2025-09-01

BEGIN;

-- Add address column to doctors if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'address'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN address TEXT;
    END IF;
END $$;

COMMIT;
