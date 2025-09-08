-- Create admin_tokens table for link-based admin access

CREATE TABLE IF NOT EXISTS public.admin_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  revoked BOOLEAN DEFAULT FALSE
);

-- Optional: allow lookups by token quickly
CREATE INDEX IF NOT EXISTS idx_admin_tokens_token ON public.admin_tokens (token);

-- Audit helper: a simple trigger to set created_at if not provided
CREATE OR REPLACE FUNCTION public.set_now_created_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_created_at_admin_tokens ON public.admin_tokens;
CREATE TRIGGER trg_set_created_at_admin_tokens
BEFORE INSERT ON public.admin_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_now_created_at();
