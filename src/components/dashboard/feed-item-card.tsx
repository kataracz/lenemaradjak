import * as React from "react";
import type { FeedItem } from "@/types/dashboard";

interface FeedItemCardProps {
  item: FeedItem;
  descriptionFallback?: string;
  footer?: React.ReactNode;
}

export function FeedItemCard({
  item,
  descriptionFallback,
  footer,
}: FeedItemCardProps) {
  return (
    <article className="grid gap-2 rounded-lg border p-4">
      <div>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="text-base font-semibold underline-offset-4 transition hover:underline"
        >
          {item.title}
        </a>
        <p className="text-sm text-muted-foreground">
          {item.channelName ?? item.source}
        </p>
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">
        {item.description ?? descriptionFallback}
      </p>
      {footer}
    </article>
  );
}
