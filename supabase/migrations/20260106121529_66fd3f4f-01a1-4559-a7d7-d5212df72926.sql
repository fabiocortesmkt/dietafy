-- Remove the trigger that sends welcome email on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;