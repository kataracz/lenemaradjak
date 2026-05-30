import * as React from "react";

export function useCooldown(cooldownMs = 10000) {
  const [disabled, setDisabled] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const trigger = React.useCallback(() => {
    if (disabled) return false;
    setDisabled(true);
    timerRef.current = window.setTimeout(() => {
      setDisabled(false);
    }, cooldownMs);
    return true;
  }, [cooldownMs, disabled]);

  return { disabled, trigger } as const;
}

export default useCooldown;
