import type { DashboardLayouts } from "@/types/dashboard";

export const DASHBOARD_PREFERENCES_KEY = "lenemaradjak-dashboard-preferences";

export interface DashboardPreferences {
  layouts: DashboardLayouts;
  publisherFilter: string;
}

export function loadDashboardPreferences(): DashboardPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as DashboardPreferences;
    return parsed;
  } catch (error) {
    if (import.meta.env.DEV)
      console.warn(`Discarding corrupt ${DASHBOARD_PREFERENCES_KEY}:`, error);
    return null;
  }
}

export function saveDashboardPreferences(preferences: DashboardPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      DASHBOARD_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
  } catch (error) {
    if (import.meta.env.DEV) console.warn(error);
  }
}
