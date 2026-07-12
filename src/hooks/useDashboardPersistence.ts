import * as React from "react";
import {
  DASHBOARD_LAYOUT_KEY,
  loadDashboardLayouts,
  saveDashboardLayouts,
} from "@/lib/persistence";
import type { DashboardLayouts } from "@/types/dashboard";

export function useDashboardPersistence(defaultLayouts: DashboardLayouts): {
  layouts: DashboardLayouts;
  setLayouts: React.Dispatch<React.SetStateAction<DashboardLayouts>>;
} {
  const [layouts, setLayouts] = React.useState<DashboardLayouts>(() => {
    if (typeof window === "undefined") {
      return defaultLayouts;
    }

    const storedLayouts = loadDashboardLayouts();
    return storedLayouts ?? defaultLayouts;
  });

  const skipNextSave = React.useRef(false);

  React.useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveDashboardLayouts(layouts);
  }, [layouts]);

  React.useEffect(() => {
    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key !== DASHBOARD_LAYOUT_KEY) return;
      const stored = loadDashboardLayouts();
      if (stored) {
        skipNextSave.current = true;
        setLayouts(stored);
      }
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => {
      window.removeEventListener("storage", syncFromOtherTab);
    };
  }, []);

  return {
    layouts,
    setLayouts,
  };
}
