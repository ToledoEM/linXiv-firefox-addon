import type { ClipPreview } from "../types";

export type BackendKind = "desktop" | "headless" | "web";

export interface Settings {
  kind: BackendKind;
  /** Server address, for headless and linXiv-web. */
  baseUrl: string;
  token: string;
}

export interface ProbeResult {
  ok: boolean;
  message: string;
  version?: string;
}

export interface SaveResult {
  /** "sent" means handed off with no way to know the outcome. */
  status: "sent" | "saved";
  ids: string[];
}

/** Saves metadata only. The user attaches PDFs by hand in linXiv. */
export interface Backend {
  probe(): Promise<ProbeResult>;
  save(clips: ClipPreview[]): Promise<SaveResult>;
}

/** A failure worth showing to the user as written. */
export class BackendError extends Error {}
