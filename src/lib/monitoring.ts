import * as Sentry from "@sentry/react";
import { ENV } from "./env";

function initSentry() {
  if (!ENV.monitoring.sentryDsn) return;

  Sentry.init({
    dsn: ENV.monitoring.sentryDsn,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
  });
}

function initGA() {
  const id = ENV.monitoring.gaMeasurementId;
  if (!id) return;

  // Load gtag.js
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  // Init config
  const inline = document.createElement("script");
  inline.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(inline);
}

export function initMonitoring() {
  if (typeof window === "undefined") return;
  initSentry();
  initGA();
}
