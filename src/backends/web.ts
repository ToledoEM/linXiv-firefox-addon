import { buildBibtex } from "../bibtex.ts";
import { baseOf, detail, request, type Fetcher } from "./http.ts";
import { BackendError, type Backend, type ProbeResult } from "./types.ts";

const NO_ROUTES = "This linXiv-web has no Browser add-on routes. It needs a newer version.";
const LIST_NAME = "Imported - to check";

interface ClipAnswer {
  source_ids?: unknown;
  new?: unknown;
  existing?: unknown;
  attached?: unknown;
  failed?: unknown;
  project_id?: unknown;
  metadata_kept?: unknown;
  title?: unknown;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** `failed` is read loosely: any non-empty value means some papers missed the list. */
function listNote(answer: ClipAnswer): string {
  const failed = answer.failed;
  const anyFailed = Array.isArray(failed) ? failed.length > 0 : Boolean(failed);

  if (anyFailed) {
    const names = strings(failed);
    return `Saved, but ${names.length > 0 ? names.join(", ") : "some papers"} didn't join the list ${LIST_NAME}.`;
  }

  return answer.project_id === null || answer.project_id === undefined ? "" : `On the list ${LIST_NAME}.`;
}

function join(...parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

function bibtexNote(answer: ClipAnswer): string {
  const fresh = strings(answer.new).length;
  const known = strings(answer.existing).length;

  if (known === 0) {
    return join("Saved. Attach the PDF in linXiv.", listNote(answer));
  }

  if (fresh === 0) {
    return join("Already in your library, unchanged.", listNote(answer));
  }

  return join(`${fresh} new, ${known} already in your library. Attach PDFs in linXiv.`, listNote(answer));
}

function pdfNote(answer: ClipAnswer): string {
  if (strings(answer.attached).length > 0) {
    const kept = answer.metadata_kept === false ? "Its metadata may have changed, so check it." : "";
    return join("PDF added to the paper already in your library.", kept, listNote(answer));
  }

  if (strings(answer.existing).length > 0) {
    return join("Already in your library with a PDF, nothing changed.", listNote(answer));
  }

  return join("Saved with its PDF.", listNote(answer));
}

export function webBackend(baseUrl: string, token: string, fetcher: Fetcher = fetch): Backend {
  const base = baseOf(baseUrl);

  async function upload(path: string, form: FormData): Promise<ClipAnswer> {
    const response = await request(fetcher, `${base}${path}`, token, { method: "POST", body: form });

    if (response.status === 401) {
      throw new BackendError("linXiv-web rejected the token. Check it in Settings.");
    }

    if (response.status === 404) {
      throw new BackendError(NO_ROUTES);
    }

    if (response.status === 403) {
      throw new BackendError(`${NO_ROUTES} (${await detail(response)})`);
    }

    if (!response.ok) {
      throw new BackendError(`linXiv-web: ${await detail(response)}`);
    }

    return (await response.json().catch(() => ({}))) as ClipAnswer;
  }

  return {
    pdfTransport: "bytes",

    probe: async (): Promise<ProbeResult> => {
      try {
        const response = await request(fetcher, `${base}/api/clip/ping`, token);

        if (response.status === 401) {
          return { ok: false, message: "linXiv-web rejected the token." };
        }

        const body = (await response.json().catch(() => null)) as { ok?: unknown; version?: unknown; username?: unknown } | null;

        if (!response.ok || body?.ok !== true) {
          return { ok: false, message: NO_ROUTES };
        }

        const version = typeof body.version === "string" ? body.version : undefined;
        const who = typeof body.username === "string" ? ` as ${body.username}` : "";
        return { ok: true, version, message: `linXiv-web ${version ?? ""} accepts the addon${who}.` };
      } catch (cause) {
        return { ok: false, message: cause instanceof Error ? cause.message : String(cause) };
      }
    },

    save: async (clips) => {
      const form = new FormData();
      form.append("file", new Blob([clips.map(buildBibtex).join("\n")], { type: "application/x-bibtex" }), "clip.bib");

      const answer = await upload("/api/clip/bibtex", form);
      return { status: "saved", ids: strings(answer.source_ids), note: bibtexNote(answer) };
    },

    savePdf: async (pdf) => {
      const form = new FormData();
      form.append("file", new Blob([(pdf.bytes ?? new Uint8Array()).slice()], { type: "application/pdf" }), pdf.filename);

      const answer = await upload("/api/clip/pdf", form);
      return {
        status: "saved",
        id: strings(answer.source_ids)[0],
        title: typeof answer.title === "string" ? answer.title : undefined,
        note: pdfNote(answer),
      };
    },
  };
}
