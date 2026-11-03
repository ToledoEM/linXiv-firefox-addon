import { buildBibtex } from "../bibtex.ts";
import type { ClipPreview } from "../types";
import type { Backend } from "./types.ts";

export function deepLinkFor(clips: ClipPreview[]): string {
  return `linxiv-clip://add?bibtex=${encodeURIComponent(clips.map(buildBibtex).join("\n"))}`;
}

/** No listener on the desktop app, only a deep link that returns nothing. */
export function desktopBackend(open: (url: string) => Promise<unknown>): Backend {
  return {
    probe: async () => ({
      ok: true,
      message: "The desktop app can't be checked from here. Saving opens it through a linxiv-clip:// link.",
    }),
    save: async (clips) => {
      await open(deepLinkFor(clips));
      return { status: "sent", ids: [] };
    },
  };
}
