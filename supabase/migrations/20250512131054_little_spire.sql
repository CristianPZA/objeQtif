/*
  # Setup User Authentication and Profiles

  1. Changes
    - Create trigger function for new user signup
    - Create trigger for auth.users table
    - Setup RLS policies for user_profiles table
    
  2. Security
    - Enable RLS on user_profiles
    - Add policies for reading and updating own profile
    - Add policy for trigger-based profile creation
*/

-- Create trigger function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Utilisateur'), 'employe');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'employe');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Read policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can read own profile'
  ) THEN
    DROP POLICY "Users can read own profile" ON public.user_profiles;
  END IF;

  -- Update policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    DROP POLICY "Users can update own profile" ON public.user_profiles;
  END IF;

  -- Insert policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Allow trigger to create profiles'
  ) THEN
    DROP POLICY "Allow trigger to create profiles" ON public.user_profiles;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow trigger to create profiles"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);