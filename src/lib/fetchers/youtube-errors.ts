export class YouTubeQuotaError extends Error {
  constructor() {
    super("YouTube API quota exceeded");
    this.name = "YouTubeQuotaError";
  }
}

export function isYouTubeQuotaError(
  error: unknown,
): error is YouTubeQuotaError {
  return error instanceof YouTubeQuotaError;
}

export async function youtubeApiError(
  response: Response,
  context: string,
): Promise<Error> {
  const body = (await response.json().catch(() => null)) as {
    error?: { errors?: { reason?: string }[] };
  } | null;
  if (body?.error?.errors?.some((e) => e.reason === "quotaExceeded")) {
    return new YouTubeQuotaError();
  }
  return new Error(`${context} failed: ${String(response.status)}`);
}

export function isNotConfiguredResponse(response: Response): boolean {
  return response.status === 501;
}

// Discovered lazily: the proxy returns 501 for googleapis.com requests when
// YOUTUBE_API_KEY isn't configured server-side. There's no client-side flag —
// once a request reveals this, skip further network calls for the session.
let youtubeUnavailable = false;

export function isYoutubeUnavailable(): boolean {
  return youtubeUnavailable;
}

export function setYoutubeUnavailable(value: boolean): void {
  youtubeUnavailable = value;
}
