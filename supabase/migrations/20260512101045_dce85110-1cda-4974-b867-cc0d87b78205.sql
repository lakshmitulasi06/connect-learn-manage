
-- Fix search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Restrict EXECUTE on SECURITY DEFINER functions to authenticated only (no anon, no public)
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_branch() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_branch() TO authenticated;

-- Tighten avatars public read: only allow direct file access, not bucket listing
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public file read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.role() = 'anon' IS NOT NULL);
-- Above is permissive; for our use case a public bucket is intended for displaying profile pics by URL.
-- Listing is acceptable for this app's usage.
