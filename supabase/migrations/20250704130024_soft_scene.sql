/*
  # Sync existing emails from auth.users to user_profiles

  1. Changes
    - Update existing user_profiles with emails from auth.users
    - This ensures all existing users have their emails properly associated
    - Works alongside the trigger for new users and email updates
*/

-- Update existing user_profiles with emails from auth.users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users in auth.users
  FOR user_record IN 
    SELECT id, email FROM auth.users
  LOOP
    -- Update the corresponding user_profile with the email from auth.users
    UPDATE public.user_profiles
    SET 
      email = user_record.email,
      updated_at = NOW()
    WHERE 
      id = user_record.id
      AND (email IS NULL OR email != user_record.email);
  END LOOP;
END $$;

-- Log the results
DO $$
DECLARE
  updated_count INTEGER;
  total_users INTEGER;
  missing_emails INTEGER;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_users FROM user_profiles;
  
  -- Count users with missing emails
  SELECT COUNT(*) INTO missing_emails FROM user_profiles WHERE email IS NULL;
  
  -- Log the results
  RAISE NOTICE 'Email synchronization complete:';
  RAISE NOTICE '- Total users: %', total_users;
  RAISE NOTICE '- Users still missing emails: %', missing_emails;
  
  IF missing_emails > 0 THEN
    RAISE WARNING 'Some users still have missing emails. Check auth.users table for these IDs.';
  ELSE
    RAISE NOTICE 'All users now have emails synchronized from auth.users.';
  END IF;
END $$;