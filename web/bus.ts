// Page-to-page message bus. Inside the app the Swift shell relays each
// message to the sibling WKWebView (tank <-> panel window); in a plain
// browser BroadcastChannel bridges same-origin tabs for development.
export type BusMsg = Record<string, unknown>;
export interface Bus { post(m: BusMsg): void }

type WkHandlers = { finsical?: { postMessage(m: unknown): void } };
declare global {
  interface Window { __bus?: (m: BusMsg) => void }
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
