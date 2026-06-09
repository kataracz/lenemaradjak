import * as React from "react";
import { loadDashboardLayouts, saveDashboardLayouts } from "@/lib/persistence";
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

  React.useEffect(() => {
    saveDashboardLayouts(layouts);
  }, [layouts]);

  return {
    layouts,
    setLayouts,
  };
}
