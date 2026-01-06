-- Remove unique constraint on whatsapp_phone to allow duplicate numbers
DROP INDEX IF EXISTS public.user_profiles_whatsapp_phone_unique;