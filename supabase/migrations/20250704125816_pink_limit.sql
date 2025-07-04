/*
  # Synchronize email from auth.users to user_profiles

  1. Changes
    - Update handle_new_user() function to copy email from auth.users
    - Add update_user_email() function to keep emails in sync
    - Add trigger to update user_profiles when auth.users email changes

  2. Security
    - Maintain existing RLS policies
    - No changes to access control
*/

-- Update handle_new_user() function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'employe',
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Create function to sync email changes from auth.users to user_profiles
CREATE OR REPLACE FUNCTION public.update_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update email in user_profiles if it changed in auth.users
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.user_profiles
    SET 
      email = NEW.email,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for email updates
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.update_user_email();

-- Add comment to document the function
COMMENT ON FUNCTION public.update_user_email() IS 'Fonction trigger pour synchroniser les emails entre auth.users et user_profiles';