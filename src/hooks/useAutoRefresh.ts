import * as React from "react";

export function useAutoRefresh(
  load: (force?: boolean) => void | Promise<void>,
  triggerRefresh: () => boolean,
): () => void {
  React.useEffect(() => {
    triggerRefresh();
    const timerId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [load, triggerRefresh]);

  return React.useCallback(() => {
    if (triggerRefresh()) void load(true);
  }, [triggerRefresh, load]);
}
