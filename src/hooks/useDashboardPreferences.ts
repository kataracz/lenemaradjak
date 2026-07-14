import * as React from "react";
import {
  DASHBOARD_PREFERENCES_KEY,
  loadDashboardPreferences,
  saveDashboardPreferences,
} from "@/lib/persistence";
import type { DashboardPreferences } from "@/lib/persistence";
import type { DashboardLayouts } from "@/types/dashboard";

export function useDashboardPreferences(defaults: DashboardPreferences): {
  layouts: DashboardLayouts;
  setLayouts: React.Dispatch<React.SetStateAction<DashboardLayouts>>;
  publisherFilter: string;
  setPublisherFilter: (publisherFilter: string) => void;
} {
  const [preferences, setPreferences] = React.useState<DashboardPreferences>(
    () => {
      if (typeof window === "undefined") {
        return defaults;
      }

      return loadDashboardPreferences() ?? defaults;
    },
  );

  const skipNextSave = React.useRef(false);

  React.useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveDashboardPreferences(preferences);
  }, [preferences]);

  React.useEffect(() => {
    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key !== DASHBOARD_PREFERENCES_KEY) return;
      const stored = loadDashboardPreferences();
      if (stored) {
        skipNextSave.current = true;
        setPreferences(stored);
      }
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => {
      window.removeEventListener("storage", syncFromOtherTab);
    };
  }, []);

  const setLayouts = React.useCallback(
    (update: React.SetStateAction<DashboardLayouts>) => {
      setPreferences((prev) => ({
        ...prev,
        layouts: typeof update === "function" ? update(prev.layouts) : update,
      }));
    },
    [],
  );

  const setPublisherFilter = React.useCallback((publisherFilter: string) => {
    setPreferences((prev) => ({ ...prev, publisherFilter }));
  }, []);

  return {
    layouts: preferences.layouts,
    setLayouts,
    publisherFilter: preferences.publisherFilter,
    setPublisherFilter,
  };
}
