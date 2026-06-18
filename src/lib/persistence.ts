import type { DashboardLayouts } from "@/types/dashboard";

const DASHBOARD_LAYOUT_KEY = "lenemaradjak-dashboard-layout";

export function loadDashboardLayouts(): DashboardLayouts | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as DashboardLayouts;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDashboardLayouts(layouts: DashboardLayouts) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layouts));
  } catch {}
}
