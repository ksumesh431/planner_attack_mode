import { afterEach, describe, expect, test } from "bun:test";

import { ApiError, api } from "./client";

const originalFetch = globalThis.fetch;

function installWindow(): string[] {
  const events: string[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent(event: Event) {
        events.push(event.type);
        return true;
      },
    },
  });
  return events;
}

function stubUnauthorizedResponse() {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: { code: "unauthorized", message: "Please log in." },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete (globalThis as { window?: unknown }).window;
});

describe("API client", () => {
  test("does not broadcast session expiry for the session probe", async () => {
    const events = installWindow();
    stubUnauthorizedResponse();

    await expect(api.get("/api/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(events).toEqual([]);
  });

  test("does not broadcast session expiry for a failed login", async () => {
    const events = installWindow();
    stubUnauthorizedResponse();

    await expect(api.post("/api/auth/login", { password: "wrong" })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(events).toEqual([]);
  });

  test("broadcasts session expiry for protected requests", async () => {
    const events = installWindow();
    stubUnauthorizedResponse();

    await expect(api.get("/api/tasks?date=2026-10-23")).rejects.toBeInstanceOf(ApiError);
    expect(events).toEqual(["auth:expired"]);
  });
});
