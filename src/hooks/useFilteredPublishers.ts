import * as React from "react";
import { publishers } from "@/lib/publisher-config";
import type { PublisherConfig } from "@/types/dashboard";

export function useFilteredPublishers(
  publisherIds: string[],
): PublisherConfig[] {
  return React.useMemo(
    () => publishers.filter((p) => publisherIds.includes(p.id)),
    [publisherIds],
  );
}
