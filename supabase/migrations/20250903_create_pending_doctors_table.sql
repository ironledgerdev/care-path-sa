-- Migration: Create pending_doctors table if missing
-- Generated: 2025-09-03

BEGIN;

-- Ensure pgcrypto (for gen_random_uuid) is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create pending_doctors table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pending_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  practice_name text,
  speciality text,
  qualification text,
  license_number text,
  years_experience integer DEFAULT 0,
  consultation_fee integer DEFAULT 0,
  address text,
  city text,
  province text,
  postal_code text,
  bio text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add FK to profiles if profiles table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = 'pending_doctors' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'user_id'
    ) THEN
      ALTER TABLE public.pending_doctors
      ADD CONSTRAINT pending_doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_doctors_user_id ON public.pending_doctors(user_id);

COMMIT;
