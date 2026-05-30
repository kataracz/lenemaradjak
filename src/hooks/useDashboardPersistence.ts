"use client";

import * as React from "react";
import { loadDashboardLayouts, saveDashboardLayouts } from "@/lib/persistence";
import type { DashboardLayouts } from "@/types/dashboard";

export function useDashboardPersistence(defaultLayouts: DashboardLayouts) {
  const [layouts, setLayouts] =
    React.useState<DashboardLayouts>(defaultLayouts);

  React.useEffect(() => {
    const storedLayouts = loadDashboardLayouts();
    if (storedLayouts) {
      setLayouts(storedLayouts);
    }
  }, []);

  React.useEffect(() => {
    saveDashboardLayouts(layouts);
  }, [layouts]);

  return {
    layouts,
    setLayouts,
  };
}
