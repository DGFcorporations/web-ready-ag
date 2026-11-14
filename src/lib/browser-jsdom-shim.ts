/**
 * Browser-safe shim for `jsdom` used exclusively by Vite client builds.
 * Prevents bundling 5+ MB of Node-only `jsdom`/`parse5`/CSSOM code into the SPA.
 */
export class JSDOM {
  public window: { document: Document };

  constructor(html: string = "") {
    if (typeof globalThis.DOMParser === "undefined") {
      throw new Error("DOMParser is unavailable in this environment.");
    }
    const document = new globalThis.DOMParser().parseFromString(html, "text/html");
    this.window = { document };
  }
}

export default { JSDOM };
