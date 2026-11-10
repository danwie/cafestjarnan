import * as Sentry from "@sentry/browser";

const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn });
}

const el = document.getElementById("status")!;

fetch("api/health")
  .then((r) => r.json())
  .then((d) => (el.textContent = d.ok ? "Servern svarar." : "Konstigt svar."))
  .catch(() => (el.textContent = "Ingen kontakt med servern."));
