import { PROXY_HOSTS } from "@/lib/proxy-hosts";

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

export async function proxyFetch(
  url: URL,
  signal?: AbortSignal,
): Promise<Response> {
  const doFetch = () =>
    typeof window !== "undefined" && PROXY_HOSTS.has(url.hostname)
      ? fetch(`/api/proxy?url=${encodeURIComponent(url.toString())}`)
      : fetch(url.toString());

  const res = await doFetch();
  if (res.status === 429) {
    const waitSec = Number(res.headers.get("Retry-After") ?? 5);
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError(signal));
        return;
      }
      const timerId = setTimeout(resolve, waitSec * 1000);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timerId);
          reject(abortError(signal));
        },
        { once: true },
      );
    });
    return doFetch();
  }
  return res;
}
