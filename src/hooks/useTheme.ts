import * as React from "react";
import {
  applyTheme,
  getInitialTheme,
  storeTheme,
  type Theme,
} from "@/lib/theme";

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme);

  React.useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
