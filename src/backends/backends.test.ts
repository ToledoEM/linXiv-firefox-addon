import { test } from "node:test";
import assert from "node:assert/strict";

import { toPreview } from "../extractors/index.ts";
import type { ClipFields } from "../types";
import { textToBase64 } from "./bytes.ts";
import { deepLinkFor, desktopBackend } from "./desktop.ts";
import { headlessBackend } from "./headless.ts";
import { baseOf, originPattern, type Fetcher } from "./http.ts";
import { savePdfTab } from "../pdfTab.ts";
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

const BIBTEX_ROUTE = "POST /api/clip/bibtex";
const PDF_ROUTE = "POST /api/clip/pdf";

test("web: multipart BibTeX with the token, no cookies", async () => {
  const { calls, fetcher } = server({
    [BIBTEX_ROUTE]: () => json({ source_ids: ["doi:10.5555/a/b"], new: ["doi:10.5555/a/b"], existing: [], project_id: 7, failed: [] }),
  });

  const result = await webBackend("http://w/", "tok", fetcher).save([doiClip()]);

  assert.equal(result.status, "saved");
  assert.deepEqual(result.ids, ["doi:10.5555/a/b"]);
  assert.match(result.note ?? "", /Saved\. Attach the PDF in linXiv\. On the list Imported - to check\./);
  assert.equal(calls[0].url, "http://w/api/clip/bibtex");
  assert.equal(calls[0].headers.get("authorization"), "Bearer tok");
  assert.equal(calls[0].credentials, "omit");

  const file = (calls[0].body as FormData).get("file") as File;
  assert.equal(file.name, "clip.bib");
  assert.match(await file.text(), /doi = \{10\.5555\/a\/b\}/);
});

test("web: BibTeX notes for existing and mixed clips", async () => {
  const known = server({ [BIBTEX_ROUTE]: () => json({ source_ids: ["a"], new: [], existing: ["a"], project_id: 7, failed: [] }) });
  assert.match((await webBackend("http://w", "t", known.fetcher).save([doiClip()])).note ?? "", /^Already in your library, unchanged\./);

  const mixed = server({ [BIBTEX_ROUTE]: () => json({ source_ids: ["a", "b"], new: ["a"], existing: ["b"], project_id: 7, failed: [] }) });
  assert.match((await webBackend("http://w", "t", mixed.fetcher).save([doiClip()])).note ?? "", /^1 new, 1 already in your library\./);
});

