import { assertEquals } from "https://deno.land/std@0.177.1/testing/asserts.ts";

Deno.test("Test index.html is served", async () => {
  const response = await fetch("https://wikivenn-worker.raymondclowe.workers.dev");
  assertEquals(response.status, 200);
  const contentType = response.headers.get("content-type");
  assertEquals(contentType, "text/html; charset=utf-8");
});
