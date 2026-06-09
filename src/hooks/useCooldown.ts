import * as React from "react";

export function useCooldown(cooldownMs = 10000): {
  disabled: boolean;
  trigger: () => boolean;
} {
  const [disabled, setDisabled] = React.useState(false);
  const disabledRef = React.useRef(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const trigger = React.useCallback(() => {
    if (disabledRef.current) return false;
    disabledRef.current = true;
    setDisabled(true);
    timerRef.current = window.setTimeout(() => {
      disabledRef.current = false;
      setDisabled(false);
    }, cooldownMs);
    return true;
  }, [cooldownMs]);

  return { disabled, trigger };
}

export default useCooldown;
