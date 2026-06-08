import * as React from "react";
import { Button } from "@/components/ui/button";
import type { FeedItem } from "@/types/dashboard";

interface FeedItemCardProps {
  item: FeedItem;
  descriptionFallback?: string;
  footer?: React.ReactNode;
  onPlay?: () => void;
  compact?: boolean;
}

export function FeedItemCard({
  item,
  descriptionFallback,
  footer,
  onPlay,
  compact,
}: FeedItemCardProps) {
  if (compact) {
    return (
      <article className="flex gap-3 px-4 py-3">
        {onPlay && item.thumbnailUrl && (
          <button
            onClick={onPlay}
            className="group relative h-[3.2rem] w-20 shrink-0 overflow-hidden rounded-md"
            aria-label="Lejátszás"
          >
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex size-6 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md text-[10px]">
                ▶
              </span>
            </div>
          </button>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-sm font-semibold underline-offset-4 transition hover:underline"
          >
            {item.title}
          </a>
          <p className="truncate text-xs text-muted-foreground">
            {item.channelName ?? item.source}
          </p>
          {footer}
        </div>
      </article>
    );
  }

  return (
    <article className="grid gap-2 px-4 py-3">
      {onPlay &&
        (item.thumbnailUrl ? (
          <button
            onClick={onPlay}
            className="group relative w-full overflow-hidden rounded-md"
            aria-label="Lejátszás"
          >
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              loading="lazy"
              className="w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md">
                ▶
              </span>
            </div>
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onPlay}
            className="self-start"
          >
            ▶ Lejátszás
          </Button>
        ))}
      <div>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 text-base font-semibold underline-offset-4 transition hover:underline"
        >
          {item.title}
        </a>
        <p className="text-sm text-muted-foreground">
          {item.channelName ?? item.source}
        </p>
      </div>
      {(item.description ?? descriptionFallback) && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {item.description ?? descriptionFallback}
        </p>
      )}
      {footer}
    </article>
  );
}
