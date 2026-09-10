import { GET } from "@/app/api/lookup/route";
import { clearRateLimitStore } from "@/lib/rateLimit";

const originalEnv = process.env;

function createMockRequest(url: string, headers: Record<string, string> = {}): Request {
  return {
    url,
    headers: new Headers(headers),
  } as unknown as Request;
}

describe("GET /api/lookup", () => {
  beforeEach(() => {
    jest.resetModules();
    clearRateLimitStore();
    // @ts-expect-error mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("returns 400 if email is missing or invalid", async () => {
    const req = createMockRequest("http://localhost:3000/api/lookup?captcha_token=dev_token");
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("invalid_email");

    const reqInvalid = createMockRequest("http://localhost:3000/api/lookup?email=not-an-email&captcha_token=dev_token");
    const resInvalid = await GET(reqInvalid);
    expect(resInvalid.status).toBe(400);
  });

  it("returns 400 with captcha_required if captcha token is missing", async () => {
    const req = createMockRequest("http://localhost:3000/api/lookup?email=test@example.com");
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("captcha_required");
  });

  it("returns 200 with breach count and hints when breaches are found and captcha is valid", async () => {
    const mockResponse = {
      status: "success",
      breaches: [["LinkedIn", "Adobe"]],
      email: "test@example.com",
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=TEST@example.com&captcha_token=dev_token");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.email).toBe("test@example.com");
    expect(json.summary.breach_count).toBe(2);
    expect(json.summary.possible_accounts).toBe(2);
    expect(json.details_available).toBe(false);
    expect(json.hints).toEqual(
      expect.arrayContaining([
        { category: "social", count: 1 },
        { category: "productivity", count: 1 },
      ])
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.xposedornot.com/v1/check-email/test%40example.com",
      expect.objectContaining({
        headers: {
          "user-agent": "EmailFootprint-App/1.0",
        },
      })
    );
  });

  it("returns 200 with 0 breach count when 404 is returned from provider", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=clean@example.com&captcha_token=dev_token");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.summary.breach_count).toBe(0);
    expect(json.summary.possible_accounts).toBe(0);
    expect(json.hints).toEqual([]);
  });

  it("returns 200 with 0 breach count when provider returns 200 with Not found error payload", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ Error: "Not found", email: null }),
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=clean@example.com&captcha_token=dev_token");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.summary.breach_count).toBe(0);
    expect(json.summary.possible_accounts).toBe(0);
    expect(json.hints).toEqual([]);
  });

  it("returns 429 when rate limited by provider", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "120" }),
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=ratelimited@example.com&captcha_token=dev_token");
    const res = await GET(req);
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toBe("rate_limited");
    expect(json.retry_after).toBe(120);
  });

  it("returns 502 when provider service errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=test@example.com&captcha_token=dev_token");
    const res = await GET(req);
    expect(res.status).toBe(502);

    const json = await res.json();
    expect(json.error).toBe("lookup_error");
  });

  it("deduplicates case-insensitive service occurrences into unique possible accounts", async () => {
    const mockResponse = {
      status: "success",
      breaches: [["Adobe", "adobe", "SomeForum", "someforum"]],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=user@example.com&captcha_token=dev_token");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.summary.breach_count).toBe(4);
    expect(json.summary.possible_accounts).toBe(2); // 1 for adobe, 1 for someforum
  });

  it("enforces local IP rate limit after exceeding max search requests", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "success", breaches: [] }),
    });

    // Make 15 requests
    for (let i = 0; i < 15; i++) {
      const req = createMockRequest("http://localhost:3000/api/lookup?email=test@example.com&captcha_token=dev_token", {
        "x-forwarded-for": "198.51.100.1",
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    }

    // 16th request should be rate limited
    const reqBlocked = createMockRequest("http://localhost:3000/api/lookup?email=test@example.com&captcha_token=dev_token", {
      "x-forwarded-for": "198.51.100.1",
    });
    const resBlocked = await GET(reqBlocked);
    expect(resBlocked.status).toBe(429);
    const jsonBlocked = await resBlocked.json();
    expect(jsonBlocked.error).toBe("rate_limited");
  });
});

