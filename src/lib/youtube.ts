const PATH_ID_PREFIXES = ["shorts", "embed", "live"];

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.split("/")[1] || null;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      const [, prefix, id] = parsed.pathname.split("/");
      if (PATH_ID_PREFIXES.includes(prefix)) {
        return id || null;
      }
      return parsed.searchParams.get("v");
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
