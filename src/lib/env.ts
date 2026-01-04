export const ENV = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  app: {
    url: import.meta.env.VITE_APP_URL,
  },
  monitoring: {
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID,
  },
};

if (!ENV.supabase.url || !ENV.supabase.anonKey) {
  // Fail fast in development; in production this will surface as a console error
  // rather than breaking the whole app.
  console.error("Supabase credentials missing: check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY");
}
