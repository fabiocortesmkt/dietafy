CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: plan_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_type AS ENUM (
    'free',
    'premium'
);


--
-- Name: workout_difficulty; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workout_difficulty AS ENUM (
    'iniciante',
    'intermediario',
    'avancado'
);


--
-- Name: workout_goal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workout_goal AS ENUM (
    'perda_gordura',
    'hipertrofia',
    'forca',
    'mobilidade'
);


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;


--
-- Name: notify_new_signup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Call the edge function asynchronously using pg_net
  SELECT net.http_post(
    url := 'https://bozgzrbfmlriyatemcrp.supabase.co/functions/v1/notify-new-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvemd6cmJmbWxyaXlhdGVtY3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0ODU0NTksImV4cCI6MjA4MzA2MTQ1OX0.Jgj5IgNem9fiZCa_Tue7J3kRiuEOumWmGrT6L8eKIEM'
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
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_table_access_method = heap;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    sender text NOT NULL,
    message text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_sender_check CHECK ((sender = ANY (ARRAY['user'::text, 'vita'::text])))
);


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    meals_logged integer DEFAULT 0 NOT NULL,
    ai_messages_sent integer DEFAULT 0 NOT NULL,
    photo_analyses integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_message_count; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_message_count (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    datetime timestamp with time zone NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    calories numeric(7,2),
    protein numeric(7,2),
    carbs numeric(7,2),
    fat numeric(7,2),
    photo_url text,
    ai_analysis jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sleep_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sleep_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    sleep_time timestamp with time zone NOT NULL,
    wake_time timestamp with time zone NOT NULL,
    quality_score integer NOT NULL,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sleep_logs_quality_score_check CHECK (((quality_score >= 0) AND (quality_score <= 10)))
);


--
-- Name: stress_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stress_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    datetime timestamp with time zone NOT NULL,
    level integer NOT NULL,
    emoji text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stress_logs_level_check CHECK (((level >= 0) AND (level <= 10)))
);


--
-- Name: upgrade_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upgrade_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    cpf text NOT NULL,
    plan_type public.plan_type DEFAULT 'premium'::public.plan_type NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    notes text
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    date_of_birth date NOT NULL,
    biological_sex text NOT NULL,
    height_cm numeric(5,2) NOT NULL,
    weight_kg numeric(5,2) NOT NULL,
    goals text[] NOT NULL,
    target_weight_kg numeric(5,2),
    target_timeframe text,
    activity_level text NOT NULL,
    training_preference text[] NOT NULL,
    dietary_restrictions text[] NOT NULL,
    dietary_other text,
    whatsapp_phone text,
    whatsapp_opt_in boolean DEFAULT false NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    whatsapp_active boolean DEFAULT false NOT NULL,
    whatsapp_last_message_at timestamp with time zone,
    whatsapp_onboarding_state text,
    whatsapp_onboarding_payload jsonb,
    plan_type public.plan_type DEFAULT 'free'::public.plan_type NOT NULL,
    plan_started_at timestamp with time zone,
    plan_expires_at timestamp with time zone,
    stripe_customer_id text,
    stripe_subscription_id text,
    avatar_url text,
    notify_water boolean DEFAULT false NOT NULL,
    notify_workout boolean DEFAULT false NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: user_workout_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_workout_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    workout_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: water_intake; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.water_intake (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    ml_consumed integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weight_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weight_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    weight_kg numeric(5,2) NOT NULL,
    fasting boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    direction text NOT NULL,
    message_text text,
    media_url text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone
);


--
-- Name: workout_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workout_id uuid NOT NULL,
    order_index integer NOT NULL,
    exercise_name text NOT NULL,
    sets integer,
    reps text,
    rest_seconds integer,
    instructions text,
    gif_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workout_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    workout_id uuid,
    completed boolean DEFAULT false NOT NULL,
    intensity integer,
    notes jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    environment text NOT NULL,
    duration_min integer NOT NULL,
    difficulty public.workout_difficulty NOT NULL,
    goal public.workout_goal NOT NULL,
    equipment_needed text[] DEFAULT '{}'::text[],
    calories_burned_est integer,
    thumbnail_url text,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_basic boolean DEFAULT false NOT NULL,
    is_premium boolean DEFAULT false NOT NULL
);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: daily_limits daily_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limits
    ADD CONSTRAINT daily_limits_pkey PRIMARY KEY (id);


--
-- Name: daily_limits daily_limits_user_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limits
    ADD CONSTRAINT daily_limits_user_date_unique UNIQUE (user_id, date);


--
-- Name: daily_message_count daily_message_count_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_message_count
    ADD CONSTRAINT daily_message_count_pkey PRIMARY KEY (id);


--
-- Name: daily_message_count daily_message_count_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_message_count
    ADD CONSTRAINT daily_message_count_unique UNIQUE (user_id, date);


--
-- Name: meals meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_pkey PRIMARY KEY (id);


--
-- Name: sleep_logs sleep_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sleep_logs
    ADD CONSTRAINT sleep_logs_pkey PRIMARY KEY (id);


--
-- Name: sleep_logs sleep_logs_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sleep_logs
    ADD CONSTRAINT sleep_logs_user_id_date_key UNIQUE (user_id, date);


