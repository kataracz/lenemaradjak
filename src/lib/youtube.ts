export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith("youtube.com")) {
      return parsed.searchParams.get("v");
    }
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("?")[0];
      return id.length > 0 ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  opts: { autoplay?: boolean } = {},
): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (opts.autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}
