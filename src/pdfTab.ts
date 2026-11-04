import { isPdf, MAX_PDF_BYTES } from "./backends/bytes.ts";
import { BackendError, type Backend } from "./backends/types.ts";
import { isSignedUrl } from "./extractors/normalize.ts";

export type PdfTabOutcome =
  | { kind: "saved"; id?: string; title?: string; note?: string }
  | { kind: "sent" }
  /** Not a PDF after all: save it like any other page. */
  | { kind: "not-pdf" }
  /** Firefox blocked the fetch. Needs a click to request access to the host. */
  | { kind: "needs-access" };

export function pdfFileName(rawUrl: string): string {
  const last = new URL(rawUrl).pathname.split("/").pop() ?? "";
  const name = decodeURIComponent(last).replace(/[^\w.-]+/g, "_").slice(0, 100) || "paper";
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

const SECURITY_CHECK = /security (verification|check)|just a moment|attention required|verify you are human|captcha/i;

function pageTitle(bytes: Uint8Array): string | undefined {
  return /<title[^>]*>([^<]{1,80})/i.exec(new TextDecoder().decode(bytes.subarray(0, 8192)))?.[1].trim();
}

/** Type, final host and page title. The URL's query is left out: it can hold credentials. */
function describeAnswer(response: Response, bytes: Uint8Array): string {
  const type = response.headers.get("content-type")?.split(";")[0] ?? "no content type";
  const host = response.url ? ` from ${new URL(response.url).hostname}` : "";
  const title = pageTitle(bytes);
  return `${type}${host}${title ? `, titled "${title}"` : ""}`;
}

function hasPdfPath(rawUrl: string): boolean {
  return new URL(rawUrl).pathname.toLowerCase().endsWith(".pdf");
}

/**
 * Hands the PDF open in a tab to the backend, which reads title, authors and DOI
 * from the file and checks them itself. The addon looks nothing up here.
 */
export async function savePdfTab(backend: Backend, url: string, fetcher: typeof fetch = fetch): Promise<PdfTabOutcome> {
  const filename = pdfFileName(url);

  if (backend.pdfTransport === "url") {
    // The desktop app only treats URLs ending in .pdf as files to import.
    if (!hasPdfPath(url)) {
      return { kind: "not-pdf" };
    }

    const saved = await backend.savePdf({ url, filename });
    return saved.status === "sent" ? { kind: "sent" } : { kind: "saved", id: saved.id, title: saved.title };
  }

  let response: Response;

  try {
    response = await fetcher(url, { credentials: "include" });
  } catch {
    return { kind: "needs-access" };
  }

  if (!response.ok) {
    throw new BackendError(
      `The PDF link answered HTTP ${response.status}. It may have expired, or need a login. Reload the PDF tab and try again.`
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (!isPdf(bytes)) {
    if (SECURITY_CHECK.test(pageTitle(bytes) ?? "")) {
      throw new BackendError(
        `${new URL(url).hostname}'s security check blocked the addon from reading this PDF. Save from the article page, then attach the PDF in linXiv.`
      );
    }

    // A signed link only ever points at a file, so a web page here isn't a page to save.
    if (isSignedUrl(url)) {
      throw new BackendError(
        `The PDF link answered with a web page, not the file (${describeAnswer(response, bytes)}). It may have expired. Reload the PDF tab and try again.`
      );
    }

    return { kind: "not-pdf" };
  }

  if (bytes.length > MAX_PDF_BYTES) {
    throw new BackendError("That PDF is over the 100 MB limit.");
  }

  const saved = await backend.savePdf({ url, filename, bytes });
  return { kind: "saved", id: saved.id, title: saved.title, ...(saved.note ? { note: saved.note } : {}) };
}
