import "@testing-library/jest-dom";

// Polyfill Web API Request/Response for Jest environment when testing Next.js server components/routes
if (typeof global.Request === "undefined") {
  // @ts-expect-error polyfill
  global.Request = class Request {
    url: string;
    headers: Headers;
    method: string;
    constructor(input: string | { url: string }, init?: RequestInit) {
      this.url = typeof input === "string" ? input : input.url;
      this.headers = new Headers(init?.headers);
      this.method = init?.method || "GET";
    }
  };
}

if (typeof global.Response === "undefined") {
  // @ts-expect-error polyfill
  global.Response = class Response {
    body: unknown;
    status: number;
    headers: Headers;
    constructor(body?: unknown, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }
    static json(data: unknown, init?: ResponseInit) {
      const res = new Response(JSON.stringify(data), init);
      res.json = async () => data;
      return res;
    }
    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }
  };
}
