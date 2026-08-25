-- Keep the existing player status contract while enforcing valid values at the database boundary.
UPDATE public.players
SET status = CASE
  WHEN lower(status) IN ('active', 'inactive', 'suspended') THEN lower(status)
  ELSE 'active'
END;
UPDATE public.players SET overall_rating = 1 WHERE overall_rating < 1;
UPDATE public.players SET overall_rating = 5 WHERE overall_rating > 5;
ALTER TABLE public.players ALTER COLUMN overall_rating SET DEFAULT 1;

ALTER TABLE public.players
  ADD CONSTRAINT players_status_check CHECK (status IN ('active', 'inactive', 'suspended')),
  ADD CONSTRAINT players_rating_check CHECK (overall_rating >= 1 AND overall_rating <= 5),
  ADD CONSTRAINT players_shirt_number_check CHECK (shirt_number IS NULL OR (shirt_number >= 0 AND shirt_number <= 99));
