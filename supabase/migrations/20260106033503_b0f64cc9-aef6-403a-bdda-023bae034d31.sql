-- Table to track trial notifications and avoid duplicates
CREATE TABLE IF NOT EXISTS public.trial_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  channel text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type, channel)
);

-- Enable RLS
ALTER TABLE public.trial_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own notifications
CREATE POLICY "Users can view own notifications" ON public.trial_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for service role to insert (edge functions)
CREATE POLICY "Service role can insert notifications" ON public.trial_notifications
  FOR INSERT WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_trial_notifications_user_type ON public.trial_notifications(user_id, notification_type);