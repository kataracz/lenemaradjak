import * as React from "react";

export function useContainerWidth({ threshold = 800 } = {}): {
  ref: React.RefCallback<HTMLElement>;
  isWide: boolean;
} {
  const [isWide, setIsWide] = React.useState(false);
  const observerRef = React.useRef<ResizeObserver | null>(null);

  const ref = React.useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node) return;
      setIsWide(node.offsetWidth >= threshold);
      if (typeof ResizeObserver === "undefined") return;
      observerRef.current = new ResizeObserver(([entry]) => {
        setIsWide(entry.contentRect.width >= threshold);
      });
      observerRef.current.observe(node);
    },
    [threshold],
  );

  React.useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  return { ref, isWide };
}
