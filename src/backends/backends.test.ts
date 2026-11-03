import { test } from "node:test";
import assert from "node:assert/strict";

import { toPreview } from "../extractors/index.ts";
import type { ClipFields } from "../types";
import { textToBase64 } from "./bytes.ts";
import { deepLinkFor, desktopBackend } from "./desktop.ts";
import { headlessBackend } from "./headless.ts";
import { baseOf, originPattern, type Fetcher } from "./http.ts";
import { BackendError } from "./types.ts";
import { webBackend } from "./web.ts";

const clip = (fields: ClipFields, url = "https://x.example/a") => toPreview(fields, {}, url, undefined);
const doiClip = () => clip({ type: "article", doi: "10.5555/a/b", title: "T", authors: ["A B"] });
interface Call {
  method: string;
  url: string;
  headers: Headers;
  body: unknown;
  credentials?: string;
}

function server(routes: Record<string, (call: Call) => Response>) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    const call: Call = {
      method: init.method ?? "GET",
      url,
      headers: new Headers(init.headers),
      body: init.body,
      credentials: init.credentials,
    };
    calls.push(call);
    const route = routes[`${call.method} ${new URL(url).pathname}`];
    return route ? route(call) : new Response("{}", { status: 404 });
  }) as unknown as Fetcher;
  return { calls, fetcher };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const decode = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

test("headless: saves metadata and nothing else", async () => {
  const { calls, fetcher } = server({
    "POST /api/papers/import/bibtex": () => json({ saved_count: 1, source_ids: ["doi:10.5555/a/b"] }),
  });

  const result = await headlessBackend("http://h:8000/", "tok", fetcher).save([doiClip()]);

  assert.deepEqual(result, { status: "saved", ids: ["doi:10.5555/a/b"] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.get("authorization"), "Bearer tok");
  assert.equal(calls[0].credentials, "omit");
  assert.equal(calls[0].url, "http://h:8000/api/papers/import/bibtex");
  assert.match(decode(JSON.parse(calls[0].body as string).file_b64), /doi = \{10\.5555\/a\/b\}/);
});

test("a PDF tab saves metadata too, with nothing fetched", async () => {
  const { calls, fetcher } = server({ "POST /api/papers/import/bibtex": () => json({ source_ids: ["local:abc"] }) });
  const pdfTab = toPreview({ pdfUrl: "https://x.example/t.pdf" }, {}, "https://x.example/t.pdf", "t.pdf", true);

  assert.deepEqual(await headlessBackend("http://h", "t", fetcher).save([pdfTab]), { status: "saved", ids: ["local:abc"] });
  assert.deepEqual(calls.map((call) => new URL(call.url).pathname), ["/api/papers/import/bibtex"]);
  assert.match(deepLinkFor([pdfTab]), /^linxiv-clip:\/\/add\?bibtex=/);
});

test("headless: several items in one request", async () => {
  const { calls, fetcher } = server({ "POST /api/papers/import/bibtex": () => json({ source_ids: ["a", "b"] }) });
  const result = await headlessBackend("http://h", "t", fetcher).save([doiClip(), clip({ title: "Other" })]);

  assert.deepEqual(result, { status: "saved", ids: ["a", "b"] });
  assert.equal(calls.length, 1);
});

test("headless: errors say what to do", async () => {
  const rejected = server({ "POST /api/papers/import/bibtex": () => json({ detail: "no" }, 401) });
  await assert.rejects(headlessBackend("http://h", "bad", rejected.fetcher).save([doiClip()]), /rejected the token/);

  const failing = server({ "POST /api/papers/import/bibtex": () => json({ detail: "Invalid base64" }, 400) });
  await assert.rejects(headlessBackend("http://h", "t", failing.fetcher).save([doiClip()]), /Invalid base64/);

  const down = (async () => {
    throw new TypeError("NetworkError");
  }) as unknown as Fetcher;
  await assert.rejects(headlessBackend("http://h:1", "t", down).save([doiClip()]), (error: Error) => {
    assert.ok(error instanceof BackendError);
    return /Can't reach http:\/\/h:1/.test(error.message);
  });
});

test("headless probe recognizes the server, and other servers", async () => {
  const good = server({ "GET /api/status": () => json({ version: "0.7.1", node_bound: true }) });
  const probe = await headlessBackend("http://h", "t", good.fetcher).probe();
  assert.equal(probe.ok, true);
  assert.equal(probe.version, "0.7.1");

  const other = server({ "GET /api/status": () => json({ status: "ok" }) });
  assert.equal((await headlessBackend("http://h", "t", other.fetcher).probe()).ok, false);

  const html = server({ "GET /api/status": () => new Response("<html>") });
  assert.equal((await headlessBackend("http://h", "t", html.fetcher).probe()).ok, false);

  const denied = server({ "GET /api/status": () => json({}, 401) });
  assert.match((await headlessBackend("http://h", "t", denied.fetcher).probe()).message, /rejected the token/);
});

test("web: multipart BibTeX with the token", async () => {
  const { calls, fetcher } = server({ "POST /api/import/bibtex": () => json({ source_ids: ["doi:10.5555/a/b"] }) });

  const result = await webBackend("http://w/", "tok", fetcher).save([doiClip()]);

  assert.deepEqual(result, { status: "saved", ids: ["doi:10.5555/a/b"] });
  assert.equal(calls[0].headers.get("authorization"), "Bearer tok");

  const file = (calls[0].body as FormData).get("file") as File;
  assert.equal(file.name, "clip.bib");
  assert.match(await file.text(), /doi = \{10\.5555\/a\/b\}/);
});

test("web: today's origin rejection is explained", async () => {
  const { fetcher } = server({ "POST /api/import/bibtex": () => json({ detail: "cross-origin request rejected" }, 403) });
  await assert.rejects(webBackend("http://w", "t", fetcher).save([doiClip()]), /doesn't accept the addon yet: cross-origin/);
});

test("web probe", async () => {
  const good = server({ "GET /api/health": () => json({ ok: true, version: "0.1.3" }) });
  assert.equal((await webBackend("http://w", "", good.fetcher).probe()).version, "0.1.3");

  const other = server({ "GET /api/health": () => json({ status: "up" }) });
  assert.equal((await webBackend("http://w", "", other.fetcher).probe()).ok, false);
});

test("desktop: one bibtex link", async () => {
  const opened: string[] = [];
  const result = await desktopBackend(async (url) => opened.push(url)).save([doiClip()]);

  assert.deepEqual(result, { status: "sent", ids: [] });
  assert.match(opened[0], /^linxiv-clip:\/\/add\?bibtex=/);
});

test("base64 keeps non-ASCII text", () => {
  assert.equal(decode(textToBase64("Schrödinger")), "Schrödinger");
  assert.equal(decode(textToBase64("x".repeat(200_000))).length, 200_000);
});

test("addresses", () => {
  assert.equal(baseOf(" http://h:8000// "), "http://h:8000");
  assert.equal(originPattern("http://127.0.0.1:8100/x"), "http://127.0.0.1/*");
  assert.equal(originPattern("https://a.example/"), "https://a.example/*");
});
