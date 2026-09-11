window.PUBLIC_CONFIG = null;
const previewQuery = new URLSearchParams(window.location.search).get("preview") === "draft" ? "?preview=draft" : "";
window.PUBLIC_CONFIG_READY = fetch(`/api/public/config${previewQuery}`, { credentials: "same-origin" })
  .then((response) => response.ok ? response.json() : Promise.reject(new Error("Configuration unavailable")))
  .then((config) => {
    if (previewQuery) {
      try {
        const override = JSON.parse(sessionStorage.getItem("adminPreviewOverride") || "null");
        if (override?.key && override.data) config[override.key] = { ...(config[override.key] || {}), ...override.data };
      } catch {}
    }
    window.PUBLIC_CONFIG = config;
  })
  .catch(() => { window.PUBLIC_CONFIG = null; });

if (!previewQuery) window.addEventListener("storage", (event) => { if (event.key === "websiteConfigUpdated") window.location.reload(); });
