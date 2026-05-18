-- Corrige "Database error saving new user"
-- O auth usa a role supabase_auth_admin; o trigger precisa de grants explícitos.

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;

-- Recria função com search_path seguro (padrão Supabase)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Permite o trigger inserir perfil (auth.uid() ainda não existe no momento do signup)
DROP POLICY IF EXISTS "Service can insert profiles on signup" ON public.profiles;
CREATE POLICY "Service can insert profiles on signup"
  ON public.profiles
  FOR INSERT
  TO supabase_auth_admin
  WITH CHECK (true);

-- Perfis órfãos: usuários em auth.users sem profile (cadastros que falharam antes)
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
