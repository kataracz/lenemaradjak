import type { PublisherConfig } from "@/types/dashboard";
import { proxyFetch } from "@/lib/fetchers/youtube-http";
import {
  isNotConfiguredResponse,
  isYoutubeUnavailable,
  setYoutubeUnavailable,
} from "@/lib/fetchers/youtube-errors";
import {
  withInflight,
  channelResolutionInflight,
  loadCachedChannelId,
  storeCachedChannelId,
} from "@/lib/fetchers/youtube-cache";

const normalizeHandle = (handle: string) => handle.trim().replace(/^@/, "");

export async function resolveYouTubeChannelId(
  publisher: PublisherConfig,
  signal?: AbortSignal,
): Promise<string | undefined> {
  if (publisher.youtubeChannelId) {
    return publisher.youtubeChannelId;
  }

  if (isYoutubeUnavailable()) return undefined;
  const handle = publisher.youtubeChannelHandle;
  if (!handle) return undefined;

  const cached = loadCachedChannelId(publisher.id);
  if (cached) return cached;

  return withInflight(channelResolutionInflight, publisher.id, async () => {
    // forHandle: 1 quota unit and works with Brand Accounts, unlike deprecated forUsername.
    const handleUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    handleUrl.searchParams.set("part", "id");
    handleUrl.searchParams.set("forHandle", handle);

    const handleResponse = await proxyFetch(handleUrl, signal);
    if (isNotConfiguredResponse(handleResponse)) {
      setYoutubeUnavailable(true);
      return undefined;
    }
    if (!handleResponse.ok) {
      // A real API error (quota/auth) would fail search.list too, so don't fall back.
      console.warn(
        `YouTube forHandle failed for ${publisher.id}: ${String(handleResponse.status)}`,
      );
      return undefined;
    }

    const handleResult = (await handleResponse.json()) as {
      items?: { id?: string }[];
    };
    const channelId: string | undefined = handleResult.items?.[0]?.id;
    if (channelId) {
      storeCachedChannelId(publisher.id, channelId);
      return channelId;
    }

    // Handle not recognized; fall back to search.list (100 quota units).
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "id");
    searchUrl.searchParams.set("q", normalizeHandle(handle));
    searchUrl.searchParams.set("type", "channel");
    searchUrl.searchParams.set("maxResults", "1");

    const searchResponse = await proxyFetch(searchUrl, signal);
    if (!searchResponse.ok) {
      console.warn(
        `YouTube channel resolution failed for ${publisher.id}: ${String(searchResponse.status)}`,
      );
      return undefined;
    }

    const searchResult = (await searchResponse.json()) as {
      items?: { id?: { channelId?: string } }[];
    };
    const fallbackId: string | undefined =
      searchResult.items?.[0]?.id?.channelId;
    if (fallbackId) {
      storeCachedChannelId(publisher.id, fallbackId);
      return fallbackId;
    }

    console.warn(
      `YouTube: could not resolve channel ID for ${publisher.id} (${handle})`,
    );
    return undefined;
  });
}

export async function resolveChannelPublishers(
  publishers: PublisherConfig[],
  signal?: AbortSignal,
): Promise<{ publisher: PublisherConfig; channelId: string }[]> {
  const results = await Promise.allSettled(
    publishers.map(async (publisher) => ({
      publisher,
      channelId: await resolveYouTubeChannelId(publisher, signal),
    })),
  );

  return results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        publisher: PublisherConfig;
        channelId: string;
      }> => result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((item): item is { publisher: PublisherConfig; channelId: string } =>
      Boolean(item.channelId),
    );
}
