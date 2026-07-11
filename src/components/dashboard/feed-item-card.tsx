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
  const description = item.description ?? descriptionFallback;

  return (
    <article
      className={`px-3 py-2 sm:px-4 sm:py-3 ${compact ? "flex gap-3" : "grid gap-2"}`}
    >
      {onPlay &&
        (item.thumbnailUrl ? (
          <button
            onClick={onPlay}
            aria-label="Lejátszás"
            className={`group relative overflow-hidden rounded-md ${compact ? "h-[3.2rem] w-20 shrink-0" : "w-full cursor-pointer"}`}
          >
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              loading="lazy"
              className={
                compact ? "h-full w-full object-cover" : "w-full object-cover"
              }
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <span
                className={`flex items-center justify-center rounded-full bg-white/90 text-foreground shadow-md ${compact ? "size-6 text-[10px]" : "size-12"}`}
              >
                ▶
              </span>
            </div>
          </button>
        ) : (
          !compact && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPlay}
              className="self-start"
            >
              ▶ Lejátszás
            </Button>
          )
        ))}

      <div className={compact ? "flex min-w-0 flex-col gap-0.5" : undefined}>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className={`line-clamp-2 font-semibold underline-offset-4 transition hover:underline ${compact ? "text-sm" : "text-base"}`}
        >
          {item.title}
        </a>
        <p
          className={`text-muted-foreground ${compact ? "truncate text-xs" : "text-sm"}`}
        >
          {item.channelName ?? item.source}
        </p>
        {compact && footer}
      </div>

      {!compact && description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {!compact && footer}
    </article>
  );
}
