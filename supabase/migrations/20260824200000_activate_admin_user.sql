-- Activate the initial administrator created during project setup.
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmed_at = COALESCE(confirmed_at, now())
WHERE lower(email) = 'admin@admin.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'admin@admin.com'
ON CONFLICT (user_id, role) DO NOTHING;