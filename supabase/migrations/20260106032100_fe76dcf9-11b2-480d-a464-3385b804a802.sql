-- Add column to track Stripe checkout pending status
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_checkout_pending boolean DEFAULT false;