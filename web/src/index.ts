import index from "./index.html";

const apiProxy = process.env.API_PROXY ?? "http://localhost:8080";
const port = Number(process.env.WEB_PORT ?? 5173);

const server = Bun.serve({
  port,
  routes: {
    "/api/*": async (request) => {
      const url = new URL(request.url);
      const target = new URL(url.pathname + url.search, apiProxy);
      const headers = new Headers(request.headers);
      headers.set("host", new URL(apiProxy).host);

      const init: RequestInit = {
        method: request.method,
        headers,
        redirect: "manual",
      };
      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = await request.arrayBuffer();
      }

      try {
        const response = await fetch(target, init);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (error) {
        console.error("API proxy error:", error);
        return Response.json(
          {
            error: {
              code: "proxy_error",
              message: "The Go API is not reachable. Is it running?",
            },
          },
          { status: 502 },
        );
      }
    },
    "/*": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Frontend dev server running at ${server.url}`);
