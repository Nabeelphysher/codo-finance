import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (window.confirm("A new version is available. Reload now?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.info("App ready to work offline");
  },
});

