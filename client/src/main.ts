const el = document.getElementById("status")!;

// Relativ sökväg, så att den fungerar under /cafestjarnan/
fetch("api/health")
  .then((r) => r.json())
  .then((d) => (el.textContent = d.ok ? "Servern svarar." : "Konstigt svar."))
  .catch(() => (el.textContent = "Ingen kontakt med servern."));
