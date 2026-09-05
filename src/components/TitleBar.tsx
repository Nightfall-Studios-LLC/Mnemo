import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon } from "./Icons";

function isTauriDesktop() {
  return "__TAURI_INTERNALS__" in window;
}

async function runWindowAction(action: "minimize" | "close") {
  if (!isTauriDesktop()) return;
  try {
    await getCurrentWindow()[action]();
  } catch {
    // Browser previews and restricted webviews keep the chrome visible without crashing.
  }
}

export function TitleBar() {
  return (
    <header className="title-bar" aria-label="Window controls">
      <div
        className="title-bar-drag"
        data-tauri-drag-region
        aria-hidden="true"
      />
      <div className="window-controls">
        <button
          type="button"
          className="window-control minimize"
          aria-label="Minimize window"
          onClick={() => runWindowAction("minimize")}
        >
          <Icon name="window-minimize" size={16} />
        </button>
        <button
          type="button"
          className="window-control close"
          aria-label="Close window"
          onClick={() => runWindowAction("close")}
        >
          <Icon name="window-close" size={16} />
        </button>
      </div>
    </header>
  );
}
