import { buildBibtex } from "../bibtex.ts";
import { baseOf, detail, request, type Fetcher } from "./http.ts";
import { BackendError, type Backend, type ProbeResult } from "./types.ts";

export function webBackend(baseUrl: string, token: string, fetcher: Fetcher = fetch): Backend {
  const base = baseOf(baseUrl);

  async function upload(path: string, form: FormData): Promise<Response> {
    const response = await request(fetcher, `${base}${path}`, token, { method: "POST", body: form });

    if (response.status === 401) {
      throw new BackendError("linXiv-web asked for a login. Check the token in Settings.");
    }

    if (response.status === 403) {
      // check_origin rejects moz-extension:// unless the server accepts a token.
      throw new BackendError(`This linXiv-web doesn't accept the addon yet: ${await detail(response)}`);
    }

    if (!response.ok) {
      throw new BackendError(`linXiv-web: ${await detail(response)}`);
    }

    return response;
  }

  return {
    pdfTransport: "bytes",

    probe: async (): Promise<ProbeResult> => {
      try {
        const response = await request(fetcher, `${base}/api/health`, token);
        const body = (await response.json().catch(() => null)) as { ok?: unknown; version?: unknown } | null;

        if (!response.ok || body?.ok !== true) {
          return { ok: false, message: "That address answered, but doesn't look like linXiv-web." };
        }

        const version = typeof body.version === "string" ? body.version : undefined;
        return { ok: true, version, message: `linXiv-web ${version ?? ""} is reachable. A save will show whether it accepts the addon.` };
      } catch (cause) {
        return { ok: false, message: cause instanceof Error ? cause.message : String(cause) };
      }
    },

    save: async (clips) => {
      const form = new FormData();
      form.append("file", new Blob([clips.map(buildBibtex).join("\n")], { type: "application/x-bibtex" }), "clip.bib");

      const response = await upload("/api/import/bibtex", form);
      const imported = (await response.json()) as { source_ids?: string[] };
      return { status: "saved", ids: imported.source_ids ?? [] };
    },

    savePdf: async (pdf) => {
      const form = new FormData();
      form.append("file", new Blob([(pdf.bytes ?? new Uint8Array()).slice()], { type: "application/pdf" }), pdf.filename);

      const response = await upload("/api/pdfs/import", form);
      const imported = (await response.json()) as { source_id?: string; title?: string };
      return { status: "saved", id: imported.source_id, title: imported.title };
    },
  };
}
