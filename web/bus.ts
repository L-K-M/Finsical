// Page-to-page message bus. Inside the app the Swift shell relays each
// message to the sibling WKWebView (tank <-> panel window); in a plain
// browser BroadcastChannel bridges same-origin tabs for development.
export type BusMsg = Record<string, unknown>;
export interface Bus { post(m: BusMsg): void }

type WkHandlers = { finsical?: { postMessage(m: unknown): void } };
declare global {
  interface Window { __bus?: (m: BusMsg) => void }
}

/** Fish-thumbnail key shared by the tank (serveThumbs) and the panel
 * (renderOverview) — single definition so producers and consumers
 * can't drift. Pack-scoped: a mid-session rebind changes the key, so
 * stale art is evicted and re-requested instead of lingering. */
export function fishThumbKey(f: { id: number; species: string;
                                  pack?: string }): string {
  return `f:${f.id}:${f.pack ?? f.species}`;
}

/// True when the page runs inside the native WKWebView shell.
export function inNativeShell(): boolean {
  return !!(window as { webkit?: { messageHandlers?: WkHandlers } })
    .webkit?.messageHandlers?.finsical;
}

export function openBus(onMsg: (m: BusMsg) => void): Bus {
  const wk = (window as { webkit?: { messageHandlers?: WkHandlers } })
    .webkit?.messageHandlers?.finsical;
  if (wk) {
    // The native relay delivers the other page's post as __bus(json).
    window.__bus = onMsg;
    return { post: (m) => wk.postMessage(m) };
  }
  const bc = new BroadcastChannel("finsical");
  bc.onmessage = (e) => onMsg(e.data as BusMsg);
  return { post: (m) => bc.postMessage(m) };
}
