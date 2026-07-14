import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import request from "supertest";

let app;

beforeAll(async () => {
  delete process.env.YOUTUBE_API_KEY;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  ({ default: app } = await import("./proxy-server.js"));
});

function textResponse(body, { contentLength } = {}) {
  const bytes = new TextEncoder().encode(body);
  return {
    status: 200,
    headers: {
      get: (name) => {
        const key = name.toLowerCase();
        if (key === "content-type") return "text/plain";
        if (key === "content-length")
          return String(contentLength ?? bytes.length);
        return null;
      },
    },
    arrayBuffer: () => Promise.resolve(bytes.buffer),
  };
}

function oversizedHeaderResponse() {
  return {
    status: 200,
    headers: {
      get: (name) =>
        name.toLowerCase() === "content-length"
          ? String(6 * 1024 * 1024)
          : null,
    },
    arrayBuffer: () => Promise.reject(new Error("should not be read")),
  };
}

function abortErrorFetch() {
  const err = new Error("Aborted");
  err.name = "AbortError";
  return Promise.reject(err);
}

describe("GET /api/proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when the url query param is missing", async () => {
    const res = await request(app).get("/api/proxy");
    expect(res.status).toBe(400);
  });

  it("returns 403 for a host not on the allow-list", async () => {
    const res = await request(app)
      .get("/api/proxy")
      .query({ url: "https://evil.com/feed" });
    expect(res.status).toBe(403);
  });

  it("returns 501 for a googleapis.com request when YOUTUBE_API_KEY isn't configured", async () => {
    const res = await request(app)
      .get("/api/proxy")
      .query({ url: "https://googleapis.com/youtube/v3/videos" });
    expect(res.status).toBe(501);
  });

  it("fetches an allowed host and serves the second identical request from cache", async () => {
    const mockFetch = vi.fn().mockResolvedValue(textResponse("hello"));
    vi.stubGlobal("fetch", mockFetch);

    const first = await request(app)
      .get("/api/proxy")
      .query({ url: "https://telex.hu/proxy-test-cache" });
    expect(first.status).toBe(200);
    expect(first.text).toBe("hello");

    const second = await request(app)
      .get("/api/proxy")
      .query({ url: "https://telex.hu/proxy-test-cache" });
    expect(second.status).toBe(200);
    expect(second.text).toBe("hello");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent requests for the same url", async () => {
    let resolveFetch;
    const mockFetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const url = "https://direkt36.hu/proxy-test-inflight";
    const first = request(app).get("/api/proxy").query({ url });
    const second = request(app).get("/api/proxy").query({ url });

    await new Promise((resolve) => setTimeout(resolve, 20));
    resolveFetch(textResponse("shared"));

    const [firstRes, secondRes] = await Promise.all([first, second]);
    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 413 when the upstream response declares an oversized content-length", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(oversizedHeaderResponse()),
    );

    const res = await request(app)
      .get("/api/proxy")
      .query({ url: "https://444.hu/proxy-test-oversized" });

    expect(res.status).toBe(413);
  });

  it("returns 504 when the upstream fetch aborts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(abortErrorFetch));

    const res = await request(app)
      .get("/api/proxy")
      .query({ url: "https://hang.hu/proxy-test-timeout" });

    expect(res.status).toBe(504);
  });

  it("returns 502 when the upstream fetch fails unexpectedly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network fail")),
    );

    const res = await request(app)
      .get("/api/proxy")
      .query({ url: "https://www.telex.hu/proxy-test-failure" });

    expect(res.status).toBe(502);
  });

  it("returns 429 with a Retry-After header once a host's rate limit is exceeded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(textResponse("ok"))),
    );

    let last;
    for (let i = 0; i < 16; i++) {
      last = await request(app)
        .get("/api/proxy")
        .query({ url: `https://valaszonline.hu/proxy-test-ratelimit-${i}` });
    }

    expect(last.status).toBe(429);
    expect(last.headers["retry-after"]).toBeDefined();
  });
});