--
-- Name: stress_logs stress_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stress_logs
    ADD CONSTRAINT stress_logs_pkey PRIMARY KEY (id);


--
-- Name: upgrade_intents upgrade_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upgrade_intents
    ADD CONSTRAINT upgrade_intents_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_workout_favorites user_workout_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_workout_favorites
    ADD CONSTRAINT user_workout_favorites_pkey PRIMARY KEY (id);


--
-- Name: user_workout_favorites user_workout_favorites_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_workout_favorites
    ADD CONSTRAINT user_workout_favorites_unique UNIQUE (user_id, workout_id);


--
-- Name: water_intake water_intake_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_intake
    ADD CONSTRAINT water_intake_pkey PRIMARY KEY (id);


--
-- Name: water_intake water_intake_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_intake
    ADD CONSTRAINT water_intake_user_id_date_key UNIQUE (user_id, date);


--
-- Name: weight_logs weight_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_logs
    ADD CONSTRAINT weight_logs_pkey PRIMARY KEY (id);


--
-- Name: weight_logs weight_logs_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_logs
    ADD CONSTRAINT weight_logs_user_id_date_key UNIQUE (user_id, date);


--
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: workout_exercises workout_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercises
    ADD CONSTRAINT workout_exercises_pkey PRIMARY KEY (id);


--
-- Name: workout_logs workout_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_logs
    ADD CONSTRAINT workout_logs_pkey PRIMARY KEY (id);


--
-- Name: workout_logs workout_logs_user_id_date_workout_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_logs
    ADD CONSTRAINT workout_logs_user_id_date_workout_id_key UNIQUE (user_id, date, workout_id);


--
-- Name: workouts workouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts
    ADD CONSTRAINT workouts_pkey PRIMARY KEY (id);


--
-- Name: user_profiles_whatsapp_phone_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_whatsapp_phone_unique ON public.user_profiles USING btree (whatsapp_phone) WHERE (whatsapp_phone IS NOT NULL);


--
-- Name: whatsapp_messages_user_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX whatsapp_messages_user_timestamp_idx ON public.whatsapp_messages USING btree (user_id, "timestamp" DESC);


--
-- Name: chat_sessions chat_sessions_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chat_sessions_set_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: daily_message_count daily_message_count_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER daily_message_count_set_updated_at BEFORE UPDATE ON public.daily_message_count FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: daily_limits set_daily_limits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_daily_limits_updated_at BEFORE UPDATE ON public.daily_limits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_profiles set_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_workout_favorites user_workout_favorites_workout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_workout_favorites
    ADD CONSTRAINT user_workout_favorites_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE CASCADE;


--
-- Name: workout_exercises workout_exercises_workout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercises
    ADD CONSTRAINT workout_exercises_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: workout_exercises Authenticated users can view workout exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view workout exercises" ON public.workout_exercises FOR SELECT TO authenticated USING (true);


--
-- Name: workouts Authenticated users can view workouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view workouts" ON public.workouts FOR SELECT TO authenticated USING (true);


--
-- Name: meals Users can insert own meals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own meals" ON public.meals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sleep_logs Users can insert own sleep logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own sleep logs" ON public.sleep_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: stress_logs Users can insert own stress logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own stress logs" ON public.stress_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: water_intake Users can insert own water intake; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own water intake" ON public.water_intake FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: weight_logs Users can insert own weight logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own weight logs" ON public.weight_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: workout_logs Users can insert own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own workout logs" ON public.workout_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: meals Users can update own meals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own meals" ON public.meals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sleep_logs Users can update own sleep logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own sleep logs" ON public.sleep_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: stress_logs Users can update own stress logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own stress logs" ON public.stress_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: water_intake Users can update own water intake; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own water intake" ON public.water_intake FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: weight_logs Users can update own weight logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own weight logs" ON public.weight_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: workout_logs Users can update own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own workout logs" ON public.workout_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: meals Users can view own meals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own meals" ON public.meals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: sleep_logs Users can view own sleep logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sleep logs" ON public.sleep_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: stress_logs Users can view own stress logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own stress logs" ON public.stress_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: water_intake Users can view own water intake; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own water intake" ON public.water_intake FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: weight_logs Users can view own weight logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own weight logs" ON public.weight_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: workout_logs Users can view own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own workout logs" ON public.workout_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users manage own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own chat messages" ON public.chat_messages TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_sessions Users manage own chat sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own chat sessions" ON public.chat_sessions TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_limits Users manage own daily limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own daily limits" ON public.daily_limits USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_message_count Users manage own daily message count; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own daily message count" ON public.daily_message_count TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: upgrade_intents Users manage own upgrade intents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own upgrade intents" ON public.upgrade_intents USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: whatsapp_messages Users manage own whatsapp messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own whatsapp messages" ON public.whatsapp_messages USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_workout_favorites Users manage own workout favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own workout favorites" ON public.user_workout_favorites TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_message_count; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_message_count ENABLE ROW LEVEL SECURITY;

--
-- Name: meals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

--
-- Name: sleep_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: stress_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stress_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: upgrade_intents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.upgrade_intents ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_workout_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_workout_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: water_intake; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;

--
-- Name: weight_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_exercises; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: workouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;