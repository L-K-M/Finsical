import { mountImportPanel } from "./import.js";
import { previewOf } from "./render.js";
import { openBus } from "./bus.js";

// Panel window: hosts the add-on browser full-size. Installs are relayed
// to the tank page (which owns the sim); state and acks come back over
// the bus. Opened by Tank > Import Add-ons… in the app; in a browser it
// talks to an index.html tab over BroadcastChannel.
let greeted = false;
const bus = openBus((m) => {
  if (m.op === "state") greeted = true;
  panel.notify(m);
});
const panel = mountImportPanel({
  // Remote mode never touches the sim locally — the tank page applies
  // installs and posts the result back.
  onSheets: () => {},
  onImages: () => {},
  preview: previewOf,
}, { host: document.getElementById("panel")!, remote: bus });

panel.open();
// The tank page may still be loading when the panel opens — retry the
// hello until a state push arrives (it also posts on every save).
let tries = 0;
const greet = setInterval(() => {
  if (greeted || ++tries > 60) clearInterval(greet); // give up after 30s
  else bus.post({ op: "hello" });
}, 500);
bus.post({ op: "hello" });
// Slow heartbeat after first contact: re-syncs the panel if the tank
// page reloads mid-session (state replies only touch install badges).
setInterval(() => { if (greeted) bus.post({ op: "hello" }); }, 10_000);
