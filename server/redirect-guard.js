export function validateTarget(rawUrl, allowedHosts) {
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    return { error: { status: 400, body: { error: "Invalid url" } } };
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return {
      error: { status: 400, body: { error: "Only HTTP(S) URLs allowed" } },
    };
  }

  if (!allowedHosts.has(target.hostname)) {
    return { error: { status: 403, body: { error: "Host not allowed" } } };
  }

  return { target };
}

export async function fetchWithRedirectGuard(
  url,
  options,
  allowedHosts,
  maxRedirects = 5,
) {
  let currentUrl = url;

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const response = await fetch(currentUrl, {
      ...options,
      redirect: "manual",
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      return response;
    }

    const nextUrl = new URL(location, currentUrl).toString();
    const { target, error } = validateTarget(nextUrl, allowedHosts);
    if (error) {
      const err = new Error("Redirect target not allowed");
      err.statusCode = error.status;
      err.body = error.body;
      throw err;
    }

    currentUrl = target.toString();
  }

  const err = new Error("Too many redirects");
  err.statusCode = 502;
  err.body = { error: "Too many redirects" };
  throw err;
}
