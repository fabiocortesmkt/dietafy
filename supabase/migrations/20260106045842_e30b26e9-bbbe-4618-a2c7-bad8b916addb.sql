-- Fix notify_new_signup function to point to the correct Supabase project
CREATE OR REPLACE FUNCTION public.notify_new_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  request_id bigint;
BEGIN
  -- Call the edge function using the correct project URL
  SELECT net.http_post(
    url := 'https://uqinkeatbviivewmcxei.supabase.co/functions/v1/notify-new-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxaW5rZWF0YnZpaXZld21jeGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MzY3MjEsImV4cCI6MjA4MzExMjcyMX0.QcOG4CHjm0QLSBeWK9VaHJJnpINiqTX8wMt7yNZTyro'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'users',
      'record', jsonb_build_object(
        'id', NEW.id::text,
        'email', NEW.email,
        'created_at', NEW.created_at,
        'raw_user_meta_data', NEW.raw_user_meta_data
      )
    )
  ) INTO request_id;

  RETURN NEW;
END;
$function$;