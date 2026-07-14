import { describe, it, expect, vi, afterEach } from "vitest";
import { validateTarget, fetchWithRedirectGuard } from "./redirect-guard.js";

const ALLOWED_HOSTS = new Set(["good.example.com", "also-good.example.com"]);

function okResponse() {
  return { status: 200, headers: { get: () => null } };
}

function redirectResponse(location) {
  return { status: 302, headers: { get: () => location } };
}

describe("validateTarget", () => {
  it("allows an allow-listed https host", () => {
    const { target, error } = validateTarget(
      "https://good.example.com/feed",
      ALLOWED_HOSTS,
    );
    expect(error).toBeUndefined();
    expect(target.hostname).toBe("good.example.com");
  });

  it("rejects an invalid url", () => {
    const { error } = validateTarget("not a url", ALLOWED_HOSTS);
    expect(error).toEqual({ status: 400, body: { error: "Invalid url" } });
  });

  it("rejects a non-http(s) protocol", () => {
    const { error } = validateTarget("file:///etc/passwd", ALLOWED_HOSTS);
    expect(error?.status).toBe(400);
  });

  it("rejects a host not on the allow-list", () => {
    const { error } = validateTarget(
      "https://evil.example.com/",
      ALLOWED_HOSTS,
    );
    expect(error).toEqual({ status: 403, body: { error: "Host not allowed" } });
  });
});

describe("fetchWithRedirectGuard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the response directly when there is no redirect", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", mockFetch);

    const response = await fetchWithRedirectGuard(
      "https://good.example.com/feed",
      {},
      ALLOWED_HOSTS,
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://good.example.com/feed",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("follows a redirect to another allow-listed host", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        redirectResponse("https://also-good.example.com/feed"),
      )
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", mockFetch);

    const response = await fetchWithRedirectGuard(
      "https://good.example.com/feed",
      {},
      ALLOWED_HOSTS,
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://also-good.example.com/feed",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("blocks a redirect to a disallowed host without following it", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse("https://evil.example.com/"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchWithRedirectGuard(
        "https://good.example.com/feed",
        {},
        ALLOWED_HOSTS,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a redirect chain longer than maxRedirects", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(redirectResponse("https://good.example.com/feed"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchWithRedirectGuard(
        "https://good.example.com/feed",
        {},
        ALLOWED_HOSTS,
        2,
      ),
    ).rejects.toMatchObject({ statusCode: 502 });

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