test("web: failed list joins warn, whatever shape failed has", async () => {
  const named = server({ [BIBTEX_ROUTE]: () => json({ source_ids: ["a"], new: ["a"], existing: [], project_id: null, failed: ["a"] }) });
  assert.match((await webBackend("http://w", "t", named.fetcher).save([doiClip()])).note ?? "", /Saved, but a didn't join the list/);

  const objects = server({ [BIBTEX_ROUTE]: () => json({ source_ids: ["a"], new: ["a"], existing: [], project_id: 7, failed: [{ id: "a" }] }) });
  assert.match((await webBackend("http://w", "t", objects.fetcher).save([doiClip()])).note ?? "", /Saved, but some papers didn't join the list/);
});

test("web: a thin answer still saves", async () => {
  const thin = server({ [BIBTEX_ROUTE]: () => new Response("not json") });
  const result = await webBackend("http://w", "t", thin.fetcher).save([doiClip()]);
  assert.deepEqual(result.ids, []);
  assert.equal(result.status, "saved");
});

test("web: bad token and older servers are explained", async () => {
  const denied = server({ [BIBTEX_ROUTE]: () => json({ detail: "Missing or invalid clip token" }, 401) });
  await assert.rejects(webBackend("http://w", "t", denied.fetcher).save([doiClip()]), /rejected the token/);

  const missing = server({});
  await assert.rejects(webBackend("http://w", "t", missing.fetcher).save([doiClip()]), /no Browser add-on routes/);

  const refused = server({ [BIBTEX_ROUTE]: () => json({ detail: "cross-origin request rejected" }, 403) });
  await assert.rejects(webBackend("http://w", "t", refused.fetcher).save([doiClip()]), /no Browser add-on routes.*cross-origin/);

  const broken = server({ [BIBTEX_ROUTE]: () => json({ detail: "boom" }, 500) });
  await assert.rejects(webBackend("http://w", "t", broken.fetcher).save([doiClip()]), /linXiv-web: boom/);
});

test("web probe uses the token route", async () => {
  const good = server({ "GET /api/clip/ping": () => json({ ok: true, version: "0.1.3", username: "ana" }) });
  const probed = await webBackend("http://w", "t", good.fetcher).probe();
  assert.equal(probed.ok, true);
  assert.equal(probed.version, "0.1.3");
  assert.match(probed.message, /as ana/);
  assert.equal(good.calls[0].headers.get("authorization"), "Bearer t");

  const noName = server({ "GET /api/clip/ping": () => json({ ok: true, version: "0.1.3", username: null }) });
  assert.doesNotMatch((await webBackend("http://w", "t", noName.fetcher).probe()).message, / as /);

  const denied = server({ "GET /api/clip/ping": () => json({ detail: "no" }, 401) });
  assert.match((await webBackend("http://w", "t", denied.fetcher).probe()).message, /rejected the token/);

  for (const answer of [json({ detail: "no" }, 403), json({}, 404), new Response("<html>"), json({ status: "up" })]) {
    const older = server({ "GET /api/clip/ping": () => answer });
    const result = await webBackend("http://w", "t", older.fetcher).probe();
    assert.equal(result.ok, false);
    assert.match(result.message, /no Browser add-on routes/);
  }
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

const PDF_BYTES = new TextEncoder().encode("%PDF-1.4 body");
const SIGNED = "https://pdf.example/x/main.pdf?X-Amz-Expires=300&X-Amz-Security-Token=secret";
const answers = (body: Uint8Array | string, status = 200) =>
  (async () => new Response(body as BodyInit, { status })) as unknown as typeof fetch;

test("PDF tab, headless: bytes go to import, and the signed link doesn't", async () => {
  const { calls, fetcher } = server({ "POST /api/papers/import/pdf": () => json({ source_id: "doi:10.1/x", title: "From the file" }) });

  const outcome = await savePdfTab(headlessBackend("http://h", "t", fetcher), SIGNED, answers(PDF_BYTES));

  assert.deepEqual(outcome, { kind: "saved", id: "doi:10.1/x", title: "From the file" });
  const body = JSON.parse(calls[0].body as string);
  assert.equal(decode(body.file_b64), "%PDF-1.4 body");
  assert.equal(body.filename, "main.pdf");
  assert.equal(String(calls[0].body).includes("secret"), false);
});

test("PDF tab, web: multipart file with a .pdf name", async () => {
  const { calls, fetcher } = server({
    [PDF_ROUTE]: () => json({ source_ids: ["local:a"], new: ["local:a"], existing: [], attached: [], project_id: 7, failed: [] }),
  });

  const outcome = await savePdfTab(webBackend("http://w", "t", fetcher), "https://arxiv.org/pdf/1706.03762", answers(PDF_BYTES));

  // The route gives no title, so the popup falls back to the id.
  assert.deepEqual(outcome, {
    kind: "saved",
    id: "local:a",
    title: undefined,
    note: "Saved with its PDF. On the list Imported - to check.",
  });
  assert.equal(calls[0].url, "http://w/api/clip/pdf");
  const file = (calls[0].body as FormData).get("file") as File;
  assert.equal(file.name, "1706.03762.pdf");
  assert.equal(await file.text(), "%PDF-1.4 body");
});

test("PDF tab, web: existing paper, attached PDF, lost metadata, optional title", async () => {
  async function save(answer: unknown) {
    const { fetcher } = server({ [PDF_ROUTE]: () => json(answer) });
    return savePdfTab(webBackend("http://w", "t", fetcher), "https://x.example/a.pdf", answers(PDF_BYTES));
  }

  const note = (outcome: Awaited<ReturnType<typeof save>>) => (outcome.kind === "saved" ? outcome.note : undefined);

  assert.match(note(await save({ source_ids: ["a"], new: [], existing: ["a"], attached: [], failed: [] })) ?? "", /^Already in your library with a PDF, nothing changed\./);
  assert.match(note(await save({ source_ids: ["a"], new: [], existing: ["a"], attached: ["a"], metadata_kept: true, failed: [] })) ?? "", /^PDF added to the paper already in your library\.$/);
  assert.match(note(await save({ source_ids: ["a"], new: [], existing: ["a"], attached: ["a"], metadata_kept: false, failed: [] })) ?? "", /metadata may have changed/);

  const titled = await save({ source_ids: ["a"], new: ["a"], existing: [], attached: [], title: "T", failed: [] });
  assert.equal(titled.kind === "saved" ? titled.title : undefined, "T");
});

test("PDF tab, desktop: URL handed over, nothing fetched", async () => {
  const opened: string[] = [];
  const noFetch = (async () => {
    throw new Error("should not fetch");
  }) as unknown as typeof fetch;

  const backend = desktopBackend(async (url) => opened.push(url));

  assert.deepEqual(await savePdfTab(backend, "https://x.example/a.pdf", noFetch), { kind: "sent" });
  assert.equal(opened[0], `linxiv-clip://add?input=${encodeURIComponent("https://x.example/a.pdf")}`);
  assert.deepEqual(await savePdfTab(backend, "https://arxiv.org/pdf/1706.03762", noFetch), { kind: "not-pdf" });
});

test("PDF tab: a non-PDF falls back, an expired link says so, a blocked fetch asks", async () => {
  const backend = headlessBackend("http://h", "t", server({}).fetcher);

  assert.deepEqual(await savePdfTab(backend, "https://x.example/a.pdf", answers("<html>")), { kind: "not-pdf" });
  await assert.rejects(savePdfTab(backend, SIGNED, answers("<html>")), /web page, not the file/);
  await assert.rejects(savePdfTab(backend, SIGNED, answers("<html><title> Other page </title>")), /titled "Other page"/);

  // A security check saves nothing, signed link or not.
  const check = /pdf\.example's security check blocked the addon.*attach the PDF in linXiv/;
  await assert.rejects(savePdfTab(backend, SIGNED, answers("<html><title>Security verification</title>")), check);
  await assert.rejects(savePdfTab(backend, "https://pdf.example/a.pdf", answers("<title>Just a moment...</title>")), check);
  await assert.rejects(savePdfTab(backend, SIGNED, answers("gone", 403)), /may have expired/);

  const blocked = (async () => {
    throw new TypeError("NetworkError");
  }) as unknown as typeof fetch;
  assert.deepEqual(await savePdfTab(backend, SIGNED, blocked), { kind: "needs-access" });
});

test("a signed link never reaches a saved record", async () => {
  const preview = toPreview({}, {}, SIGNED, "Paper", true);
  assert.equal(preview.canonicalUrl, "https://pdf.example/x/main.pdf");

  const { calls, fetcher } = server({ "POST /api/papers/import/bibtex": () => json({ source_ids: ["local:a"] }) });
  await headlessBackend("http://h", "t", fetcher).save([preview]);
  const sent = decode(JSON.parse(calls[0].body as string).file_b64);
  assert.equal(sent.includes("secret"), false);
  assert.equal(sent.includes("X-Amz"), false);

  const fromPage = toPreview({ url: SIGNED }, {}, "https://x.example/a", "Paper");
  assert.equal(fromPage.canonicalUrl, "https://pdf.example/x/main.pdf");

  const ordinary = toPreview({}, {}, "https://x.example/a?id=3&b=4#top", "Paper");
  assert.equal(ordinary.canonicalUrl, "https://x.example/a?id=3&b=4");
});

test("addresses", () => {
  assert.equal(baseOf(" http://h:8000// "), "http://h:8000");
  assert.equal(originPattern("http://127.0.0.1:8100/x"), "http://127.0.0.1/*");
  assert.equal(originPattern("https://a.example/"), "https://a.example/*");
});
