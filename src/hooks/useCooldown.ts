import * as React from "react";

export function useCooldown(cooldownMs = 10000): {
  disabled: boolean;
  trigger: () => boolean;
  reset: () => void;
} {
  const [disabled, setDisabled] = React.useState(false);
  const disabledRef = React.useRef(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        // Reset the guard so StrictMode's remount can start a fresh timer (state is preserved,
        // the re-triggered setDisabled(true) is a no-op and the new timer eventually resets it).
        disabledRef.current = false;
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

  const reset = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    disabledRef.current = false;
    setDisabled(false);
  }, []);

  return { disabled, trigger, reset };
}

export default useCooldown;
