import { GET } from "@/app/api/lookup/route";

const originalEnv = process.env;

function createMockRequest(url: string): Request {
  return { url } as unknown as Request;
}

describe("GET /api/lookup", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, HIBP_API_KEY: "test-api-key" };
    // @ts-expect-error mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("returns 400 if email is missing or invalid", async () => {
    const req = createMockRequest("http://localhost:3000/api/lookup");
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("invalid_email");

    const reqInvalid = createMockRequest("http://localhost:3000/api/lookup?email=not-an-email");
    const resInvalid = await GET(reqInvalid);
    expect(resInvalid.status).toBe(400);
  });

  it("returns 500 if HIBP_API_KEY is not configured", async () => {
    delete process.env.HIBP_API_KEY;
    const req = createMockRequest("http://localhost:3000/api/lookup?email=test@example.com");
    const res = await GET(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe("api_key_missing");
  });

  it("returns 200 with breach count and hints when breaches are found (200 OK from HIBP)", async () => {
    const mockBreaches = [
      { Name: "LinkedIn", Domain: "linkedin.com", DataClasses: ["Email addresses", "Passwords"] },
      { Name: "Adobe", Domain: "adobe.com", DataClasses: ["Email addresses", "Password hints"] },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockBreaches,
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=TEST@example.com ");
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
      "https://haveibeenpwned.com/api/v3/breachedaccount/test%40example.com?truncateResponse=false",
      expect.objectContaining({
        headers: {
          "hibp-api-key": "test-api-key",
          "user-agent": "EmailFootprint-App/1.0",
        },
      })
    );
  });

  it("returns 200 with 0 breach count when no breach is found (404 from HIBP)", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=clean@example.com");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.summary.breach_count).toBe(0);
    expect(json.summary.possible_accounts).toBe(0);
    expect(json.hints).toEqual([]);
  });

  it("returns 429 when rate limited by HIBP", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "120" }),
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=ratelimited@example.com");
    const res = await GET(req);
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toBe("rate_limited");
    expect(json.retry_after).toBe(120);
  });

  it("returns 500 when HIBP rejects key (401 Unauthorized)", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=test@example.com");
    const res = await GET(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe("auth_error");
  });

  it("counts duplicate breaches from the same service/domain as one possible account", async () => {
    const mockBreaches = [
      { Name: "Adobe", Domain: "adobe.com", DataClasses: ["Email addresses", "Passwords"] },
      { Name: "Adobe2", Domain: "adobe.com", DataClasses: ["Email addresses"] },
      { Name: "SomeForum", Domain: "", DataClasses: ["Usernames"] },
      { Name: "SomeForum", Domain: "", DataClasses: ["Email addresses"] },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockBreaches,
    });

    const req = createMockRequest("http://localhost:3000/api/lookup?email=user@example.com");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.summary.breach_count).toBe(4);
    expect(json.summary.possible_accounts).toBe(2); // 1 for adobe.com, 1 for SomeForum
  });
});
