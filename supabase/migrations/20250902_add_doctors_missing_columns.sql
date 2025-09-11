-- Migration: Add missing columns to doctors and pending_doctors tables
-- Generated: 2025-09-02

BEGIN;

-- Add columns to doctors table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'practice_name'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN practice_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'speciality'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN speciality TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'qualification'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN qualification TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'license_number'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN license_number TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'years_experience'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN years_experience INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'consultation_fee'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN consultation_fee INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'address'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'city'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN city TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'province'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN province TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN postal_code TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN bio TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'is_available'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN is_available BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE public.doctors ADD COLUMN approved_by UUID;
    END IF;
END $$;

-- Add columns to pending_doctors table if it exists and columns are missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_doctors') THEN

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'practice_name'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN practice_name TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'speciality'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN speciality TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'qualification'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN qualification TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'license_number'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN license_number TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'years_experience'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN years_experience INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'consultation_fee'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN consultation_fee INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'address'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN address TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'city'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN city TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'province'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN province TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'postal_code'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN postal_code TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'bio'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN bio TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_doctors' AND column_name = 'status'
        ) THEN
            ALTER TABLE public.pending_doctors ADD COLUMN status TEXT DEFAULT 'pending';
        END IF;

    END IF;
END $$;

COMMIT;
